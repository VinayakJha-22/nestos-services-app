
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Razorpay from "razorpay";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let client;

  try {
    // 1. Check Razorpay configuration.
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Razorpay configuration is missing.");
    }

    // 2. Validate customer session.
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Please sign in to continue." },
        { status: 401 },
      );
    }

    const tokenHash = createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const customerResult = await db.query(
      `SELECT c.id, c.full_name, c.email, c.verified_phone
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

    // 3. Validate booking ID.
    const body = await request.json();
    const bookingId = body.bookingId;

    if (
      typeof bookingId !== "string" ||
      !uuidRegex.test(bookingId)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid booking reference." },
        { status: 400 },
      );
    }

    // 4. Lock booking and reservation before creating an order.
    client = await db.connect();
    await client.query("BEGIN");

    const bookingResult = await client.query(
      `SELECT
         b.id,
         b.booking_reference,
         b.customer_id,
         b.society_id,
         b.society_name_snapshot,
         b.service_name_snapshot,
         b.booking_date,
         b.start_time,
         b.end_time,
         b.vehicle_type,
         b.total_amount,
         b.currency,
         r.id AS reservation_id,
         r.expires_at
       FROM public.bookings b
       INNER JOIN public.booking_slot_reservations r
         ON r.booking_id = b.id
       WHERE b.id = $1
         AND b.customer_id = $2
         AND b.booking_status = 'pending_payment'
         AND b.payment_method = 'one_time'
         AND b.payment_status = 'pending'
         AND r.status = 'active'
         AND r.expires_at > NOW()
       FOR UPDATE OF b, r`,
      [bookingId, customer.id],
    );

    if (bookingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      client = null;

      return NextResponse.json(
        {
          success: false,
          error: "Your booking reservation has expired or is no longer valid. Please select another slot.",
        },
        { status: 409 },
      );
    }

    const booking = bookingResult.rows[0];

    // 5. Calculate payment amount from the database.
    const amountPaise = Math.round(
      Number(booking.total_amount) * 100,
    );

    if (
      !Number.isSafeInteger(amountPaise) ||
      amountPaise <= 0 ||
      booking.currency !== "INR"
    ) {
      throw new Error("Invalid booking payment amount.");
    }

    // 6. Reuse an existing pending order if this request is retried.
    const existingOrderResult = await client.query(
      `SELECT
         razorpay_order_id,
         amount_paise,
         currency
       FROM public.booking_payment_orders
       WHERE booking_id = $1
         AND status = 'pending_payment'
       LIMIT 1`,
      [booking.id],
    );

    if (existingOrderResult.rows.length > 0) {
      const existingOrder = existingOrderResult.rows[0];

      if (Number(existingOrder.amount_paise) !== amountPaise) {
        throw new Error(
          "Existing payment order amount does not match the booking.",
        );
      }

      await client.query("COMMIT");
      client.release();
      client = null;

      return NextResponse.json({
        success: true,
        bookingId: booking.id,
        bookingReference: booking.booking_reference,
        orderId: existingOrder.razorpay_order_id,
        keyId,
        amount: Number(existingOrder.amount_paise),
        currency: existingOrder.currency,
        customer: {
          name: customer.full_name,
          email: customer.email,
          contact: customer.verified_phone,
        },
      });
    }

    // 7. Create Razorpay order.
    // Booking and reservation remain locked until the order is saved.
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `booking_${booking.booking_reference}`,
      notes: {
        booking_id: booking.id,
        booking_reference: booking.booking_reference,
        customer_id: customer.id,
        society_id: booking.society_id,
      },
    });

    // 8. Save Razorpay order against the booking.
    await client.query(
      `INSERT INTO public.booking_payment_orders (
         booking_id,
         razorpay_order_id,
         amount_paise,
         currency,
         status
       )
       VALUES ($1, $2, $3, 'INR', 'pending_payment')`,
      [
        booking.id,
        razorpayOrder.id,
        amountPaise,
      ],
    );

    await client.query("COMMIT");

    client.release();
    client = null;

    // 9. Return checkout details to the frontend.
    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      orderId: razorpayOrder.id,
      keyId,
      amount: amountPaise,
      currency: "INR",
      reservationExpiresAt: booking.expires_at,
      booking: {
        societyName: booking.society_name_snapshot,
        serviceName: booking.service_name_snapshot,
        date: booking.booking_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        vehicleType: booking.vehicle_type,
      },
      customer: {
        name: customer.full_name,
        email: customer.email,
        contact: customer.verified_phone,
      },
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Transaction may already have been rolled back.
      }

      client.release();
    }

    console.error("Booking payment order creation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to initiate payment. Please try again.",
      },
      { status: 500 },
    );
  }
}
