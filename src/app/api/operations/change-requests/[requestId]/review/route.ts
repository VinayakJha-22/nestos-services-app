import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperationsUser, getOperationsSocietyIds, } from "@/lib/operations/auth";
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_ZONE = "Asia/Kolkata";
const SLOT_INTERVAL_MINUTES = 30;
function addDays(date: string, days: number): string {
    const [year, month, day] = date.split("-").map(Number);
    const result = new Date(Date.UTC(year, month - 1, day + days));
    return [
        result.getUTCFullYear(),
        String(result.getUTCMonth() + 1).padStart(2, "0"),
        String(result.getUTCDate()).padStart(2, "0"),
    ].join("-");
}
function addMinutes(time: string, minutes: number): string {
    const [hours, mins] = time.split(":").map(Number);
    const total = hours * 60 + mins + minutes;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function isValidCalendarDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day);
}
export async function PATCH(request: NextRequest, context: {
    params: Promise<{
        requestId: string;
    }>;
}) {
    const user = await getOperationsUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { requestId } = await context.params;
    if (!uuidRegex.test(requestId)) {
        return NextResponse.json({ error: "Invalid change request ID" }, { status: 400 });
    }
    let body: {
        decision?: string;
        reviewNotes?: string;
    };
    try {
        body = await request.json();
    }
    catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const decision = body.decision;
    const reviewNotes = typeof body.reviewNotes === "string" ? body.reviewNotes.trim() : "";
    if (!["approve", "reject"].includes(decision ?? "")) {
        return NextResponse.json({ error: "Decision must be approve or reject" }, { status: 400 });
    }
    if (reviewNotes.length > 1000) {
        return NextResponse.json({ error: "Review notes cannot exceed 1000 characters" }, { status: 400 });
    }
    const client = await db.connect();
    try {
        await client.query("BEGIN");
        let refundRequestId: string | null = null;
        let refundAmountPaise = 0;
        // 1. Lock the change request.
        const requestResult = await client.query(`SELECT
id,
booking_id,
request_type,
requested_booking_date::text AS requested_booking_date,
TO_CHAR(requested_start_time, 'HH24:MI') AS requested_start_time,
request_status
FROM public.booking_change_requests
WHERE id = $1
FOR UPDATE`, [requestId]);
        const changeRequest = requestResult.rows[0];
        if (!changeRequest) {
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "Change request not found" }, { status: 404 });
        }
        if (changeRequest.request_status !== "pending") {
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "This change request has already been reviewed" }, { status: 409 });
        }
        // 2. Lock the associated booking.
        const bookingResult = await client.query(`SELECT
id,
society_id,
service_id,
booking_status,
booking_date::text AS booking_date,
TO_CHAR(start_time, 'HH24:MI') AS start_time,
TO_CHAR(end_time, 'HH24:MI') AS end_time
FROM public.bookings
WHERE id = $1
FOR UPDATE`, [changeRequest.booking_id]);
        const booking = bookingResult.rows[0];
        if (!booking) {
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "Associated booking not found" }, { status: 404 });
        }
        // 3. Verify society access.
        const societyIds = await getOperationsSocietyIds(user);
        if (!societyIds.includes(booking.society_id)) {
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "You do not have access to this society" }, { status: 403 });
        }
        const changedByType = user.role === "central_admin" ? "admin" : "manager";
        // 4. Rejection does not modify the booking.
        if (decision === "reject") {
            await client.query(`UPDATE public.booking_change_requests
SET
request_status = 'rejected',
reviewed_by_operations_user_id = $2,
reviewed_at = NOW(),
review_notes = $3,
updated_at = NOW()
WHERE id = $1`, [requestId, user.id, reviewNotes || null]);
            await client.query(`INSERT INTO public.operations_audit_log (
actor_user_id,
society_id,
action,
entity_type,
entity_id,
details
)
VALUES ($1, $2, $3, $4, $5, $6::jsonb)`, [
                user.id,
                booking.society_id,
                "booking_change_request_rejected",
                "booking_change_request",
                requestId,
                JSON.stringify({
                    bookingId: booking.id,
                    requestType: changeRequest.request_type,
                    changedByRole: user.role,
                    reviewNotes: reviewNotes || null,
                }),
            ]);
            await client.query("COMMIT");
            return NextResponse.json({
                success: true,
                requestId,
                decision: "rejected",
            });
        }
        // 5. Only confirmed or assigned bookings can be changed.
        if (!["confirmed", "assigned"].includes(booking.booking_status)) {
            await client.query("ROLLBACK");
            return NextResponse.json({
                error: "This booking can no longer be changed",
            }, { status: 409 });
        }
        if (changeRequest.request_type === "cancellation") {
            // 6. Approve cancellation and release its reservation.
            const cancellationResult = await client.query(`UPDATE public.bookings
SET
booking_status = 'cancelled',
cancelled_at = NOW(),
updated_at = NOW()
WHERE id = $1
AND booking_status IN ('confirmed', 'assigned')
RETURNING id`, [booking.id]);
            if (cancellationResult.rowCount !== 1) {
                throw new Error("Unable to cancel the booking.");
            }
            await client.query(`UPDATE public.booking_slot_reservations
SET
status = 'released',
released_at = NOW()
WHERE booking_id = $1
AND status IN ('active', 'converted')`, [booking.id]);
            // Create a full refund request for a captured online payment.
            // Subscription-credit bookings have no booking payment order,
            // so they do not enter the cash-refund flow.
            const paymentOrderResult = await client.query(`SELECT
id,
amount_paise,
currency,
razorpay_payment_id
FROM public.booking_payment_orders
WHERE booking_id = $1
AND status = 'paid'
AND razorpay_payment_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 1
FOR UPDATE`, [booking.id]);
            const paymentOrder = paymentOrderResult.rows[0];
            if (paymentOrder) {
                // Check previous refund requests to avoid duplicate or
                // excessive refunds for the same captured payment.
                const existingRefundsResult = await client.query(`SELECT id, status, refund_amount_paise
FROM public.payment_refund_requests
WHERE booking_payment_order_id = $1
FOR UPDATE`, [paymentOrder.id]);
                const existingRefunds = existingRefundsResult.rows;
                const activeRefund = existingRefunds.find((refund) => ["pending", "approved", "processing"].includes(refund.status));
                if (activeRefund) {
                    // Reuse an already-active request instead of creating a duplicate.
                    refundRequestId = activeRefund.id;
                    refundAmountPaise = Number(activeRefund.refund_amount_paise);
                    if (!Number.isSafeInteger(refundAmountPaise) ||
                        refundAmountPaise <= 0) {
                        throw new Error("Invalid active refund request amount.");
                    }
                }
                else {
                    const alreadyRefundedPaise = existingRefunds
                        .filter((refund) => refund.status === "processed")
                        .reduce((total, refund) => total + Number(refund.refund_amount_paise), 0);
                    const capturedAmountPaise = Number(paymentOrder.amount_paise);
                    if (!Number.isSafeInteger(capturedAmountPaise) ||
                        capturedAmountPaise <= 0 ||
                        !Number.isSafeInteger(alreadyRefundedPaise) ||
                        alreadyRefundedPaise < 0 ||
                        alreadyRefundedPaise > capturedAmountPaise) {
                        throw new Error("Invalid captured or previously refunded payment amount.");
                    }
                    refundAmountPaise = capturedAmountPaise - alreadyRefundedPaise;
                    if (refundAmountPaise > 0) {
                        const refundResult = await client.query(`INSERT INTO public.payment_refund_requests (
         booking_payment_order_id,
         society_id,
         refund_amount_paise,
         currency,
         customer_reason,
         request_source,
         status,
         idempotency_key
       )
       VALUES ($1, $2, $3, $4, $5, 'operations', 'pending', $6)
       RETURNING id`, [
                            paymentOrder.id,
                            booking.society_id,
                            refundAmountPaise,
                            paymentOrder.currency,
                            `Approved booking cancellation. ${reviewNotes || "Full refund requested."}`,
                            `booking-cancellation:${requestId}`,
                        ]);
                        refundRequestId = refundResult.rows[0].id;
                    }
                }
                if (refundRequestId) {
                    await client.query(`UPDATE public.booking_payment_orders
                         SET status = 'refund_pending', updated_at = NOW()
                         WHERE id = $1 AND status = 'paid'`, [paymentOrder.id]);
                    await client.query(`UPDATE public.bookings
                         SET payment_status = 'refund_pending', updated_at = NOW()
                         WHERE id = $1`, [booking.id]);
                }
            }
            await client.query(`INSERT INTO public.booking_status_history (
booking_id,
previous_status,
new_status,
changed_by_type,
changed_by_reference,
notes
)
VALUES ($1, $2, 'cancelled', $3, $4, $5)`, [
                booking.id,
                booking.booking_status,
                changedByType,
                user.userReference,
                reviewNotes || "Cancellation request approved through Operations",
            ]);
        }
        else if (changeRequest.request_type === "reschedule") {
            // 7. Validate requested appointment details.
            const newDate = changeRequest.requested_booking_date as string;
            const newStartTime = changeRequest.requested_start_time as string;
            if (!newDate ||
                !newStartTime ||
                !isValidCalendarDate(newDate) ||
                !/^([01]\d|2[0-3]):[0-5]\d$/.test(newStartTime)) {
                await client.query("ROLLBACK");
                return NextResponse.json({ error: "Invalid requested appointment details" }, { status: 400 });
            }
            const [, newMinutes] = newStartTime.split(":").map(Number);
            if (newMinutes % SLOT_INTERVAL_MINUTES !== 0) {
                await client.query("ROLLBACK");
                return NextResponse.json({ error: "Requested time is not a valid booking slot" }, { status: 409 });
            }
            const [year, month, day] = newDate.split("-").map(Number);
            const parsedDate = new Date(Date.UTC(year, month - 1, day));
            const dayOfWeek = parsedDate.getUTCDay();
            // 8. Serialize all booking changes for this society/date.
            await client.query(`SELECT pg_advisory_xact_lock(
hashtext($1),
hashtext($2)
)`, [booking.society_id, newDate]);
            // 9. Load service duration, society hours and booking horizon.
            const configResult = await client.query(`SELECT
svc.duration_minutes,
bs.booking_horizon_days,
oh.is_open,
oh.closes_at::text AS closes_at
FROM public.services svc
INNER JOIN public.society_booking_settings bs
ON bs.society_id = $2
INNER JOIN public.society_operating_hours oh
ON oh.society_id = $2
AND oh.day_of_week = $3
WHERE svc.id = $1`, [booking.service_id, booking.society_id, dayOfWeek]);
            if (configResult.rows.length === 0) {
                await client.query("ROLLBACK");
                return NextResponse.json({ error: "Booking configuration not found for this society" }, { status: 409 });
            }
            const config = configResult.rows[0];
            if (!config.is_open) {
                await client.query("ROLLBACK");
                return NextResponse.json({ error: "Society is closed on the requested date" }, { status: 409 });
            }
            // 10. Validate the booking horizon and local time.
            const clockResult = await client.query(`SELECT
(NOW() AT TIME ZONE '${TIME_ZONE}')::date::text AS today,
TO_CHAR(
NOW() AT TIME ZONE '${TIME_ZONE}',
'HH24:MI'
) AS local_time`);
            const today = clockResult.rows[0].today as string;
            const localTime = clockResult.rows[0].local_time as string;
            const lastBookingDate = addDays(today, Number(config.booking_horizon_days) - 1);
            if (newDate < today ||
                newDate > lastBookingDate ||
                (newDate === today && newStartTime <= localTime)) {
                await client.query("ROLLBACK");
                return NextResponse.json({ error: "Requested date or time is outside the booking window" }, { status: 409 });
            }
            // 11. Preserve the original service duration.
            const durationMinutes = Number(config.duration_minutes);
            if (!Number.isInteger(durationMinutes) ||
                durationMinutes <= 0 ||
                durationMinutes % SLOT_INTERVAL_MINUTES !== 0) {
                throw new Error("Invalid service duration configuration.");
            }
            const newEndTime = addMinutes(newStartTime, durationMinutes);
            if (newEndTime > String(config.closes_at).slice(0, 5)) {
                await client.query("ROLLBACK");
                return NextResponse.json({ error: "Requested service would finish after closing time" }, { status: 409 });
            }
            // 12. Find and lock the current converted reservation.
            const reservationResult = await client.query(`SELECT id
FROM public.booking_slot_reservations
WHERE booking_id = $1
AND status = 'converted'
ORDER BY created_at DESC
LIMIT 1
FOR UPDATE`, [booking.id]);
            if (reservationResult.rows.length === 0) {
                await client.query("ROLLBACK");
                return NextResponse.json({ error: "The booking's active slot reservation was not found" }, { status: 409 });
            }
            const reservationId = reservationResult.rows[0].id;
            // 13. Validate capacity for every 30-minute segment.
            let firstSlotId: string | null = null;
            for (let offset = 0; offset < durationMinutes; offset += SLOT_INTERVAL_MINUTES) {
                const segmentStart = addMinutes(newStartTime, offset);
                const slotResult = await client.query(`SELECT id, capacity_per_slot
FROM public.society_time_slots
WHERE society_id = $1
AND day_of_week = $2
AND start_time = $3::time
AND is_active = TRUE
LIMIT 1`, [booking.society_id, dayOfWeek, segmentStart]);
                if (slotResult.rows.length === 0) {
                    await client.query("ROLLBACK");
                    return NextResponse.json({ error: "One or more requested booking slots are unavailable" }, { status: 409 });
                }
                const slot = slotResult.rows[0];
                if (offset === 0) {
                    firstSlotId = slot.id;
                }
                const occupancyResult = await client.query(`SELECT COUNT(DISTINCT busy.booking_id)::int AS occupied
FROM (
SELECT
b.id AS booking_id,
b.start_time,
b.end_time
FROM public.bookings b
WHERE b.society_id = $1
AND b.booking_date = $2
AND b.id <> $4
AND b.booking_status IN (
'confirmed',
'assigned',
'in_progress'
)
UNION ALL
SELECT
r.booking_id,
r.start_time,
r.end_time
FROM public.booking_slot_reservations r
INNER JOIN public.bookings b
ON b.id = r.booking_id
WHERE r.society_id = $1
AND r.booking_date = $2
AND r.booking_id <> $4
AND (
(
r.status = 'active'
AND r.expires_at > NOW()
AND b.booking_status = 'pending_payment'
)
OR
(
r.status = 'converted'
AND b.booking_status IN (
'confirmed',
'assigned',
'in_progress'
)
)
)
) busy
WHERE busy.start_time < (
$3::time + INTERVAL '30 minutes'
)
AND busy.end_time > $3::time`, [booking.society_id, newDate, segmentStart, booking.id]);
                const occupied = Number(occupancyResult.rows[0].occupied);
                const capacity = Number(slot.capacity_per_slot);
                if (occupied >= capacity) {
                    await client.query("ROLLBACK");
                    return NextResponse.json({
                        error: "Requested appointment is no longer available",
                    }, { status: 409 });
                }
            }
            if (!firstSlotId) {
                throw new Error("Unable to identify the requested starting slot.");
            }
            // 14. Move the booking and its reservation atomically.
            await client.query(`UPDATE public.bookings
SET
booking_date = $2,
start_time = $3::time,
end_time = $4::time,
updated_at = NOW()
WHERE id = $1`, [booking.id, newDate, newStartTime, newEndTime]);
            await client.query(`UPDATE public.booking_slot_reservations
SET
society_time_slot_id = $2,
booking_date = $3,
start_time = $4::time,
end_time = $5::time
WHERE id = $1
AND status = 'converted'`, [reservationId, firstSlotId, newDate, newStartTime, newEndTime]);
        }
        else {
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "Unsupported change request type" }, { status: 400 });
        }
        // 15. Mark the request as approved.
        await client.query(`UPDATE public.booking_change_requests
SET
request_status = 'approved',
reviewed_by_operations_user_id = $2,
reviewed_at = NOW(),
review_notes = $3,
updated_at = NOW()
WHERE id = $1`, [requestId, user.id, reviewNotes || null]);
        // 16. Record the operations audit event.
        await client.query(`INSERT INTO public.operations_audit_log (
actor_user_id,
society_id,
action,
entity_type,
entity_id,
details
)
VALUES ($1, $2, $3, $4, $5, $6::jsonb)`, [
            user.id,
            booking.society_id,
            `booking_${changeRequest.request_type}_approved`,
            "booking_change_request",
            requestId,
            JSON.stringify({
                bookingId: booking.id,
                requestType: changeRequest.request_type,
                previousDate: booking.booking_date,
                previousStartTime: booking.start_time,
                requestedDate: changeRequest.requested_booking_date,
                requestedStartTime: changeRequest.requested_start_time,
                changedByRole: user.role,
                reviewNotes: reviewNotes || null,
                refundRequestId: changeRequest.request_type === "cancellation"
                    ? refundRequestId
                    : null,
                refundAmountPaise: changeRequest.request_type === "cancellation"
                    ? refundAmountPaise
                    : 0,
            }),
        ]);
        await client.query("COMMIT");
        return NextResponse.json({
            success: true,
            requestId,
            bookingId: booking.id,
            decision: "approved",
            requestType: changeRequest.request_type,
            refundRequestId: changeRequest.request_type === "cancellation"
                ? refundRequestId
                : null,
            refundAmountPaise: changeRequest.request_type === "cancellation"
                ? refundAmountPaise
                : 0,
        });
    }
    catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        console.error("Change request review failed:", error);
        return NextResponse.json({ error: "Unable to review this change request" }, { status: 500 });
    }
    finally {
        client.release();
    }
}
