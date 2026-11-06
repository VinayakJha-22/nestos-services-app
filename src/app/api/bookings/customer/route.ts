
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";

export async function GET() {
  try {
    // 1. Validate the customer's session.
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Please sign in to view your bookings.",
        },
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
        {
          success: false,
          error: "Your session has expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    const customerId = customerResult.rows[0].id;

    // 2. Retrieve all bookings belonging to this customer.
    const bookingResult = await db.query(
      `SELECT
         b.id,
         b.booking_reference,
         b.society_name_snapshot,
         b.service_name_snapshot,
         b.booking_date::text AS booking_date,
         b.start_time::text AS start_time,
         b.end_time::text AS end_time,
         b.vehicle_type,
         b.vehicle_details,
         b.base_service_price,
         b.vehicle_surcharge,
         b.total_amount,
         b.currency,
         b.booking_status,
         b.payment_method,
         b.payment_status,
         b.confirmed_at,
         b.created_at
       FROM public.bookings b
       WHERE b.customer_id = $1
       ORDER BY
         b.booking_date DESC,
         b.start_time DESC,
         b.created_at DESC`,
      [customerId]
    );

    // 3. Format the records for the customer-facing page.
    const bookings = bookingResult.rows.map((booking) => ({
      id: booking.id,
      bookingReference: booking.booking_reference,
      society: booking.society_name_snapshot,
      service: booking.service_name_snapshot,
      date: booking.booking_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      vehicle: booking.vehicle_type,
      vehicleDetails: booking.vehicle_details,
      amount: Number(booking.total_amount),
      baseServicePrice: Number(booking.base_service_price),
      vehicleSurcharge: Number(booking.vehicle_surcharge),
      currency: booking.currency,
      bookingStatus: booking.booking_status,
      paymentMethod: booking.payment_method,
      paymentStatus: booking.payment_status,
      confirmedAt: booking.confirmed_at,
      createdAt: booking.created_at,
    }));

    return NextResponse.json({
      success: true,
      bookings,
      count: bookings.length,
    });
  } catch (error) {
    console.error("Customer bookings retrieval failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to retrieve your bookings. Please try again.",
      },
      { status: 500 }
    );
  }
}
