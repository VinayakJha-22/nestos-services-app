
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";

export async function GET() {
  try {
    // 1. Validate the customer's existing session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Please sign in to view your packages." },
        { status: 401 }
      );
    }

    const tokenHash = createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const customerResult = await db.query(
      `SELECT c.id
       FROM public.customer_sessions s
       INNER JOIN public.customers c
         ON c.id = s.customer_id
       WHERE s.token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()
         AND c.account_status = 'active'
       LIMIT 1`,
      [tokenHash]
    );

    if (customerResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    const customerId = customerResult.rows[0].id;

    // 2. Fetch all paid packages purchased by this customer
    const result = await db.query(
      `SELECT
         cs.id AS "subscriptionId",
         po.id AS "purchaseOrderId",
         po.package_name_snapshot AS name,
         s.name AS society,
         po.paid_at::date::text AS "purchasedOn",
         cs.expires_at::date::text AS "expiresOn",
         cs.credits_purchased AS "totalCredits",
         cs.credits_remaining AS "remainingCredits",
         (cs.credits_purchased - cs.credits_remaining) AS "usedCredits",
         po.price_snapshot AS "amountPaid",
         po.currency,
         CASE
           WHEN cs.status = 'cancelled' THEN 'Cancelled'
           WHEN cs.status = 'suspended' THEN 'Suspended'
           WHEN cs.expires_at <= NOW() THEN 'Expired'
           WHEN cs.credits_remaining = 0 THEN 'Exhausted'
           ELSE 'Active'
         END AS status
       FROM public.customer_subscriptions cs
       INNER JOIN public.package_purchase_orders po
         ON po.id = cs.purchase_order_id
       INNER JOIN public.societies s
         ON s.id = cs.society_id
       WHERE cs.customer_id = $1
         AND po.status = 'paid'
       ORDER BY po.paid_at DESC NULLS LAST, po.created_at DESC`,
      [customerId]
    );

    return NextResponse.json(
      {
        success: true,
        packages: result.rows,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch customer packages:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load your packages at this time.",
      },
      { status: 500 }
    );
  }
}
