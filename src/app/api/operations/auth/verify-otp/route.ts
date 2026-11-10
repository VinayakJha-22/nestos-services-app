
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { db } from "@/lib/db";

const MAX_SESSION_DAYS = 1;

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
  let otp: string;

  try {
    const body = await request.json();

    const phoneInput = String(body?.phone ?? "").replace(/\D/g, "");
    otp = String(body?.otp ?? "").trim();

    const tenDigitPhone =
      phoneInput.startsWith("91") && phoneInput.length === 12
        ? phoneInput.slice(2)
        : phoneInput;

    if (!/^[6-9]\d{9}$/.test(tenDigitPhone)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid mobile number." },
        { status: 400 },
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid six-digit OTP." },
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

  if (!process.env.OTP_HASH_SECRET) {
    return NextResponse.json(
      { success: false, message: "Authentication is not configured." },
      { status: 500 },
    );
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`operations:${phone}`],
    );

    const challengeResult = await client.query(
      `SELECT
        id,
        operations_user_id,
        otp_hash,
        attempts,
        max_attempts,
        expires_at
       FROM operations_otp_challenges
       WHERE phone_number = $1
         AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [phone],
    );

    const challenge = challengeResult.rows[0];

    if (!challenge) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "OTP is invalid or expired. Request a new OTP." },
        { status: 400 },
      );
    }

    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await client.query(
        `UPDATE operations_otp_challenges
         SET consumed_at = NOW()
         WHERE id = $1`,
        [challenge.id],
      );

      await client.query("COMMIT");

      return NextResponse.json(
        { success: false, message: "OTP has expired. Request a new OTP." },
        { status: 400 },
      );
    }

    if (challenge.attempts >= challenge.max_attempts) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "Maximum OTP attempts reached. Request a new OTP." },
        { status: 429 },
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
        `UPDATE operations_otp_challenges
         SET attempts = $2,
             consumed_at = CASE
               WHEN $2 >= max_attempts THEN NOW()
               ELSE consumed_at
             END
         WHERE id = $1`,
        [challenge.id, nextAttempts],
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
            0,
          ),
        },
        { status: nextAttempts >= challenge.max_attempts ? 429 : 400 },
      );
    }

    const userResult = await client.query(
      `SELECT id, user_reference, full_name, role, account_status
       FROM operations_users
       WHERE id = $1
         AND phone_number = $2
       FOR UPDATE`,
      [challenge.operations_user_id, phone],
    );

    const operationsUser = userResult.rows[0];

    if (!operationsUser || operationsUser.account_status !== "active") {
      await client.query(
        `UPDATE operations_otp_challenges
         SET consumed_at = NOW()
         WHERE id = $1`,
        [challenge.id],
      );

      await client.query("COMMIT");

      return NextResponse.json(
        { success: false, message: "This operations account is unavailable." },
        { status: 403 },
      );
    }

    await client.query(
      `UPDATE operations_otp_challenges
       SET consumed_at = NOW()
       WHERE id = $1`,
      [challenge.id],
    );

    const sessionToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    await client.query(
      `INSERT INTO operations_sessions (
        id,
        operations_user_id,
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
        NOW() + INTERVAL '1 day',
        NOW(),
        NULL
      )`,
      [operationsUser.id, tokenHash],
    );

    await client.query(
      `UPDATE operations_users
       SET phone_verified_at = COALESCE(phone_verified_at, NOW()),
           updated_at = NOW()
       WHERE id = $1`,
      [operationsUser.id],
    );

    await client.query("COMMIT");

    const cookieStore = await cookies();

    cookieStore.set("nestos_operations_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_SESSION_DAYS * 24 * 60 * 60,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: operationsUser.id,
        userReference: operationsUser.user_reference,
        fullName: operationsUser.full_name,
        role: operationsUser.role,
      },
      message: "Operations login successful.",
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Operations OTP verification failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to verify OTP. Please try again." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
