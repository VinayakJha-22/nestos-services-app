
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getOperationsUser,
  getOperationsSocietyIds,
} from "@/lib/operations/auth";

const validTypes = ["all", "booking", "package"];
const validStatuses = [
  "all",
  "paid",
  "pending_payment",
  "failed",
  "refund_pending",
  "refunded",
  "cancelled",
];

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const user = await getOperationsUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const societyIds = await getOperationsSocietyIds(user);

    if (societyIds.length === 0) {
      return NextResponse.json({
        payments: [],
        summary: {
          totalRecords: 0,
          collectedAmount: 0,
          pendingCount: 0,
          failedCount: 0,
          refundPendingCount: 0,
        },
      });
    }

    const params = request.nextUrl.searchParams;
    const type = params.get("type") ?? "all";
    const status = params.get("status") ?? "all";
    const search = params.get("search")?.trim() ?? "";
    const fromDate = params.get("from");
    const toDate = params.get("to");

    if (!validTypes.includes(type) || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid payment filter." },
        { status: 400 }
      );
    }

    if (
      (fromDate && !datePattern.test(fromDate)) ||
      (toDate && !datePattern.test(toDate))
    ) {
      return NextResponse.json(
        { error: "Invalid date. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const values: unknown[] = [societyIds];
    const conditions = ["p.society_id = ANY($1::uuid[])"];

    if (type !== "all") {
      values.push(type);
      conditions.push(`p.payment_type = $${values.length}`);
    }

    if (status !== "all") {
      values.push(status);
      conditions.push(`p.status = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      const index = values.length;
      conditions.push(`(
        p.customer_name ILIKE $${index}
        OR p.customer_phone ILIKE $${index}
        OR p.booking_reference ILIKE $${index}
        OR p.razorpay_order_id ILIKE $${index}
        OR COALESCE(p.razorpay_payment_id, '') ILIKE $${index}
        OR p.society_name ILIKE $${index}
        OR p.package_name ILIKE $${index}
      )`);
    }

    if (fromDate) {
      values.push(fromDate);
      conditions.push(`p.created_at >= $${values.length}::date`);
    }

    if (toDate) {
      values.push(toDate);
      conditions.push(
        `p.created_at < ($${values.length}::date + INTERVAL '1 day')`
      );
    }

    const result = await db.query(
      `WITH payment_records AS (
        SELECT
          'booking'::text AS payment_type,
          po.id::text AS record_id,
          b.id::text AS booking_id,
          b.booking_reference,
          c.full_name AS customer_name,
          c.verified_phone AS customer_phone,
          b.society_id,
          b.society_name_snapshot AS society_name,
          b.service_name_snapshot AS description,
          NULL::text AS package_name,
          po.amount_paise::numeric / 100 AS amount,
          po.currency,
          po.status,
          po.razorpay_order_id,
          po.razorpay_payment_id,
          po.failure_reason,
          po.created_at,
          po.paid_at
        FROM public.booking_payment_orders po
        INNER JOIN public.bookings b
          ON b.id = po.booking_id
        INNER JOIN public.customers c
          ON c.id = b.customer_id

        UNION ALL

        SELECT
          'package'::text AS payment_type,
          po.id::text AS record_id,
          NULL::text AS booking_id,
          NULL::text AS booking_reference,
          c.full_name AS customer_name,
          c.verified_phone AS customer_phone,
          po.society_id,
          s.name AS society_name,
          'Prepaid subscription purchase'::text AS description,
          po.package_name_snapshot AS package_name,
          po.price_snapshot::numeric AS amount,
          po.currency,
          po.status,
          po.razorpay_order_id,
          po.razorpay_payment_id,
          NULL::text AS failure_reason,
          po.created_at,
          po.paid_at
        FROM public.package_purchase_orders po
        INNER JOIN public.customers c
          ON c.id = po.customer_id
        INNER JOIN public.societies s
          ON s.id = po.society_id
      )
      SELECT *
      FROM payment_records p
      WHERE ${conditions.join(" AND ")}
      ORDER BY p.created_at DESC
      LIMIT 500`,
      values
    );

    const payments = result.rows;

    const summary = payments.reduce(
      (acc, payment) => {
        acc.totalRecords += 1;

        if (payment.status === "paid") {
          acc.collectedAmount += Number(payment.amount);
        }

        if (payment.status === "pending_payment") {
          acc.pendingCount += 1;
        }

        if (
          payment.status === "failed" ||
          payment.status === "payment_failed"
        ) {
          acc.failedCount += 1;
        }

        if (payment.status === "refund_pending") {
          acc.refundPendingCount += 1;
        }

        return acc;
      },
      {
        totalRecords: 0,
        collectedAmount: 0,
        pendingCount: 0,
        failedCount: 0,
        refundPendingCount: 0,
      }
    );

    return NextResponse.json({
      payments,
      summary,
    });
  } catch (error) {
    console.error("Operations payments API error:", error);

    return NextResponse.json(
      { error: "Unable to fetch payment records." },
      { status: 500 }
    );
  }
}
