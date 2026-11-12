
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidDate(value: string): boolean {
  if (!datePattern.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export async function POST(request: NextRequest) {
  let client;

  try {
    // 1. Validate customer session.
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
        { success: false, error: "Your session has expired. Please sign in again." },
        { status: 401 },
      );
    }

    const customerId = customerResult.rows[0].id;

    // 2. Validate request body.
    const body = await request.json();

    const bookingId = body.bookingId;
    const requestType = body.requestType;
    const customerNotes =
      typeof body.customerNotes === "string"
        ? body.customerNotes.trim()
        : "";

    const requestedDate = body.requestedBookingDate;
    const requestedTime = body.requestedStartTime;

    if (
      typeof bookingId !== "string" ||
      !uuidPattern.test(bookingId)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid booking ID." },
        { status: 400 },
      );
    }

    if (!["cancellation", "reschedule"].includes(requestType)) {
      return NextResponse.json(
        { success: false, error: "Invalid request type." },
        { status: 400 },
      );
    }

    if (
      customerNotes.length < 1 ||
      customerNotes.length > 1000
    ) {
      return NextResponse.json(
        { success: false, error: "Please provide a reason of up to 1000 characters." },
        { status: 400 },
      );
    }

    if (requestType === "reschedule") {
      if (
        typeof requestedDate !== "string" ||
        !isValidDate(requestedDate) ||
        typeof requestedTime !== "string" ||
        !timePattern.test(requestedTime)
      ) {
        return NextResponse.json(
          { success: false, error: "Please provide a valid proposed date and time." },
          { status: 400 },
        );
      }
    }

    if (
      requestType === "cancellation" &&
      (requestedDate != null || requestedTime != null)
    ) {
      return NextResponse.json(
        { success: false, error: "Cancellation requests cannot include a proposed date or time." },
        { status: 400 },
      );
    }

    // 3. Lock booking and create the request atomically.
    client = await db.connect();
    await client.query("BEGIN");

    const bookingResult = await client.query(
      `SELECT
         id,
         society_id,
         booking_status
       FROM public.bookings
       WHERE id = $1
         AND customer_id = $2
       FOR UPDATE`,
      [bookingId, customerId],
    );

    const booking = bookingResult.rows[0];

    if (!booking) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, error: "Booking not found." },
        { status: 404 },
      );
    }

    if (!["confirmed", "assigned"].includes(booking.booking_status)) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          error: "A change request cannot be submitted for this booking status.",
        },
        { status: 409 },
      );
    }

    const insertResult = await client.query(
      `INSERT INTO public.booking_change_requests (
         booking_id,
         request_type,
         requested_booking_date,
         requested_start_time,
         customer_notes
       )
       VALUES (
         $1,
         $2,
         $3::date,
         $4::time,
         $5
       )
       RETURNING
         id,
         booking_id,
         request_type,
         requested_booking_date,
         requested_start_time,
         customer_notes,
         request_status,
         created_at`,
      [
        bookingId,
        requestType,
        requestType === "reschedule" ? requestedDate : null,
        requestType === "reschedule" ? requestedTime : null,
        customerNotes,
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Your request has been submitted for review.",
        request: insertResult.rows[0],
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Change request rollback error:", rollbackError);
      }
    }

    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          error: "There is already a pending change request for this booking.",
        },
        { status: 409 },
      );
    }

    console.error("Customer change request API error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to submit your request. Please try again." },
      { status: 500 },
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
