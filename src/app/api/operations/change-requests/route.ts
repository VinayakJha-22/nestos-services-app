
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getOperationsUser,
  getOperationsSocietyIds,
} from "@/lib/operations/auth";

const validStatuses = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
];

const validTypes = ["cancellation", "reschedule"];

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
      return NextResponse.json({ requests: [] });
    }

    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const requestType = params.get("type");

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid request status." },
        { status: 400 },
      );
    }

    if (requestType && !validTypes.includes(requestType)) {
      return NextResponse.json(
        { error: "Invalid request type." },
        { status: 400 },
      );
    }

    const values: unknown[] = [societyIds];
    const conditions = [
      "b.society_id = ANY($1::uuid[])",
    ];

    if (status) {
      values.push(status);
      conditions.push(
        `r.request_status = $${values.length}`,
      );
    }

    if (requestType) {
      values.push(requestType);
      conditions.push(
        `r.request_type = $${values.length}`,
      );
    }

    const result = await db.query(
      `SELECT
         r.id,
         r.booking_id,
         r.request_type,
         r.requested_booking_date,
         TO_CHAR(
           r.requested_start_time,
           'HH24:MI'
         ) AS requested_start_time,
         r.customer_notes,
         r.request_status,
         r.reviewed_by_operations_user_id,
         reviewer.full_name AS reviewer_name,
         r.reviewed_at,
         r.review_notes,
         r.created_at,
         r.updated_at,

         b.booking_reference,
         b.booking_status,
         b.booking_date,
         TO_CHAR(b.start_time, 'HH24:MI') AS start_time,
         TO_CHAR(b.end_time, 'HH24:MI') AS end_time,
         b.society_id,
         b.society_name_snapshot,
         b.service_name_snapshot,
         b.vehicle_type,
         b.total_amount,
         b.payment_method,
         b.payment_status,

         c.full_name AS customer_name,
         c.verified_phone AS customer_phone

       FROM public.booking_change_requests r

       INNER JOIN public.bookings b
         ON b.id = r.booking_id

       INNER JOIN public.customers c
         ON c.id = b.customer_id

       LEFT JOIN public.operations_users reviewer
         ON reviewer.id = r.reviewed_by_operations_user_id

       WHERE ${conditions.join(" AND ")}

       ORDER BY
         CASE
           WHEN r.request_status = 'pending' THEN 0
           ELSE 1
         END,
         r.created_at DESC

       LIMIT 200`,
      values,
    );

    return NextResponse.json({
      requests: result.rows,
    });
  } catch (error) {
    console.error("Operations change requests API error:", error);

    return NextResponse.json(
      { error: "Unable to fetch change requests." },
      { status: 500 },
    );
  }
}
