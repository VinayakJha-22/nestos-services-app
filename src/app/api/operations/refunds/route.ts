
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getOperationsUser,
  getOperationsSocietyIds,
} from "@/lib/operations/auth";

export async function GET() {
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
      return NextResponse.json({ refunds: [] });
    }

    const result = await db.query(
      `SELECT
         r.id,
         r.booking_payment_order_id,
         r.package_purchase_order_id,
         r.society_id,
         r.refund_amount_paise,
         r.currency,
         r.customer_reason,
         r.request_source,
         r.status,
         r.reviewed_by,
         r.reviewed_at,
         r.decision_notes,
         r.razorpay_refund_id,
         r.processed_at,
         r.failure_reason,
         r.created_at,
         r.updated_at,

         CASE
           WHEN r.booking_payment_order_id IS NOT NULL
             THEN 'booking'
           ELSE 'package'
         END AS payment_type,

         b.id AS booking_id,
         b.booking_reference,

         COALESCE(bc.full_name, pc.full_name) AS customer_name,
         COALESCE(bc.verified_phone, pc.verified_phone) AS customer_phone,

         COALESCE(b.society_name_snapshot, s.name) AS society_name,

         COALESCE(
           b.service_name_snapshot,
           ppo.package_name_snapshot,
           'Payment'
         ) AS payment_description,

         COALESCE(
           bpo.razorpay_payment_id,
           ppo.razorpay_payment_id
         ) AS razorpay_payment_id,

         CASE
           WHEN r.booking_payment_order_id IS NOT NULL
             THEN bpo.amount_paise
           ELSE ROUND(ppo.price_snapshot * 100)::bigint
         END AS original_amount_paise

       FROM public.payment_refund_requests r

       LEFT JOIN public.booking_payment_orders bpo
         ON bpo.id = r.booking_payment_order_id

       LEFT JOIN public.bookings b
         ON b.id = bpo.booking_id

       LEFT JOIN public.customers bc
         ON bc.id = b.customer_id

       LEFT JOIN public.package_purchase_orders ppo
         ON ppo.id = r.package_purchase_order_id

       LEFT JOIN public.customers pc
         ON pc.id = ppo.customer_id

       LEFT JOIN public.societies s
         ON s.id = r.society_id

       WHERE r.society_id = ANY($1::uuid[])

       ORDER BY r.created_at DESC
       LIMIT 500`,
      [societyIds]
    );

    return NextResponse.json({
      refunds: result.rows,
    });
  } catch (error) {
    console.error("Operations refunds API error:", error);

    return NextResponse.json(
      { error: "Unable to fetch refund requests." },
      { status: 500 }
    );
  }
}
