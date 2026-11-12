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

  const tokenHash = createHash("sha256").update(sessionToken).digest("hex");

  try {
    const result = await db.query(
      `SELECT
   c.id,
   c.full_name,
   c.email,
   c.verified_phone,
   c.phone_verified_at,
   c.preferred_society_id,
   c.created_at,
   c.account_status,
   COALESCE(p.essential_booking_updates_enabled, TRUE)
     AS booking_updates_enabled,
   COALESCE(p.promotional_messages_enabled, FALSE)
     AS promotional_messages_enabled,
   s.name AS preferred_society_name,
   s.address_line AS preferred_society_address,
   s.locality AS preferred_society_locality,
   s.city AS preferred_society_city
 FROM customer_sessions cs
 JOIN customers c ON c.id = cs.customer_id
 LEFT JOIN customer_notification_preferences p
   ON p.customer_id = c.id
 LEFT JOIN societies s
   ON s.id = c.preferred_society_id
 WHERE cs.token_hash = $1
   AND cs.revoked_at IS NULL
   AND cs.expires_at > NOW()
   AND c.account_status = 'active'
 LIMIT 1`,
      [tokenHash],
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
      [tokenHash],
    );

    return NextResponse.json({
      authenticated: true,

      customer: {
        id: customer.id,
        fullName: customer.full_name,
        email: customer.email,
        phone: customer.verified_phone,
        phoneVerifiedAt: customer.phone_verified_at,
        preferredSocietyId: customer.preferred_society_id,
        preferredSociety: customer.preferred_society_name
          ? {
              name: customer.preferred_society_name,
              address: [
                customer.preferred_society_address,
                customer.preferred_society_locality,
                customer.preferred_society_city,
              ]
                .filter(Boolean)
                .join(", "),
            }
          : null,
        createdAt: customer.created_at,
        accountStatus: customer.account_status,
        bookingUpdates: customer.booking_updates_enabled,
        promotionalMessages: customer.promotional_messages_enabled,
      },
    });
  } catch (error) {
    console.error("Session validation error:", error);

    return NextResponse.json(
      { error: "Unable to validate customer session." },
      { status: 500 },
    );
  }
}
