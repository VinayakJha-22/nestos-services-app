
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { services } from "@/config/services";
import { societies } from "@/config/societies";

type VehicleType = "Hatchback" | "Sedan" | "SUV";

type BookingDraft = {
  societyId: string;
  serviceId: string;
  date: string;
  time: string;
  vehicle: VehicleType;
};

function formatBookingDate(value: string) {
  const parts = value.split("-").map(Number);

  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isInteger(part))
  ) {
    return value;
  }

  const date = new Date(parts[0], parts[1] - 1, parts[2]);

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BookingReviewPage() {
  const router = useRouter();

  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const rawDraft = sessionStorage.getItem(
        "nestos-booking-draft"
      );

      if (!rawDraft) {
        router.replace("/services");
        return;
      }

      const parsed = JSON.parse(rawDraft) as Partial<BookingDraft>;

      const validVehicles: VehicleType[] = [
        "Hatchback",
        "Sedan",
        "SUV",
      ];

      const isValid =
        typeof parsed.societyId === "string" &&
        typeof parsed.serviceId === "string" &&
        typeof parsed.date === "string" &&
        typeof parsed.time === "string" &&
        validVehicles.includes(parsed.vehicle as VehicleType);

      if (!isValid) {
        sessionStorage.removeItem("nestos-booking-draft");
        router.replace("/services");
        return;
      }

      const society = societies.find(
        (item) =>
          item.id === parsed.societyId &&
          item.status === "accepting"
      );

      const service = services.find(
        (item) => item.id === parsed.serviceId
      );

      if (!society || !service) {
        sessionStorage.removeItem("nestos-booking-draft");
        router.replace(society ? "/services" : "/societies");
        return;
      }

      setDraft(parsed as BookingDraft);
      setIsReady(true);
    } catch {
      sessionStorage.removeItem("nestos-booking-draft");
      router.replace("/services");
    }
  }, [router]);

  if (!isReady || !draft) {
    return (
      <div className="container-shell flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted">
          Preparing your booking summary...
        </p>
      </div>
    );
  }

  const service = services.find(
    (item) => item.id === draft.serviceId
  );

  const society = societies.find(
    (item) => item.id === draft.societyId
  );

  if (!service || !society) {
    return null;
  }

  // Displayed price is recalculated from configured service data.
  // The backend must independently validate the final price.
  const vehicleSurcharge = draft.vehicle === "SUV" ? 100 : 0;
  const totalPrice = service.price + vehicleSurcharge;

  function continueBooking() {
    router.push("/booking/verify");
  }

  return (
    <div className="min-h-screen bg-cream">
      <section className="bg-forest text-white">
        <div className="container-shell py-10 md:py-14">
          <Link
            href={`/booking/calendar?service=${service.id}`}
            className="text-sm text-white/70 transition hover:text-lime"
          >
            ← Edit booking
          </Link>

          <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-lime">
            Step 4 · Review your booking
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything look right?
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Check your service, schedule and vehicle before continuing.
          </p>
        </div>
      </section>

      <section className="container-shell py-8 md:py-12">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {/* Service */}
            <section className="rounded-3xl border border-border bg-white p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-forest">
                    Your service
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-ink">
                    {service.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Car care at your selected residential society.
                  </p>
                </div>

                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cream text-forest">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-6"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    aria-hidden="true"
                  >
                    <path
                      d="m3 14 2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v5h-3v-2H6v2H3v-5Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 14h14"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              <Link
                href={`/services`}
                className="mt-5 inline-flex text-sm font-semibold text-forest hover:underline"
              >
                Change service →
              </Link>
            </section>

            {/* Date, time and vehicle */}
            <section className="rounded-3xl border border-border bg-white p-6 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-wider text-forest">
                Booking details
              </p>

              <div className="mt-5 divide-y divide-border">
                <div className="flex items-start gap-4 py-4 first:pt-0">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-cream text-forest">
                    <span aria-hidden="true">⌖</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">Society</p>
                    <p className="mt-1 font-semibold text-ink">
                      {society.name}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {society.locality}, {society.city}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 py-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-cream text-forest">
                    <span aria-hidden="true">▦</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">Date</p>
                    <p className="mt-1 font-semibold text-ink">
                      {formatBookingDate(draft.date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 py-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-cream text-forest">
                    <span aria-hidden="true">◷</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">Preferred time</p>
                    <p className="mt-1 font-semibold text-ink">
                      {draft.time}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 py-4 last:pb-0">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-cream text-forest">
                    <span aria-hidden="true">🚘</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">Vehicle type</p>
                    <p className="mt-1 font-semibold text-ink">
                      {draft.vehicle}
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href={`/booking/calendar?service=${service.id}`}
                className="mt-5 inline-flex text-sm font-semibold text-forest hover:underline"
              >
                Change date, time or vehicle →
              </Link>
            </section>

            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <strong>Availability notice:</strong> Your selected time
              is a preference, not a confirmed reservation. Availability
              and price must be checked again before the booking is accepted.
            </div>
          </div>

          {/* Price summary */}
          <aside className="rounded-3xl border border-border bg-white p-6 lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-wider text-forest">
              Payment summary
            </p>

            <h2 className="mt-2 text-xl font-bold text-ink">
              Price breakdown
            </h2>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted">{service.name}</span>
                <span className="font-medium text-ink">
                  ₹{service.price}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-muted">
                  {draft.vehicle} surcharge
                </span>
                <span className="font-medium text-ink">
                  ₹{vehicleSurcharge}
                </span>
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold text-ink">
                  Total payable
                </span>
                <span className="text-3xl font-bold text-forest">
                  ₹{totalPrice}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                Final amount is subject to server-side validation.
              </p>
            </div>

            <button
              type="button"
              onClick={continueBooking}
              className="mt-7 flex min-h-12 w-full items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white transition hover:bg-ink"
            >
              Continue to verification →
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-muted">
              No payment is taken on this screen.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
