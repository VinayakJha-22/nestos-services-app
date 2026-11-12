
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getOperationsUser,
  getOperationsSocietyIds,
} from "@/lib/operations/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    // 1. Authenticate the operations user
    const user = await getOperationsUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. Validate the booking UUID
    const { bookingId } = await context.params;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bookingId,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid booking ID" },
        { status: 400 },
      );
    }

    // 3. Find the booking and its society
    const bookingResult = await db.query(
      `SELECT id, society_id
       FROM public.bookings
       WHERE id = $1
       LIMIT 1`,
      [bookingId],
    );

    const booking = bookingResult.rows[0];

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 },
      );
    }

    // 4. Enforce society-level access
    const societyIds = await getOperationsSocietyIds(user);

    if (!societyIds.includes(booking.society_id)) {
      return NextResponse.json(
        { error: "You do not have access to this society" },
        { status: 403 },
      );
    }

    // 5. Fetch the booking's actual status history
    const historyResult = await db.query(
      `SELECT
         h.id,
         h.previous_status,
         h.new_status,
         h.changed_by_type,
         h.changed_by_reference,
         h.notes,
         h.created_at,
         u.full_name AS actor_name
       FROM public.booking_status_history AS h
       LEFT JOIN public.operations_users AS u
         ON u.user_reference = h.changed_by_reference
       WHERE h.booking_id = $1
       ORDER BY h.created_at DESC`,
      [bookingId],
    );

    const activities = historyResult.rows.map((row) => ({
      id: row.id,
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      changedByType: row.changed_by_type,
      changedByReference: row.changed_by_reference,
      actorName:
        row.actor_name ||
        row.changed_by_reference ||
        row.changed_by_type,
      notes: row.notes,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Booking history fetch error:", error);

    return NextResponse.json(
      { error: "Unable to fetch booking history" },
      { status: 500 },
    );
  }
}
