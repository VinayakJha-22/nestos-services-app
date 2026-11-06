
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";
const TIME_ZONE = "Asia/Kolkata";
const SLOT_INTERVAL_MINUTES = 30;

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60,
  ).padStart(2, "0")}`;
}

export async function POST(request: NextRequest) {
  let client;

  try {
    // 1. Validate customer session
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
      `SELECT
         c.id,
         c.full_name,
         c.email,
         c.verified_phone
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
        {
          success: false,
          error: "Your session has expired. Please sign in again.",
        },
        { status: 401 },
      );
    }

    const customer = customerResult.rows[0];

    // 2. Validate request
    const body = await request.json();

    const societyId = body.societyId;
    const serviceId = body.serviceId;
    const bookingDate = body.date;
    const startTime = body.time;
    const vehicleType = body.vehicleType;
    const vehicleDetails =
      typeof body.vehicleDetails === "string"
        ? body.vehicleDetails.trim()
        : null;

    if (
      typeof societyId !== "string" ||
      !uuidRegex.test(societyId) ||
      typeof serviceId !== "string" ||
      !serviceId.trim() ||
      typeof bookingDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) ||
      typeof startTime !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
      !["hatchback", "sedan", "suv"].includes(vehicleType)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid booking information." },
        { status: 400 },
      );
    }

    if (
      vehicleDetails !== null &&
      vehicleDetails.length > 500
    ) {
      return NextResponse.json(
        { success: false, error: "Vehicle details are too long." },
        { status: 400 },
      );
    }

    const normalizedServiceId = serviceId.trim();

    const [hours, minutes] = startTime.split(":").map(Number);

    if (minutes % SLOT_INTERVAL_MINUTES !== 0) {
      return NextResponse.json(
        { success: false, error: "Please select a valid booking slot." },
        { status: 400 },
      );
    }

    // Validate that the date is a real calendar date.
    const [year, month, day] = bookingDate.split("-").map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid booking date." },
        { status: 400 },
      );
    }

    const dayOfWeek = parsedDate.getUTCDay();

    // 3. Start transaction and serialize reservations for this society/date.
    client = await db.connect();
    await client.query("BEGIN");

    try {
      await client.query(
        `SELECT pg_advisory_xact_lock(
           hashtext($1),
           hashtext($2)
         )`,
        [societyId, bookingDate],
      );

      // 4. Load society, service, operating hours and booking settings.
      const configResult = await client.query(
        `SELECT
           s.id AS society_id,
           s.name AS society_name,
           svc.id AS service_id,
           svc.name AS service_name,
           ss.price::text AS base_price,
           svc.duration_minutes,
           bs.reservation_expiry_minutes,
           bs.booking_horizon_days,
           oh.is_open,
           oh.opens_at::text AS opens_at,
           oh.closes_at::text AS closes_at
         FROM public.societies s
         INNER JOIN public.society_services ss
           ON ss.society_id = s.id
         INNER JOIN public.services svc
           ON svc.id = ss.service_id
         INNER JOIN public.society_booking_settings bs
           ON bs.society_id = s.id
         INNER JOIN public.society_operating_hours oh
           ON oh.society_id = s.id
          AND oh.day_of_week = $3
         WHERE s.id = $1
           AND svc.id = $2
           AND s.is_accepting_bookings = TRUE
           AND ss.is_available = TRUE
           AND svc.is_active = TRUE`,
        [societyId, normalizedServiceId, dayOfWeek],
      );

      if (configResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "This service is not available at the selected society.",
          },
          { status: 404 },
        );
      }

      const config = configResult.rows[0];

      if (!config.is_open) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "The society is closed on the selected date.",
          },
          { status: 409 },
        );
      }

      // 5. Validate booking horizon and local booking time.
      const clockResult = await client.query(
        `SELECT
           (NOW() AT TIME ZONE '${TIME_ZONE}')::date::text AS today,
           TO_CHAR(
             NOW() AT TIME ZONE '${TIME_ZONE}',
             'HH24:MI'
           ) AS local_time`,
      );

      const today = clockResult.rows[0].today as string;
      const localTime = clockResult.rows[0].local_time as string;

      const lastBookingDate = addDays(
        today,
        Number(config.booking_horizon_days) - 1,
      );

      if (
        bookingDate < today ||
        bookingDate > lastBookingDate ||
        (bookingDate === today && startTime <= localTime)
      ) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "This date or time is outside the available booking window.",
          },
          { status: 409 },
        );
      }

      // 6. Calculate duration and validate operating hours.
      const durationMinutes = Number(config.duration_minutes);

      if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes <= 0 ||
        durationMinutes % SLOT_INTERVAL_MINUTES !== 0
      ) {
        throw new Error("Invalid service duration configuration.");
      }

      const endTime = addMinutes(startTime, durationMinutes);

      if (endTime > String(config.closes_at).slice(0, 5)) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "The selected service would finish after closing time.",
          },
          { status: 409 },
        );
      }

      // 7. Load the current responsible owner for this society.
      const ownerResult = await client.query(
        `SELECT
           responsible_party_type,
           responsible_party_reference,
           responsible_party_name_snapshot
         FROM public.society_manager_assignment_history
         WHERE society_id = $1
           AND unassigned_at IS NULL
         LIMIT 2`,
        [societyId],
      );

      if (ownerResult.rows.length !== 1) {
        throw new Error(
          "Society must have exactly one active responsible owner.",
        );
      }

      const owner = ownerResult.rows[0];

      // 8. Expire old reservations for this society/date.
      // Also expire their pending bookings and record the transition.
      await client.query(
        `WITH expired_reservations AS (
           UPDATE public.booking_slot_reservations
           SET status = 'expired'
           WHERE society_id = $1
             AND booking_date = $2
             AND status = 'active'
             AND expires_at <= NOW()
           RETURNING booking_id
         ),
         expired_bookings AS (
           UPDATE public.bookings b
           SET booking_status = 'expired',
               updated_at = NOW()
           FROM expired_reservations r
           WHERE b.id = r.booking_id
             AND b.booking_status = 'pending_payment'
           RETURNING b.id
         )
         INSERT INTO public.booking_status_history (
           booking_id,
           previous_status,
           new_status,
           changed_by_type,
           notes
         )
         SELECT
           id,
           'pending_payment',
           'expired',
           'system',
           'Temporary booking reservation expired'
         FROM expired_bookings`,
        [societyId, bookingDate],
      );

      // 9. Revalidate capacity for every 30-minute segment.
      let firstSlotId: string | null = null;

      for (
        let offset = 0;
        offset < durationMinutes;
        offset += SLOT_INTERVAL_MINUTES
      ) {
        const segmentStart = addMinutes(startTime, offset);

        const slotResult = await client.query(
          `SELECT id, capacity_per_slot
           FROM public.society_time_slots
           WHERE society_id = $1
             AND day_of_week = $2
             AND start_time = $3::time
             AND is_active = TRUE
           LIMIT 1`,
          [societyId, dayOfWeek, segmentStart],
        );

        if (slotResult.rows.length === 0) {
          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              error: "One or more required booking slots are unavailable.",
            },
            { status: 409 },
          );
        }

        const slot = slotResult.rows[0];

        if (offset === 0) {
          firstSlotId = slot.id;
        }

        const occupancyResult = await client.query(
          `SELECT COUNT(DISTINCT busy.booking_id)::int AS occupied
           FROM (
             -- Confirmed and operational bookings, including
             -- standalone bookings created outside customer checkout.
             SELECT
               b.id AS booking_id,
               b.start_time,
               b.end_time
             FROM public.bookings b
             WHERE b.society_id = $1
               AND b.booking_date = $2
               AND b.booking_status IN (
                 'confirmed',
                 'assigned',
                 'in_progress'
               )

             UNION ALL

             -- Active, unexpired holds for pending payments,
             -- and converted reservations for confirmed bookings.
             SELECT
               r.booking_id,
               r.start_time,
               r.end_time
             FROM public.booking_slot_reservations r
             INNER JOIN public.bookings b
               ON b.id = r.booking_id
             WHERE r.society_id = $1
               AND r.booking_date = $2
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
             AND busy.end_time > $3::time`,
          [societyId, bookingDate, segmentStart],
        );

        const occupied = Number(occupancyResult.rows[0].occupied);
        const capacity = Number(slot.capacity_per_slot);

        if (occupied >= capacity) {
          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              error: "This booking slot is no longer available. Please select another time.",
            },
            { status: 409 },
          );
        }
      }

      if (!firstSlotId) {
        throw new Error("Unable to identify the starting booking slot.");
      }

      // 10. Calculate price on the server.
      const basePricePaise = Math.round(
        Number(config.base_price) * 100,
      );

      const vehicleSurchargePaise =
        vehicleType === "suv" ? 10000 : 0;

      const totalAmountPaise =
        basePricePaise + vehicleSurchargePaise;

      if (
        !Number.isSafeInteger(basePricePaise) ||
        basePricePaise < 0 ||
        !Number.isSafeInteger(totalAmountPaise)
      ) {
        throw new Error("Invalid service price configuration.");
      }

      const basePrice = (basePricePaise / 100).toFixed(2);
      const vehicleSurcharge = (
        vehicleSurchargePaise / 100
      ).toFixed(2);
      const totalAmount = (
        totalAmountPaise / 100
      ).toFixed(2);

      // 11. Create the pending booking with owner snapshot.
      const bookingResult = await client.query(
        `INSERT INTO public.bookings (
           customer_id,
           society_id,
           service_id,
           society_name_snapshot,
           service_name_snapshot,
           booking_date,
           start_time,
           end_time,
           vehicle_type,
           vehicle_details,
           base_service_price,
           vehicle_surcharge,
           total_amount,
           currency,
           booking_status,
           payment_method,
           payment_status,
           booking_source,
           responsible_party_type,
           responsible_party_reference,
           responsible_party_name_snapshot
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7::time, $8::time,
           $9, $10, $11, $12, $13, 'INR',
           'pending_payment', 'one_time', 'pending', 'customer',
           $14, $15, $16
         )
         RETURNING id, booking_reference`,
        [
          customer.id,
          societyId,
          normalizedServiceId,
          config.society_name,
          config.service_name,
          bookingDate,
          startTime,
          endTime,
          vehicleType,
          vehicleDetails,
          basePrice,
          vehicleSurcharge,
          totalAmount,
          owner.responsible_party_type,
          owner.responsible_party_reference,
          owner.responsible_party_name_snapshot,
        ],
      );

      const booking = bookingResult.rows[0];

      // 12. Record initial booking status.
      await client.query(
        `INSERT INTO public.booking_status_history (
           booking_id,
           previous_status,
           new_status,
           changed_by_type,
           changed_by_reference,
           notes
         )
         VALUES (
           $1,
           NULL,
           'pending_payment',
           'customer',
           $2,
           'Customer booking reservation created'
         )`,
        [booking.id, customer.id],
      );

      // 13. Record booking-level owner assignment history.
      await client.query(
        `INSERT INTO public.booking_owner_assignment_history (
           booking_id,
           society_id,
           responsible_party_type,
           responsible_party_reference,
           responsible_party_name_snapshot,
           assigned_by_type,
           assigned_by_reference,
           notes
         )
         VALUES ($1, $2, $3, $4, $5, 'system', NULL, $6)`,
        [
          booking.id,
          societyId,
          owner.responsible_party_type,
          owner.responsible_party_reference,
          owner.responsible_party_name_snapshot,
          "Owner inherited from the society's active assignment",
        ],
      );

      // 14. Create the temporary capacity reservation.
      const reservationResult = await client.query(
        `INSERT INTO public.booking_slot_reservations (
           booking_id,
           society_id,
           society_time_slot_id,
           booking_date,
           start_time,
           end_time,
           status,
           expires_at
         )
         VALUES (
           $1,
           $2,
           $3,
           $4,
           $5::time,
           $6::time,
           'active',
           NOW() + ($7::int * INTERVAL '1 minute')
         )
         RETURNING expires_at`,
        [
          booking.id,
          societyId,
          firstSlotId,
          bookingDate,
          startTime,
          endTime,
          config.reservation_expiry_minutes,
        ],
      );

      const expiresAt = reservationResult.rows[0].expires_at;

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        bookingId: booking.id,
        bookingReference: booking.booking_reference,
        reservationExpiresAt: expiresAt,
        societyName: config.society_name,
        serviceName: config.service_name,
        date: bookingDate,
        startTime,
        endTime,
        vehicleType,
        pricing: {
          baseServicePrice: basePrice,
          vehicleSurcharge,
          totalAmount,
          currency: "INR",
        },
        customer: {
          name: customer.full_name,
          email: customer.email,
          contact: customer.verified_phone,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
      client = null;
    }
  } catch (error) {
    if (client) {
      client.release();
    }

    console.error("Booking reservation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to reserve this booking slot. Please try again.",
      },
      { status: 500 },
    );
  }
}
