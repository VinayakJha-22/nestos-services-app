
import { createHash, createHmac, randomInt, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";
const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

function hashOtp(challengeId: string, otp: string) {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP_HASH_SECRET is not configured.");
  }

  return createHmac("sha256", secret)
    .update(`${challengeId}:${otp}`)
    .digest("hex");
}

export async function POST(request: Request) {
  let phone: string;

  try {
    const body = await request.json();
    const input = String(body?.phone ?? "").replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(input)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    phone = `91${input}`;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request." },
      { status: 400 }
    );
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  const integratedNumber = process.env.MSG91_WHATSAPP_NUMBER;

  if (!authKey || !integratedNumber || !process.env.OTP_HASH_SECRET) {
    console.error("OTP service environment variables are missing.");

    return NextResponse.json(
      { success: false, message: "OTP service is not configured." },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json(
      { success: false, message: "Please sign in again." },
      { status: 401 }
    );
  }

  const tokenHash = createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  const client = await db.connect();

  let challengeId: string | null = null;
  let otp = "";

  try {
    await client.query("BEGIN");

    const sessionResult = await client.query(
      `SELECT c.id, c.verified_phone
       FROM customer_sessions s
       JOIN customers c ON c.id = s.customer_id
       WHERE s.token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()
         AND c.account_status = 'active'
       LIMIT 1
       FOR UPDATE OF c`,
      [tokenHash]
    );

    const customer = sessionResult.rows[0];

    if (!customer) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    // Serialize OTP requests for this customer and phone number.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`change_phone:${customer.id}:${phone}`]
    );

    const currentPhone = String(customer.verified_phone).replace(/\D/g, "");

    if (currentPhone.slice(-10) === phone.slice(-10)) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "This is already your verified phone number." },
        { status: 400 }
      );
    }

    // Do not allow a phone number already registered to another customer.
    const duplicateResult = await client.query(
      `SELECT id
       FROM customers
       WHERE RIGHT(REGEXP_REPLACE(verified_phone, '\\D', '', 'g'), 10) = $1
         AND id <> $2
       LIMIT 1`,
      [phone.slice(-10), customer.id]
    );

    if (duplicateResult.rowCount) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "This phone number is already registered." },
        { status: 409 }
      );
    }

    // Enforce a 60-second cooldown for this customer.
    const recentChallenge = await client.query(
      `SELECT id
       FROM phone_verification_challenges
       WHERE customer_id = $1
         AND purpose = 'change_phone'
         AND created_at > NOW() - INTERVAL '60 seconds'
       ORDER BY created_at DESC
       LIMIT 1`,
      [customer.id]
    );

    if (recentChallenge.rowCount) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "Please wait before requesting another OTP.",
          cooldownSeconds: RESEND_COOLDOWN_SECONDS,
        },
        { status: 429 }
      );
    }

    challengeId = randomUUID();
    otp = String(randomInt(100000, 1000000));

    const otpHash = hashOtp(challengeId, otp);

    await client.query(
      `INSERT INTO phone_verification_challenges (
        id,
        customer_id,
        phone_number,
        purpose,
        otp_hash,
        attempts,
        max_attempts,
        expires_at,
        consumed_at,
        created_at
      )
      VALUES (
        $1, $2, $3, 'change_phone', $4, 0, $5,
        NOW() + INTERVAL '5 minutes', NULL, NOW()
      )`,
      [challengeId, customer.id, phone, otpHash, MAX_OTP_ATTEMPTS]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Phone-change OTP challenge creation failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to start phone verification." },
      { status: 500 }
    );
  } finally {
    client.release();
  }

  // Send the OTP through the existing MSG91 WhatsApp template.
  try {
    const response = await fetch(
      "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          authkey: authKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          integrated_number: integratedNumber,
          content_type: "template",
          payload: {
            messaging_product: "whatsapp",
            type: "template",
            template: {
              name: "nestos_booking_otp",
              language: {
                code: "en",
                policy: "deterministic",
              },
              namespace: "b9258202_c8a4_44bf_8c17_34057c62171f",
              to_and_components: [
                {
                  to: [phone],
                  components: {
                    body_1: {
                      type: "text",
                      value: otp,
                    },
                    button_1: {
                      subtype: "url",
                      type: "text",
                      value: otp,
                    },
                  },
                },
              ],
            },
          },
        }),
      }
    );

    const providerResult = await response.json().catch(() => null);

    if (
      !response.ok ||
      providerResult?.hasError === true ||
      providerResult?.status === "error"
    ) {
      throw new Error("MSG91 rejected the OTP request.");
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully. Please check your WhatsApp.",
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });
  } catch (error) {
    console.error("MSG91 phone-change OTP request failed:", error);

    await db.query(
      `UPDATE phone_verification_challenges
       SET consumed_at = NOW()
       WHERE id = $1`,
      [challengeId]
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to send OTP. Please try again later.",
      },
      { status: 502 }
    );
  }
}
