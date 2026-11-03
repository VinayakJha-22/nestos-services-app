
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const ONBOARDING_COOKIE_NAME = "nestos_phone_verified";

type OnboardingPayload = {
  challengeId: string;
  phone: string;
  expiresAt: number;
};

function verifyOnboardingProof(proof: string): OnboardingPayload | null {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP_HASH_SECRET is not configured.");
  }

  const parts = proof.split(".");

  if (parts.length !== 2) return null;

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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const proofCookie = cookieStore.get(ONBOARDING_COOKIE_NAME)?.value;

    if (!proofCookie) {
      return NextResponse.json(
        { success: false, error: "Phone verification is required." },
        { status: 401 }
      );
    }

    const proof = verifyOnboardingProof(proofCookie);

    if (!proof) {
      cookieStore.delete(ONBOARDING_COOKIE_NAME);

      return NextResponse.json(
        { success: false, error: "Phone verification has expired. Please verify again." },
        { status: 401 }
      );
    }

    const result = await db.query(
      `SELECT id
       FROM phone_verification_challenges
       WHERE id = $1
         AND phone_number = $2
         AND purpose = 'sign_in'
         AND consumed_at IS NOT NULL
         AND customer_id IS NULL`,
      [proof.challengeId, proof.phone]
    );

    if (result.rows.length === 0) {
      cookieStore.delete(ONBOARDING_COOKIE_NAME);

      return NextResponse.json(
        { success: false, error: "This phone verification is no longer valid." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      phone: proof.phone,
    });
  } catch (error) {
    console.error("Onboarding verification error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to verify your onboarding session." },
      { status: 500 }
    );
  }
}
