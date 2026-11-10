
import { NextResponse } from "next/server";
import { createHmac, randomInt, randomUUID } from "crypto";
import { db } from "@/lib/db";

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

    const tenDigitPhone = input.startsWith("91") && input.length === 12
      ? input.slice(2)
      : input;

    if (!/^[6-9]\d{9}$/.test(tenDigitPhone)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid mobile number." },
        { status: 400 },
      );
    }

    phone = `91${tenDigitPhone}`;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request." },
      { status: 400 },
    );
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  const integratedNumber = process.env.MSG91_WHATSAPP_NUMBER;

  if (!authKey || !integratedNumber || !process.env.OTP_HASH_SECRET) {
    console.error("Operations OTP environment variables are missing.");

    return NextResponse.json(
      { success: false, message: "OTP service is not configured." },
      { status: 500 },
    );
  }

  const client = await db.connect();
  let challengeId: string | null = null;
  let otp = "";

  try {
    await client.query("BEGIN");

    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`operations:${phone}`],
    );

    const userResult = await client.query(
      `SELECT id
       FROM operations_users
       WHERE phone_number = $1
         AND account_status = 'active'
       LIMIT 1
       FOR UPDATE`,
      [phone],
    );

    const operationsUser = userResult.rows[0];

    // Do not reveal whether a phone number belongs to an operations user.
    if (!operationsUser) {
      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "If this number is authorised, you will receive an OTP shortly.",
      });
    }

    const recentChallenge = await client.query(
      `SELECT id
       FROM operations_otp_challenges
       WHERE operations_user_id = $1
         AND created_at > NOW() - INTERVAL '60 seconds'
       ORDER BY created_at DESC
       LIMIT 1`,
      [operationsUser.id],
    );

    if (recentChallenge.rowCount) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "Please wait before requesting another OTP.",
          cooldownSeconds: RESEND_COOLDOWN_SECONDS,
        },
        { status: 429 },
      );
    }

    challengeId = randomUUID();
    otp = String(randomInt(100000, 1000000));

    const otpHash = hashOtp(challengeId, otp);

    await client.query(
      `INSERT INTO operations_otp_challenges (
        id,
        operations_user_id,
        phone_number,
        otp_hash,
        attempts,
        max_attempts,
        expires_at,
        consumed_at,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, 0, $5,
        NOW() + INTERVAL '5 minutes',
        NULL,
        NOW()
      )`,
      [
        challengeId,
        operationsUser.id,
        phone,
        otpHash,
        MAX_OTP_ATTEMPTS,
      ],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Operations OTP challenge creation failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to start verification." },
      { status: 500 },
    );
  } finally {
    client.release();
  }

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
      },
    );

    const providerResult = await response.json().catch(() => null);

    if (
      !response.ok ||
      providerResult?.hasError === true ||
      providerResult?.status === "error"
    ) {
      throw new Error("MSG91 rejected the operations OTP request.");
    }

    return NextResponse.json({
      success: true,
      message: "If this number is authorised, you will receive an OTP shortly.",
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    console.error("Operations MSG91 OTP request failed:", error);

    await db.query(
      `UPDATE operations_otp_challenges
       SET consumed_at = NOW()
       WHERE id = $1`,
      [challengeId],
    );

    return NextResponse.json(
      { success: false, message: "Unable to send OTP. Please try again later." },
      { status: 502 },
    );
  }
}
