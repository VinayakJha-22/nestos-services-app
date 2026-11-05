
import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { db } from "@/lib/db";

type RazorpayWebhookPayment = {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  captured?: boolean;
};

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: RazorpayWebhookPayment;
    };
  };
};

function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string,
  secret: string
) {
  if (!/^[a-f0-9]{64}$/i.test(receivedSignature)) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest();

  const received = Buffer.from(receivedSignature, "hex");

  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  );
}

export async function POST(request: NextRequest) {
  let client;

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Razorpay webhook secret is missing.");

      return NextResponse.json(
        { success: false, error: "Webhook configuration is missing." },
        { status: 500 }
      );
    }

    // 1. Read the exact raw body before parsing JSON.
    const rawBody = await request.text();

    const signature = request.headers.get("x-razorpay-signature");
    const eventId = request.headers.get("x-razorpay-event-id");

    if (!signature || !eventId) {
      return NextResponse.json(
        { success: false, error: "Missing webhook headers." },
        { status: 400 }
      );
    }

    // 2. Verify Razorpay's webhook signature.
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error("Invalid Razorpay webhook signature.");

      return NextResponse.json(
        { success: false, error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    // 3. Parse only after signature verification.
    let event: RazorpayWebhookEvent;

    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid webhook payload." },
        { status: 400 }
      );
    }

    if (typeof event.event !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid webhook event." },
        { status: 400 }
      );
    }

    const eventType = event.event;

    // 4. Extract payment details for captured-payment events.
    const payment = event.payload?.payment?.entity;

    const isSuccessfulEvent =
      eventType === "payment.captured" ||
      eventType === "order.paid";

    if (
      isSuccessfulEvent &&
      (
        !payment?.id ||
        !payment.order_id ||
        typeof payment.amount !== "number" ||
        !payment.currency
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Payment details are incomplete." },
        { status: 400 }
      );
    }

    // 5. Start a transaction and register the event.
    client = await db.connect();

    await client.query("BEGIN");

    await client.query(
      `INSERT INTO public.razorpay_webhook_events (
         event_id,
         event_type,
         razorpay_payment_id,
         razorpay_order_id,
         processing_status
       )
       VALUES ($1, $2, $3, $4, 'received')
       ON CONFLICT (event_id) DO NOTHING`,
      [
        eventId,
        eventType,
        payment?.id ?? null,
        payment?.order_id ?? null,
      ]
    );

    // Lock the event so concurrent duplicate deliveries cannot
    // process the same event simultaneously.
    const eventResult = await client.query(
      `SELECT processing_status
       FROM public.razorpay_webhook_events
       WHERE event_id = $1
       FOR UPDATE`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      throw new Error("Unable to register webhook event.");
    }

    if (eventResult.rows[0].processing_status === "processed") {
      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
      });
    }

    // 6. Ignore non-capture events for subscription activation.
    // payment.failed is recorded but does not change purchase status.
    if (!isSuccessfulEvent) {
      await client.query(
        `UPDATE public.razorpay_webhook_events
         SET processing_status = 'processed',
             processed_at = NOW(),
             error_message = NULL
         WHERE event_id = $1`,
        [eventId]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        received: true,
      });
    }

    // 7. Only fulfil genuinely captured payments.
    if (
      payment?.status !== "captured" ||
      payment.captured === false
    ) {
      await client.query(
        `UPDATE public.razorpay_webhook_events
         SET processing_status = 'failed',
             error_message = 'Payment is not captured.'
         WHERE event_id = $1`,
        [eventId]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        ignored: true,
      });
    }

    const razorpayOrderId = payment.order_id!;
    const razorpayPaymentId = payment.id!;

    // 8. Find and lock the matching local purchase order.
    const purchaseResult = await client.query(
      `SELECT *
       FROM public.package_purchase_orders
       WHERE razorpay_order_id = $1
       FOR UPDATE`,
      [razorpayOrderId]
    );

    if (purchaseResult.rows.length === 0) {
      throw new Error(
        `No local purchase order found for Razorpay order ${razorpayOrderId}.`
      );
    }

    const purchase = purchaseResult.rows[0];

    // 9. Cross-check amount, currency and order details.
    const expectedAmount = Math.round(
      Number(purchase.price_snapshot) * 100
    );

    const expectedCurrency = String(purchase.currency)
      .trim()
      .toUpperCase();

    if (
      Number(payment.amount) !== expectedAmount ||
      String(payment.currency).trim().toUpperCase() !== expectedCurrency
    ) {
      await client.query(
        `UPDATE public.razorpay_webhook_events
         SET processing_status = 'failed',
             error_message = 'Payment amount or currency mismatch.'
         WHERE event_id = $1`,
        [eventId]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        ignored: true,
      });
    }

    // 10. Handle an already-paid purchase safely.
    if (purchase.status === "paid") {
      if (purchase.razorpay_payment_id !== razorpayPaymentId) {
        await client.query(
          `UPDATE public.razorpay_webhook_events
           SET processing_status = 'failed',
               error_message = 'Purchase already paid with another payment.'
           WHERE event_id = $1`,
          [eventId]
        );

        await client.query("COMMIT");

        return NextResponse.json({
          success: true,
          ignored: true,
        });
      }

      const existingSubscription = await client.query(
        `SELECT id
         FROM public.customer_subscriptions
         WHERE purchase_order_id = $1`,
        [purchase.id]
      );

      if (existingSubscription.rows.length === 0) {
        throw new Error(
          "Paid purchase has no subscription. Manual recovery is required."
        );
      }

      await client.query(
        `UPDATE public.razorpay_webhook_events
         SET processing_status = 'processed',
             processed_at = NOW(),
             error_message = NULL
         WHERE event_id = $1`,
        [eventId]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
      });
    }

    // Do not reactivate cancelled, failed or refunded orders.
    if (purchase.status !== "pending_payment") {
      await client.query(
        `UPDATE public.razorpay_webhook_events
         SET processing_status = 'failed',
             error_message = 'Purchase order is not eligible for payment.'
         WHERE event_id = $1`,
        [eventId]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        ignored: true,
      });
    }

    // 11. Mark the purchase order as paid.
    const updateResult = await client.query(
      `UPDATE public.package_purchase_orders
       SET status = 'paid',
           payment_reference = $1,
           razorpay_payment_id = $1,
           paid_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
         AND status = 'pending_payment'`,
      [razorpayPaymentId, purchase.id]
    );

    if (updateResult.rowCount !== 1) {
      throw new Error("Unable to update purchase order.");
    }

    // 12. Create the prepaid subscription.
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
        purchase.customer_id,
        purchase.society_id,
        purchase.package_id,
        purchase.id,
        purchase.credits_snapshot,
        purchase.validity_months_snapshot,
      ]
    );

    const subscriptionId = subscriptionResult.rows[0].id;

    // 13. Record purchased credits exactly once.
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
        purchase.credits_snapshot,
        purchase.id,
        `package_purchase:${purchase.id}`,
        `Purchased package ${purchase.package_id}`,
      ]
    );

    // 14. Mark the webhook event processed in the same transaction.
    await client.query(
      `UPDATE public.razorpay_webhook_events
       SET processing_status = 'processed',
           processed_at = NOW(),
           error_message = NULL
       WHERE event_id = $1`,
      [eventId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      purchaseOrderId: purchase.id,
      subscriptionId,
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Webhook rollback failed:", rollbackError);
      }
    }

    console.error("Razorpay webhook processing failed:", error);

    // A non-2xx response allows Razorpay to retry delivery.
    return NextResponse.json(
      { success: false, error: "Webhook processing failed." },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
