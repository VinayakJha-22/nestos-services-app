import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";
const ONBOARDING_COOKIE_NAME = "nestos_phone_verified";
const SESSION_DAYS = 30;

type OnboardingPayload = {
  challengeId: string;
  phone: string;
  expiresAt: number;
};

function verifyOnboardingProof(
  proof: string
): OnboardingPayload | null {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP_HASH_SECRET is not configured.");
  }

  const parts = proof.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [payload, suppliedSignature] = parts;

  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  const expectedBuffer = Buffer.from(expectedSignature);
  const suppliedBuffer = Buffer.from(suppliedSignature);

  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as OnboardingPayload;

    if (
      !decoded.challengeId ||
      !decoded.phone ||
      !decoded.expiresAt ||
      decoded.expiresAt <= Date.now()
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const onboardingProof = cookieStore.get(ONBOARDING_COOKIE_NAME)?.value;

  if (!onboardingProof) {
    return NextResponse.json(
      { error: "Phone verification is required. Please verify your phone again." },
      { status: 401 }
    );
  }

  const proof = verifyOnboardingProof(onboardingProof);

  if (!proof) {
    cookieStore.delete(ONBOARDING_COOKIE_NAME);

    return NextResponse.json(
      { error: "Your verification has expired. Please verify your phone again." },
      { status: 401 }
    );
  }

  let body: {
    fullName?: string;
    email?: string;
    preferredSocietyId?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const fullName = body.fullName?.trim();
  const email = body.email?.trim().toLowerCase() || null;
  const preferredSocietyId = body.preferredSocietyId || null;

  if (!fullName || fullName.length > 100) {
    return NextResponse.json(
      { error: "Please enter a name between 1 and 100 characters." },
      { status: 400 }
    );
  }

  if (
    email &&
    (email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  if (
    preferredSocietyId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      preferredSocietyId,
    )
  ) {
    return NextResponse.json(
      { error: "Invalid preferred society." },
      { status: 400 },
    );
  }

  const client = await db.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // Lock the verified challenge to prevent duplicate registration.
    const challengeResult = await client.query(
      `SELECT id, phone_number, purpose, consumed_at, customer_id
       FROM phone_verification_challenges
       WHERE id = $1
       FOR UPDATE`,
      [proof.challengeId]
    );

    const challenge = challengeResult.rows[0];

    if (
      !challenge ||
      challenge.purpose !== "sign_in" ||
      !challenge.consumed_at ||
      challenge.customer_id !== null ||
      challenge.phone_number.slice(-10) !== proof.phone.slice(-10)
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        { error: "This verification cannot be used. Please verify your phone again." },
        { status: 401 }
      );
    }

    const existingCustomer = await client.query(
      `SELECT id
       FROM customers
       WHERE verified_phone = $1`,
      [challenge.phone_number]
    );

    if (existingCustomer.rows.length > 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        { error: "An account already exists for this phone number. Please sign in." },
        { status: 409 }
      );
    }

    const customerId = randomUUID();

    await client.query(
      `INSERT INTO customers (
        id,
        full_name,
        email,
        verified_phone,
        phone_verified_at,
        preferred_society_id,
        account_status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), $5, 'active', NOW(), NOW())`,
      [
        customerId,
        fullName,
        email,
        challenge.phone_number,
        preferredSocietyId,
      ]
    );

    await client.query(
      `INSERT INTO customer_notification_preferences (
        customer_id,
        essential_booking_updates_enabled,
        promotional_messages_enabled,
        updated_at
      )
      VALUES ($1, TRUE, FALSE, NOW())`,
      [customerId]
    );

    // Link the consumed verification challenge to the new customer.
    await client.query(
      `UPDATE phone_verification_challenges
       SET customer_id = $1
       WHERE id = $2`,
      [customerId, proof.challengeId]
    );

    // Create a secure, opaque customer session.
    const sessionToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const sessionId = randomUUID();

    await client.query(
      `INSERT INTO customer_sessions (
        id,
        customer_id,
        token_hash,
        created_at,
        expires_at,
        last_seen_at
      )
      VALUES (
        $1,
        $2,
        $3,
        NOW(),
        NOW() + INTERVAL '30 days',
        NOW()
      )`,
      [sessionId, customerId, tokenHash]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });

    cookieStore.delete(ONBOARDING_COOKIE_NAME);

    return NextResponse.json({
      success: true,
      requiresProfile: false,
      customer: {
        id: customerId,
        fullName,
        email,
        phone: challenge.phone_number,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => undefined);
    }

    console.error("Complete profile error:", error);

    return NextResponse.json(
      { error: "Unable to create your account. Please try again." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}