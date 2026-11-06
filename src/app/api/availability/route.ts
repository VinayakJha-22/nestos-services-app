import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const TIME_ZONE = "Asia/Kolkata";
const SLOT_INTERVAL_MINUTES = 30;

type OperatingHour = {
  day_of_week: number;
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

type BusyBooking = {
  booking_date: string;
  start_time: string;
  end_time: string;
};

type AvailableSlot = {
  startTime: string;
  endTime: string;
  label: string;
};

function getDateInTimeZone(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")!.value;
  const month = parts.find((part) => part.type === "month")!.value;
  const day = parts.find((part) => part.type === "day")!.value;

  return `${year}-${month}-${day}`;
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function getDayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    remainingMinutes
  ).padStart(2, "0")}`;
}

function toTimeLabel(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${String(displayHour).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")} ${period}`;
}

function getCurrentTimeMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const hours = Number(
    parts.find((part) => part.type === "hour")!.value
  );

  const minutes = Number(
    parts.find((part) => part.type === "minute")!.value
  );

  return hours * 60 + minutes;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const societyId = searchParams.get("societyId");
    const serviceId = searchParams.get("serviceId");

    if (!societyId || !serviceId) {
      return NextResponse.json(
        {
          success: false,
          message: "societyId and serviceId are required.",
        },
        { status: 400 }
      );
    }

    // 1. Validate the society, service and booking configuration.
    const configResult = await db.query(
      `
      SELECT
        s.id AS society_id,
        s.name AS society_name,
        s.is_accepting_bookings,
        svc.id AS service_id,
        svc.name AS service_name,
        svc.duration_minutes,
        sbs.booking_horizon_days
      FROM public.societies s
      JOIN public.society_services ss
        ON ss.society_id = s.id
      JOIN public.services svc
        ON svc.id = ss.service_id
      LEFT JOIN public.society_booking_settings sbs
        ON sbs.society_id = s.id
      WHERE s.id = $1
        AND svc.id = $2
        AND ss.is_available = TRUE
        AND svc.is_active = TRUE
      `,
      [societyId, serviceId]
    );

    if (configResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected service is unavailable at this society.",
        },
        { status: 404 }
      );
    }

    const config = configResult.rows[0];

    if (!config.is_accepting_bookings) {
      return NextResponse.json(
        {
          success: false,
          message: "This society is not currently accepting bookings.",
        },
        { status: 409 }
      );
    }

    if (
      config.booking_horizon_days == null ||
      config.duration_minutes == null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking configuration is incomplete.",
        },
        { status: 409 }
      );
    }

    const durationMinutes = Number(config.duration_minutes);
    const bookingHorizonDays = Number(config.booking_horizon_days);

    if (
      durationMinutes <= 0 ||
      durationMinutes % SLOT_INTERVAL_MINUTES !== 0 ||
      bookingHorizonDays < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid service duration or booking horizon configuration.",
        },
        { status: 409 }
      );
    }

    // 2. Generate the booking date range in the society's timezone.
    const today = getDateInTimeZone(new Date());
    const lastDate = addDays(today, bookingHorizonDays - 1);

    const dates = Array.from(
      { length: bookingHorizonDays },
      (_, index) => addDays(today, index)
    );

    // 3. Load society operating hours.
    const operatingResult = await db.query<OperatingHour>(
      `
      SELECT
        day_of_week,
        is_open,
        opens_at::text AS opens_at,
        closes_at::text AS closes_at
      FROM public.society_operating_hours
      WHERE society_id = $1
      `,
      [societyId]
    );

    const operatingHours = new Map<number, OperatingHour>(
      operatingResult.rows.map((row) => [row.day_of_week, row])
    );

    // 4. Load active fixed start times and their capacity.
    const slotsResult = await db.query<{
      day_of_week: number;
      start_time: string;
      capacity_per_slot: number;
    }>(
      `
      SELECT
        day_of_week,
        start_time::text AS start_time,
        capacity_per_slot
      FROM public.society_time_slots
      WHERE society_id = $1
        AND is_active = TRUE
      ORDER BY day_of_week, start_time
      `,
      [societyId]
    );

    const slotsByDay = new Map<number, Map<string, number>>();

    for (const row of slotsResult.rows) {
      if (!slotsByDay.has(row.day_of_week)) {
        slotsByDay.set(row.day_of_week, new Map());
      }

      slotsByDay
        .get(row.day_of_week)!
        .set(row.start_time.slice(0, 5), Number(row.capacity_per_slot));
    }

    // 5. Load bookings that currently consume capacity.
    // Confirmed/assigned/in-progress bookings count directly.
    // Pending payment bookings count only while their active
    // reservation has not expired.
    const bookingsResult = await db.query<BusyBooking>(
      `
      SELECT
        b.booking_date::text AS booking_date,
        b.start_time::text AS start_time,
        b.end_time::text AS end_time
      FROM public.bookings b
      WHERE b.society_id = $1
        AND b.booking_date BETWEEN $2::date AND $3::date
        AND (
          b.booking_status IN (
            'confirmed',
            'assigned',
            'in_progress'
          )
          OR (
            b.booking_status = 'pending_payment'
            AND EXISTS (
              SELECT 1
              FROM public.booking_slot_reservations r
              WHERE r.booking_id = b.id
                AND r.status = 'active'
                AND r.expires_at > NOW()
            )
          )
        )
      `,
      [societyId, today, lastDate]
    );

    const bookingsByDate = new Map<string, BusyBooking[]>();

    for (const booking of bookingsResult.rows) {
      if (!bookingsByDate.has(booking.booking_date)) {
        bookingsByDate.set(booking.booking_date, []);
      }

      bookingsByDate.get(booking.booking_date)!.push(booking);
    }

    // 6. Check capacity across every 30-minute segment
    // occupied by the selected service.
    const currentTimeMinutes = getCurrentTimeMinutes();

    const availableDates = dates.map((date) => {
      const dayOfWeek = getDayOfWeek(date);
      const operating = operatingHours.get(dayOfWeek);

      if (
        !operating ||
        !operating.is_open ||
        !operating.opens_at ||
        !operating.closes_at
      ) {
        return {
          date,
          weekday: new Intl.DateTimeFormat("en-IN", {
            weekday: "short",
            timeZone: "UTC",
          }).format(new Date(`${date}T12:00:00.000Z`)),
          isOperatingDay: false,
          slots: [] as AvailableSlot[],
        };
      }

      const opensAt = toMinutes(operating.opens_at);
      const closesAt = toMinutes(operating.closes_at);

      const fixedSlots = slotsByDay.get(dayOfWeek) ?? new Map();
      const busyBookings = bookingsByDate.get(date) ?? [];

      const availableSlots: AvailableSlot[] = [];

      for (const startTime of fixedSlots.keys()) {
        const startMinutes = toMinutes(startTime);
        const endMinutes = startMinutes + durationMinutes;

        if (startMinutes < opensAt || endMinutes > closesAt) {
          continue;
        }

        // Hide start times that have already passed today.
        if (date === today && startMinutes <= currentTimeMinutes) {
          continue;
        }

        let hasCapacity = true;

        for (
          let segmentStart = startMinutes;
          segmentStart < endMinutes;
          segmentStart += SLOT_INTERVAL_MINUTES
        ) {
          const segmentEnd = segmentStart + SLOT_INTERVAL_MINUTES;
          const segmentStartTime = toTimeString(segmentStart);

          const capacity = fixedSlots.get(segmentStartTime);

          if (capacity == null) {
            hasCapacity = false;
            break;
          }

          const concurrentBookings = busyBookings.filter((booking) => {
            const bookingStart = toMinutes(booking.start_time);
            const bookingEnd = toMinutes(booking.end_time);

            return (
              bookingStart < segmentEnd &&
              bookingEnd > segmentStart
            );
          }).length;

          if (concurrentBookings >= capacity) {
            hasCapacity = false;
            break;
          }
        }

        if (hasCapacity) {
          const endTime = toTimeString(endMinutes);

          availableSlots.push({
            startTime,
            endTime,
            label: toTimeLabel(startTime),
          });
        }
      }

      return {
        date,
        weekday: new Intl.DateTimeFormat("en-IN", {
          weekday: "short",
          timeZone: "UTC",
        }).format(new Date(`${date}T12:00:00.000Z`)),
        isOperatingDay: true,
        slots: availableSlots,
      };
    });

    return NextResponse.json(
      {
        success: true,
        societyId,
        societyName: config.society_name,
        serviceId,
        serviceName: config.service_name,
        durationMinutes,
        timezone: TIME_ZONE,
        bookingHorizonDays,
        dates: availableDates,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Availability API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load booking availability.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}