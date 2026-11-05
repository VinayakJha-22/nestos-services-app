import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";

export async function GET(request: NextRequest) {
  try {
    // 1. Validate customer session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Please sign in to continue." },
        { status: 401 },
      );
    }

    const tokenHash = createHash("sha256").update(sessionToken).digest("hex");

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
      [tokenHash],
    );

    if (customerResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Your session has expired." },
        { status: 401 },
      );
    }

    const customerId = customerResult.rows[0].id;

    // 2. Validate purchase reference
    const purchaseOrderId = request.nextUrl.searchParams.get("purchaseOrderId");

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!purchaseOrderId || !uuidRegex.test(purchaseOrderId)) {
      return NextResponse.json(
        { success: false, error: "Invalid purchase reference." },
        { status: 400 },
      );
    }

    // 3. Fetch the paid purchase and its subscription
    const result = await db.query(
      `SELECT
         po.id AS "purchaseOrderId",
         po.package_name_snapshot AS "packageName",
         po.price_snapshot AS price,
         po.currency,
         po.credits_snapshot AS "creditsPurchased",
         po.validity_months_snapshot AS "validityMonths",
         po.paid_at AS "paidAt",
         po.razorpay_payment_id AS "paymentId",
         s.name AS "societyName",
         cs.id AS "subscriptionId",
         cs.status AS "subscriptionStatus",
         cs.credits_remaining AS "creditsRemaining",
         cs.expires_at AS "expiresAt"
       FROM public.package_purchase_orders po
       INNER JOIN public.societies s
         ON s.id = po.society_id
       INNER JOIN public.customer_subscriptions cs
         ON cs.purchase_order_id = po.id
       WHERE po.id = $1
         AND po.customer_id = $2
         AND po.status = 'paid'
          AND cs.status = 'active'
          LIMIT 1`,
      [purchaseOrderId, customerId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Paid purchase details could not be found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        purchase: result.rows[0],
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch package purchase:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to retrieve purchase details.",
      },
      { status: 500 },
    );
  }
}
