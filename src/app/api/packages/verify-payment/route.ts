
import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Razorpay from "razorpay";
import { db } from "@/lib/db";


const SESSION_COOKIE_NAME = "nestos_customer_session";

export async function POST(request: NextRequest) {
  let client;

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { success: false, error: "Payment configuration is missing." },
        { status: 500 }
      );
    }

    // 1. Validate customer session
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Please sign in again." },
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
        { success: false, error: "Your session has expired." },
        { status: 401 }
      );
    }

    const customerId = customerResult.rows[0].id;

    // 2. Validate payment details received from checkout
    const body = await request.json();

    const purchaseOrderId = body.purchaseOrderId;
    const razorpayOrderId = body.razorpay_order_id;
    const razorpayPaymentId = body.razorpay_payment_id;
    const razorpaySignature = body.razorpay_signature;

    if (
      typeof purchaseOrderId !== "string" ||
      typeof razorpayOrderId !== "string" ||
      typeof razorpayPaymentId !== "string" ||
      typeof razorpaySignature !== "string" ||
      !/^[a-f0-9]{64}$/i.test(razorpaySignature)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid payment information." },
        { status: 400 }
      );
    }

    // 3. Find the purchase order belonging to this customer
    const purchaseResult = await db.query(
      `SELECT
         id,
         customer_id,
         package_id,
         society_id,
         price_snapshot,
         credits_snapshot,
         validity_months_snapshot,
         currency,
         status,
         razorpay_order_id,
         razorpay_payment_id
       FROM public.package_purchase_orders
       WHERE id = $1
         AND customer_id = $2
       LIMIT 1`,
      [purchaseOrderId, customerId]
    );

    if (purchaseResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Purchase order not found." },
        { status: 404 }
      );
    }

    const purchase = purchaseResult.rows[0];

    if (purchase.razorpay_order_id !== razorpayOrderId) {
      return NextResponse.json(
        { success: false, error: "Payment order does not match." },
        { status: 400 }
      );
    }

    // 4. Verify Razorpay signature using the server secret
    const expectedSignature = createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(razorpaySignature, "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return NextResponse.json(
        { success: false, error: "Payment signature verification failed." },
        { status: 400 }
      );
    }

    // 5. Verify payment directly with Razorpay
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const payment = await razorpay.payments.fetch(razorpayPaymentId);

    const expectedAmount = Math.round(
      Number(purchase.price_snapshot) * 100
    );

    if (
      String(payment.order_id) !== razorpayOrderId ||
      Number(payment.amount) !== expectedAmount ||
      String(payment.currency).toUpperCase() !==
        String(purchase.currency).trim().toUpperCase()
    ) {
      return NextResponse.json(
        { success: false, error: "Payment details do not match the purchase." },
        { status: 400 }
      );
    }

    if (payment.status !== "captured") {
      return NextResponse.json(
        {
          success: false,
          error: "Payment has not been captured yet. Please try again shortly.",
        },
        { status: 409 }
      );
    }

    // 6. Atomically mark paid, create subscription and credit ledger entry
    client = await db.connect();
    await client.query("BEGIN");

    const lockedResult = await client.query(
      `SELECT *
       FROM public.package_purchase_orders
       WHERE id = $1
         AND customer_id = $2
       FOR UPDATE`,
      [purchaseOrderId, customerId]
    );

    if (lockedResult.rows.length === 0) {
      throw new Error("Purchase order could not be found.");
    }

    const lockedPurchase = lockedResult.rows[0];

    if (lockedPurchase.status === "paid") {
      if (lockedPurchase.razorpay_payment_id !== razorpayPaymentId) {
        throw new Error("This purchase order has already been paid using another payment.");
      }

      const existingSubscription = await client.query(
        `SELECT id
         FROM public.customer_subscriptions
         WHERE purchase_order_id = $1`,
        [purchaseOrderId]
      );

      if (existingSubscription.rows.length === 0) {
        throw new Error("Paid purchase has no associated subscription. Please contact support.");
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        purchaseOrderId,
        subscriptionId: existingSubscription.rows[0].id,
      });
    }

    if (
      lockedPurchase.status !== "pending_payment" ||
      lockedPurchase.razorpay_order_id !== razorpayOrderId
    ) {
      throw new Error("This purchase order is no longer eligible for payment verification.");
    }

    const updateResult = await client.query(
      `UPDATE public.package_purchase_orders
       SET status = 'paid',
           payment_reference = $1,
           razorpay_payment_id = $1,
           razorpay_signature_verified_at = NOW(),
           paid_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
         AND status = 'pending_payment'`,
      [razorpayPaymentId, purchaseOrderId]
    );

    if (updateResult.rowCount !== 1) {
      throw new Error("Unable to update purchase order.");
    }

    // 7. Create the prepaid subscription
    const subscriptionResult = await client.query(
      `INSERT INTO public.customer_subscriptions (
         customer_id,
         society_id,
         package_id,
         purchase_order_id,
         status,
         credits_purchased,
         credits_remaining,
         starts_at,
         expires_at
       )
       VALUES (
         $1,
         $2,
         $3,
         $4,
         'active',
         $5,
         $5,
         NOW(),
         NOW() + ($6 * INTERVAL '1 month')
       )
       RETURNING id`,
      [
        lockedPurchase.customer_id,
        lockedPurchase.society_id,
        lockedPurchase.package_id,
        purchaseOrderId,
        lockedPurchase.credits_snapshot,
        lockedPurchase.validity_months_snapshot,
      ]
    );

    const subscriptionId = subscriptionResult.rows[0].id;

    // 8. Record purchased credits in the ledger
    await client.query(
      `INSERT INTO public.subscription_credit_ledger (
         subscription_id,
         entry_type,
         credits_delta,
         reference_type,
         reference_id,
         idempotency_key,
         notes
       )
       VALUES (
         $1,
         'purchase',
         $2,
         'package_purchase',
         $3,
         $4,
         $5
       )`,
      [
        subscriptionId,
        lockedPurchase.credits_snapshot,
        purchaseOrderId,
        `package_purchase:${purchaseOrderId}`,
        `Purchased package ${lockedPurchase.package_id}`,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      purchaseOrderId,
      subscriptionId,
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Payment transaction rollback failed:", rollbackError);
      }
    }

    console.error("Package payment verification failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to verify payment. Please contact support if money was deducted.",
      },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
