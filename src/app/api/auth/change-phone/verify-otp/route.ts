
import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";
const PROOF_COOKIE_NAME = "nestos_phone_change_verified";
const PROOF_VALIDITY_MINUTES = 10;

function hashOtp(challengeId: string, otp: string) {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP_HASH_SECRET is not configured.");
  }

  return createHmac("sha256", secret)
    .update(`${challengeId}:${otp}`)
    .digest("hex");
}

function createVerificationProof(payload: {
  challengeId: string;
  customerId: string;
  phone: string;
  expiresAt: number;
}) {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP_HASH_SECRET is not configured.");
  }

  const encodedPayload = Buffer.from(
    JSON.stringify(payload)
  ).toString("base64url");

  const signature = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export async function POST(request: Request) {
  let phone: string;
  let otp: string;

  try {
    const body = await request.json();

    const phoneInput = String(body?.phone ?? "").replace(/\D/g, "");
    otp = String(body?.otp ?? "").trim();

    if (!/^[6-9]\d{9}$/.test(phoneInput)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid six-digit OTP." },
        { status: 400 }
      );
    }

    phone = `91${phoneInput}`;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request." },
      { status: 400 }
    );
  }

  if (!process.env.OTP_HASH_SECRET) {
    return NextResponse.json(
      { success: false, message: "OTP verification is not configured." },
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

  let verificationProof: string | null = null;

  try {
    await client.query("BEGIN");

    const sessionResult = await client.query(
      `SELECT c.id
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

    // Serialize verification attempts for this customer and phone.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`change_phone:${customer.id}:${phone}`]
    );

    const challengeResult = await client.query(
      `SELECT
         id,
         otp_hash,
         attempts,
         max_attempts,
         expires_at
       FROM phone_verification_challenges
       WHERE customer_id = $1
         AND phone_number = $2
         AND purpose = 'change_phone'
         AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [customer.id, phone]
    );

    const challenge = challengeResult.rows[0];

    if (!challenge) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "OTP is invalid or expired. Please request a new OTP.",
        },
        { status: 400 }
      );
    }

    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await client.query(
        `UPDATE phone_verification_challenges
         SET consumed_at = NOW()
         WHERE id = $1`,
        [challenge.id]
      );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          success: false,
          message: "OTP has expired. Please request a new OTP.",
        },
        { status: 400 }
      );
    }

    if (challenge.attempts >= challenge.max_attempts) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "Maximum OTP attempts reached. Request a new OTP.",
        },
        { status: 429 }
      );
    }

    const expectedHash = hashOtp(challenge.id, otp);
    const storedHash = Buffer.from(challenge.otp_hash, "hex");
    const submittedHash = Buffer.from(expectedHash, "hex");

    const isValid =
      storedHash.length === submittedHash.length &&
      timingSafeEqual(storedHash, submittedHash);

    if (!isValid) {
      const nextAttempts = challenge.attempts + 1;

      await client.query(
        `UPDATE phone_verification_challenges
         SET attempts = $2,
             consumed_at = CASE
               WHEN $2 >= max_attempts THEN NOW()
               ELSE consumed_at
             END
         WHERE id = $1`,
        [challenge.id, nextAttempts]
      );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          success: false,
          message:
            nextAttempts >= challenge.max_attempts
              ? "Maximum OTP attempts reached. Request a new OTP."
              : "Incorrect OTP.",
          attemptsRemaining: Math.max(
            challenge.max_attempts - nextAttempts,
            0
          ),
        },
        { status: nextAttempts >= challenge.max_attempts ? 429 : 400 }
      );
    }

    // Consume the OTP. The phone number is not changed here.
    await client.query(
      `UPDATE phone_verification_challenges
       SET consumed_at = NOW()
       WHERE id = $1`,
      [challenge.id]
    );

    const expiresAt =
      Date.now() + PROOF_VALIDITY_MINUTES * 60 * 1000;

    verificationProof = createVerificationProof({
      challengeId: challenge.id,
      customerId: customer.id,
      phone,
      expiresAt,
    });

    await client.query("COMMIT");

    cookieStore.set(PROOF_COOKIE_NAME, verificationProof, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PROOF_VALIDITY_MINUTES * 60,
    });

    return NextResponse.json({
      success: true,
      verified: true,
      message: "Phone number verified. Please confirm the change.",
      confirmationRequired: true,
      proofExpiresInMinutes: PROOF_VALIDITY_MINUTES,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);

    console.error("Phone-change OTP verification failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to verify OTP. Please try again.",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
