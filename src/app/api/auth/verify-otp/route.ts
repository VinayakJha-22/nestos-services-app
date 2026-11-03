
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { db } from "@/lib/db";

const MAX_SESSION_DAYS = 30;
const ONBOARDING_COOKIE_MINUTES = 10;

function hashOtp(challengeId: string, otp: string) {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP_HASH_SECRET is not configured.");
  }

  return createHmac("sha256", secret)
    .update(`${challengeId}:${otp}`)
    .digest("hex");
}

function createOnboardingProof(challengeId: string, phone: string) {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP_HASH_SECRET is not configured.");
  }

  const payload = Buffer.from(
    JSON.stringify({
      challengeId,
      phone,
      expiresAt: Date.now() + ONBOARDING_COOKIE_MINUTES * 60 * 1000,
    })
  ).toString("base64url");

  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
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
        { success: false, message: "Enter a valid mobile number." },
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
      { success: false, message: "Authentication is not configured." },
      { status: 500 }
    );
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [phone]
    );

    const challengeResult = await client.query(
      `SELECT
        id,
        customer_id,
        otp_hash,
        attempts,
        max_attempts,
        expires_at
       FROM phone_verification_challenges
       WHERE phone_number = $1
         AND purpose = 'sign_in'
         AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [phone]
    );

    const challenge = challengeResult.rows[0];

    if (!challenge) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "OTP is invalid or expired. Request a new OTP." },
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
        { success: false, message: "OTP has expired. Request a new OTP." },
        { status: 400 }
      );
    }

    if (challenge.attempts >= challenge.max_attempts) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "Maximum OTP attempts reached. Request a new OTP." },
        { status: 429 }
      );
    }

    const expectedHash = hashOtp(challenge.id, otp);
    const storedHash = Buffer.from(challenge.otp_hash, "hex");
    const submittedHash = Buffer.from(expectedHash, "hex");

    if (
      storedHash.length !== submittedHash.length ||
      !timingSafeEqual(storedHash, submittedHash)
    ) {
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
          message: nextAttempts >= challenge.max_attempts
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

    // OTP is correct. Consume the challenge before proceeding.
    await client.query(
      `UPDATE phone_verification_challenges
       SET consumed_at = NOW()
       WHERE id = $1`,
      [challenge.id]
    );

    const customerResult = await client.query(
      `SELECT id, full_name, verified_phone, account_status
       FROM customers
       WHERE RIGHT(REGEXP_REPLACE(verified_phone, '\\D', '', 'g'), 10) = $1
       LIMIT 1
       FOR UPDATE`,
      [phone.slice(-10)]
    );

    const customer = customerResult.rows[0];

    if (customer?.account_status === "disabled") {
      await client.query("COMMIT");

      return NextResponse.json(
        { success: false, message: "This account is currently disabled." },
        { status: 403 }
      );
    }

    if (customer) {
      const sessionToken = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256")
        .update(sessionToken)
        .digest("hex");

      await client.query(
        `INSERT INTO customer_sessions (
          id,
          customer_id,
          token_hash,
          created_at,
          expires_at,
          last_seen_at,
          revoked_at
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          NOW(),
          NOW() + INTERVAL '30 days',
          NOW(),
          NULL
        )`,
        [customer.id, tokenHash]
      );

      await client.query("COMMIT");

      const cookieStore = await cookies();

      cookieStore.set("nestos_customer_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: MAX_SESSION_DAYS * 24 * 60 * 60,
      });

      return NextResponse.json({
        success: true,
        requiresProfile: false,
        customer: {
          id: customer.id,
          fullName: customer.full_name,
          phone: customer.verified_phone,
        },
        message: "Phone verified successfully.",
      });
    }

    await client.query("COMMIT");

    const cookieStore = await cookies();

    cookieStore.set(
      "nestos_phone_verified",
      createOnboardingProof(challenge.id, phone),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: ONBOARDING_COOKIE_MINUTES * 60,
      }
    );

    return NextResponse.json({
      success: true,
      requiresProfile: true,
      message: "Phone verified. Please complete your profile.",
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("OTP verification failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to verify OTP. Please try again." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
