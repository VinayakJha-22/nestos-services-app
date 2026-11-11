
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getOperationsUser,
  getOperationsSocietyIds,
} from "@/lib/operations/auth";

const validStatuses = [
  "pending_payment",
  "confirmed",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
  "expired",
];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const user = await getOperationsUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const societyIds = await getOperationsSocietyIds(user);

    if (societyIds.length === 0) {
      return NextResponse.json({ bookings: [] });
    }

    const params = request.nextUrl.searchParams;
    const societyId = params.get("societyId");
    const status = params.get("status");
    const fromDate = params.get("from");
    const toDate = params.get("to");

    if (societyId && !uuidPattern.test(societyId)) {
      return NextResponse.json(
        { error: "Invalid society ID" },
        { status: 400 },
      );
    }

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid booking status" },
        { status: 400 },
      );
    }

    if (
      (fromDate && !datePattern.test(fromDate)) ||
      (toDate && !datePattern.test(toDate))
    ) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 },
      );
    }

    if (societyId && !societyIds.includes(societyId)) {
      return NextResponse.json(
        { error: "You do not have access to this society" },
        { status: 403 },
      );
    }

    const values: unknown[] = [societyIds];
    const conditions = ["b.society_id = ANY($1::uuid[])"];

    if (societyId) {
      values.push(societyId);
      conditions.push(`b.society_id = $${values.length}::uuid`);
    }

    if (status) {
      values.push(status);
      conditions.push(`b.booking_status = $${values.length}`);
    }

    if (fromDate) {
      values.push(fromDate);
      conditions.push(`b.booking_date >= $${values.length}::date`);
    }

    if (toDate) {
      values.push(toDate);
      conditions.push(`b.booking_date <= $${values.length}::date`);
    }

    const result = await db.query(
      `SELECT
         b.id,
         b.booking_reference,
         b.society_id,
         b.society_name_snapshot,
         b.customer_id,
         c.full_name AS customer_name,
         c.verified_phone AS customer_phone,
         b.service_id,
         b.service_name_snapshot,
         b.booking_date,
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
         b.booking_source,
         b.responsible_party_type,
         b.responsible_party_reference,
         b.responsible_party_name_snapshot,
         b.created_at,
         b.updated_at
       FROM public.bookings b
       INNER JOIN public.customers c
         ON c.id = b.customer_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY b.booking_date DESC, b.start_time DESC
       LIMIT 200`,
      values,
    );

    return NextResponse.json({
      bookings: result.rows,
    });
  } catch (error) {
    console.error("Operations bookings API error:", error);

    return NextResponse.json(
      { error: "Unable to fetch bookings" },
      { status: 500 },
    );
  }
}
