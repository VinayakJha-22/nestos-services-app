
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";
const PROOF_COOKIE_NAME = "nestos_phone_change_verified";

type VerificationProof = {
  challengeId: string;
  customerId: string;
  phone: string;
  expiresAt: number;
};

function verifyProof(token: string, secret: string): VerificationProof | null {
  try {
    const [encodedPayload, signature] = token.split(".");

    if (!encodedPayload || !signature) return null;

    const expectedSignature = createHmac("sha256", secret)
      .update(encodedPayload)
      .digest();

    const suppliedSignature = Buffer.from(signature, "base64url");

    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as VerificationProof;

    if (
      typeof payload.challengeId !== "string" ||
      typeof payload.customerId !== "string" ||
      typeof payload.phone !== "string" ||
      typeof payload.expiresAt !== "number" ||
      !/^\d{12}$/.test(payload.phone) ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function POST() {
  const cookieStore = await cookies();

  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const proofToken = cookieStore.get(PROOF_COOKIE_NAME)?.value;
  const secret = process.env.OTP_HASH_SECRET;

  if (!sessionToken || !proofToken || !secret) {
    return NextResponse.json(
      { success: false, message: "Phone verification expired. Please try again." },
      { status: 401 }
    );
  }

  const proof = verifyProof(proofToken, secret);

  if (!proof) {
    cookieStore.delete(PROOF_COOKIE_NAME);

    return NextResponse.json(
      { success: false, message: "Phone verification expired. Please verify again." },
      { status: 401 }
    );
  }

  const sessionHash = createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const sessionResult = await client.query(
      `
      SELECT c.id
      FROM customer_sessions s
      JOIN customers c ON c.id = s.customer_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
        AND c.account_status = 'active'
      FOR UPDATE OF c
      `,
      [sessionHash]
    );

    if (
      sessionResult.rowCount === 0 ||
      sessionResult.rows[0].id !== proof.customerId
    ) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "Your session is no longer valid. Please sign in again." },
        { status: 401 }
      );
    }

    const customerId = sessionResult.rows[0].id;

    // Prevent simultaneous phone changes from assigning the same number.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`change-phone:${proof.phone}`]
    );

    const challengeResult = await client.query(
      `
      SELECT id
      FROM phone_verification_challenges
      WHERE id = $1
        AND customer_id = $2
        AND phone_number = $3
        AND purpose = 'change_phone'
        AND consumed_at IS NOT NULL
      FOR UPDATE
      `,
      [proof.challengeId, customerId, proof.phone]
    );

    if (challengeResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "Phone verification could not be confirmed. Please verify again." },
        { status: 400 }
      );
    }

    const existingPhone = await client.query(
      `
      SELECT id
      FROM customers
      WHERE verified_phone = $1
        AND id <> $2
      LIMIT 1
      `,
      [proof.phone, customerId]
    );

    if (existingPhone.rows.length > 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "This phone number is already registered to another account." },
        { status: 409 }
      );
    }

    await client.query(
      `
      UPDATE customers
      SET verified_phone = $1,
          phone_verified_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
      `,
      [proof.phone, customerId]
    );

    // Require a fresh sign-in on every device after a phone change.
    await client.query(
      `
      UPDATE customer_sessions
      SET revoked_at = NOW()
      WHERE customer_id = $1
        AND revoked_at IS NULL
      `,
      [customerId]
    );

    await client.query("COMMIT");

    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete("nestos_phone_verified");
    cookieStore.delete(PROOF_COOKIE_NAME);

    return NextResponse.json({
      success: true,
      message: "Phone number updated successfully. Please sign in again.",
      redirectTo: "/?auth=login",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Confirm phone change error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update your phone number. Please try again." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
