import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json({
      authenticated: false,
      customer: null,
    });
  }

  const tokenHash = createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  try {
    const result = await db.query(
      `SELECT
         c.id,
         c.full_name,
         c.email,
         c.verified_phone,
         c.preferred_society_id
       FROM customer_sessions s
       JOIN customers c ON c.id = s.customer_id
       WHERE s.token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()
         AND c.account_status = 'active'
       LIMIT 1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      cookieStore.delete(SESSION_COOKIE_NAME);

      return NextResponse.json({
        authenticated: false,
        customer: null,
      });
    }

    const customer = result.rows[0];

    await db.query(
      `UPDATE customer_sessions
       SET last_seen_at = NOW()
       WHERE token_hash = $1
         AND revoked_at IS NULL`,
      [tokenHash]
    );

    return NextResponse.json({
      authenticated: true,
      customer: {
        id: customer.id,
        fullName: customer.full_name,
        email: customer.email,
        phone: customer.verified_phone,
        preferredSocietyId: customer.preferred_society_id,
      },
    });
  } catch (error) {
    console.error("Session validation error:", error);

    return NextResponse.json(
      { error: "Unable to validate customer session." },
      { status: 500 }
    );
  }
}