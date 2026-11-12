
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getOperationsUser,
  getOperationsSocietyIds,
} from "@/lib/operations/auth";

const validTransitions: Record<string, string[]> = {
  confirmed: ["assigned", "cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  pending_payment: [],
  expired: [],
};

const validStatuses = [
  "confirmed",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
];

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  const client = await db.connect();

  try {
    const user = await getOperationsUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { bookingId } = await context.params;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
      return NextResponse.json(
        { error: "Invalid booking ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const newStatus = body.status;

    if (
      typeof newStatus !== "string" ||
      !validStatuses.includes(newStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid booking status" },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    const bookingResult = await client.query(
      `SELECT id, society_id, booking_status
       FROM public.bookings
       WHERE id = $1
       FOR UPDATE`,
      [bookingId],
    );

    const booking = bookingResult.rows[0];

    if (!booking) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 },
      );
    }

    const societyIds = await getOperationsSocietyIds(user);

    if (!societyIds.includes(booking.society_id)) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { error: "You do not have access to this society" },
        { status: 403 },
      );
    }

    const currentStatus = booking.booking_status;

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          error: `Cannot change booking status from ${currentStatus} to ${newStatus}`,
        },
        { status: 409 },
      );
    }

    const changedByType =
      user.role === "central_admin" ? "admin" : "manager";

    await client.query(
      `UPDATE public.bookings
       SET
         booking_status = $2,
         updated_at = NOW(),
         cancelled_at = CASE
           WHEN $2 = 'cancelled' THEN NOW()
           ELSE cancelled_at
         END
       WHERE id = $1`,
      [bookingId, newStatus],
    );

    await client.query(
      `INSERT INTO public.booking_status_history (
         booking_id,
         previous_status,
         new_status,
         changed_by_type,
         changed_by_reference,
         notes
       )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        bookingId,
        currentStatus,
        newStatus,
        changedByType,
        user.userReference,
        "Updated through Operations CRM",
      ],
    );

    await client.query(
      `INSERT INTO public.operations_audit_log (
         actor_user_id,
         society_id,
         action,
         entity_type,
         entity_id,
         details
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        user.id,
        booking.society_id,
        "booking_status_updated",
        "booking",
        bookingId,
        JSON.stringify({
          previousStatus: currentStatus,
          newStatus,
          changedByRole: user.role,
        }),
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      bookingId,
      previousStatus: currentStatus,
      newStatus,
    });
  } catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch (rollbackError) {
    console.error("Booking status rollback error:", rollbackError);
  }

  console.error("Booking status update error:", error);

    return NextResponse.json(
      { error: "Unable to update booking status" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
