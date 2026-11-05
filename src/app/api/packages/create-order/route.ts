import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Razorpay from "razorpay";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let purchaseOrderId: string | null = null;

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { success: false, error: "Payment configuration is missing." },
        { status: 500 },
      );
    }

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
      `SELECT
         c.id,
         c.full_name,
         c.email,
         c.verified_phone
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
        {
          success: false,
          error: "Your session has expired. Please sign in again.",
        },
        { status: 401 },
      );
    }

    const customer = customerResult.rows[0];

    // 2. Validate request
    const body = await request.json();
    const societyId = body.societyId;
    const packageId = body.packageId;

    if (
      typeof societyId !== "string" ||
      !uuidRegex.test(societyId) ||
      typeof packageId !== "string" ||
      !packageId.trim()
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid package or society information." },
        { status: 400 },
      );
    }

    // 3. Create local pending purchase using database price
    const purchaseResult = await db.query(
      `INSERT INTO public.package_purchase_orders (
         customer_id,
         society_id,
         package_id,
         package_name_snapshot,
         price_snapshot,
         credits_snapshot,
         validity_months_snapshot,
         currency,
         payment_provider,
         status
       )
       SELECT
         $1,
         s.id,
         p.id,
         p.name,
         p.price,
         p.credits,
         p.validity_months,
         p.currency,
         'razorpay',
         'pending_payment'
       FROM public.societies s
       INNER JOIN public.society_packages sp
         ON sp.society_id = s.id
       INNER JOIN public.packages p
         ON p.id = sp.package_id
       WHERE s.id = $2
         AND p.id = $3
         AND s.is_accepting_bookings = TRUE
         AND sp.is_available = TRUE
         AND p.is_active = TRUE
       RETURNING
         id,
         package_name_snapshot,
         price_snapshot::text AS price,
         credits_snapshot,
         validity_months_snapshot,
         currency`,
      [customer.id, societyId, packageId.trim()],
    );

    if (purchaseResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This package is not currently available at the selected society.",
        },
        { status: 404 },
      );
    }

    const purchase = purchaseResult.rows[0];
    purchaseOrderId = purchase.id;

    // 4. Convert rupees to paise
    const amount = Math.round(Number(purchase.price) * 100);
    const currency = String(purchase.currency).trim().toUpperCase();

    if (!Number.isSafeInteger(amount) || amount <= 0 || currency !== "INR") {
      throw new Error("Invalid package amount or currency.");
    }

    // 5. Create Razorpay order
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency,
      receipt: purchase.id,
      notes: {
        purchase_order_id: purchase.id,
        customer_id: customer.id,
        society_id: societyId,
        package_id: packageId.trim(),
      },
    });

    // 6. Save Razorpay order ID
    const savedOrderResult = await db.query(
      `UPDATE public.package_purchase_orders
   SET razorpay_order_id = $1,
       updated_at = NOW()
   WHERE id = $2
     AND status = 'pending_payment'
   RETURNING id`,
      [razorpayOrder.id, purchase.id],
    );

    if (savedOrderResult.rows.length !== 1) {
      throw new Error("Failed to save Razorpay order ID.");
    }

    // 7. Return checkout information
    return NextResponse.json({
      success: true,
      purchaseOrderId: purchase.id,
      razorpayOrderId: razorpayOrder.id,
      keyId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      packageName: purchase.package_name_snapshot,
      customer: {
        name: customer.full_name,
        email: customer.email,
        contact: customer.verified_phone,
      },
    });
  } catch (error) {
    console.error("Package order creation failed:", error);

    if (purchaseOrderId) {
      try {
        await db.query(
          `UPDATE public.package_purchase_orders
           SET status = 'payment_failed',
               updated_at = NOW()
           WHERE id = $1
             AND status = 'pending_payment'`,
          [purchaseOrderId],
        );
      } catch (updateError) {
        console.error("Failed to update purchase order:", updateError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unable to initiate payment. Please try again.",
      },
      { status: 500 },
    );
  }
}
