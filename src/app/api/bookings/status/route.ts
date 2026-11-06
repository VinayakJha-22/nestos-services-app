
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    // 1. Validate customer session.
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Please sign in to view your booking.",
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

    const customer = customerResult.rows[0];

    // 2. Validate booking ID.
    const bookingId = request.nextUrl.searchParams.get("bookingId");

    if (!bookingId || !uuidRegex.test(bookingId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid booking reference.",
        },
        { status: 400 }
      );
    }

    // 3. Retrieve booking belonging to this customer only.
    const bookingResult = await db.query(
      `SELECT
         b.id,
         b.booking_reference,
         b.society_name_snapshot,
         b.service_name_snapshot,
         b.booking_date::text AS booking_date,
         b.start_time,
         b.end_time,
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
       WHERE b.id = $1
         AND b.customer_id = $2
       LIMIT 1`,
      [bookingId, customer.id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Booking not found.",
        },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // 4. Return the current server-side booking and payment status.
    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        bookingReference: booking.booking_reference,
        societyName: booking.society_name_snapshot,
        serviceName: booking.service_name_snapshot,
        date: booking.booking_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        vehicleType: booking.vehicle_type,
        vehicleDetails: booking.vehicle_details,
        pricing: {
          baseServicePrice: Number(booking.base_service_price),
          vehicleSurcharge: Number(booking.vehicle_surcharge),
          totalAmount: Number(booking.total_amount),
          currency: booking.currency,
        },
        bookingStatus: booking.booking_status,
        paymentMethod: booking.payment_method,
        paymentStatus: booking.payment_status,
        confirmedAt: booking.confirmed_at,
        createdAt: booking.created_at,
      },
    });
  } catch (error) {
    console.error("Booking status retrieval failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to retrieve booking status. Please try again.",
      },
      { status: 500 }
    );
  }
}
