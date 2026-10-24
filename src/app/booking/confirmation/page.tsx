
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

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BookingConfirmationPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("nestos-booking-draft");

      if (!raw) {
        router.replace("/services");
        return;
      }

      const parsed = JSON.parse(raw) as Partial<BookingDraft>;

      const validVehicle =
        parsed.vehicle === "Hatchback" ||
        parsed.vehicle === "Sedan" ||
        parsed.vehicle === "SUV";

      if (
        typeof parsed.societyId !== "string" ||
        typeof parsed.serviceId !== "string" ||
        typeof parsed.date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ||
        typeof parsed.time !== "string" ||
        !validVehicle
      ) {
        router.replace("/services");
        return;
      }

      const society = societies.find(
        (item) => item.id === parsed.societyId
    );
      const service = services.find(
        (item) => item.id === parsed.serviceId
      );

      if (!society) {
        router.replace("/societies");
        return;
      }

      if (!service) {
        router.replace("/services");
        return;
      }

      setDraft({
        societyId: parsed.societyId,
        serviceId: parsed.serviceId,
        date: parsed.date,
        time: parsed.time,
        vehicle: parsed.vehicle,
      });
      setReady(true);
    } catch {
      router.replace("/services");
    }
  }, [router]);

  const service = services.find((item) => item.id === draft?.serviceId);
  const society = societies.find((item) => item.id === draft?.societyId);

  if (!ready || !draft || !service || !society) {
    return (
      <div className="container-shell py-20 text-center text-muted">
        Loading booking details...
      </div>
    );
  }

  const surcharge = draft.vehicle === "SUV" ? 100 : 0;
  const total = service.price + surcharge;

  return (
    <div className="min-h-screen bg-cream">
      <section className="bg-forest text-white">
        <div className="container-shell py-12 text-center md:py-16">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-lime text-forest">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-8"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path
                d="M12 7v5m0 4h.01"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-lime">
            Booking status
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Your booking is not confirmed yet
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Your selected details are available below. We’ll confirm your
            appointment only after payment verification and successful
            booking creation.
          </p>
        </div>
      </section>

      <section className="container-shell py-10 md:py-14">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 sm:p-6">
            <p className="font-semibold text-amber-950">
              Awaiting payment integration
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              This is a development preview. No payment has been processed,
              no booking reference has been issued, and your selected time
              has not been reserved.
            </p>
          </div>

          <div className="mt-6 rounded-3xl border border-border bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Selected service</p>
                <h2 className="mt-1 text-2xl font-bold text-ink">
                  {service.name}
                </h2>
              </div>

              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
                Not confirmed
              </span>
            </div>

            <div className="mt-7 space-y-5 border-t border-border pt-6">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cream text-forest">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    aria-hidden="true"
                  >
                    <path d="M3 21h18M5 21V5l7-3 7 3v16M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Society
                  </p>
                  <p className="mt-1 font-semibold text-ink">
                    {society.name}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {society.locality}, {society.city}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cream text-forest">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 10h18" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Preferred appointment
                  </p>
                  <p className="mt-1 font-semibold text-ink">
                    {formatDate(draft.date)}
                  </p>
                  <p className="mt-1 text-sm text-muted">{draft.time}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cream text-forest">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    aria-hidden="true"
                  >
                    <path d="m3 13 2-6h14l2 6M5 13h14l2 3v4h-3v-2H6v2H3v-4l2-3Z" />
                    <circle cx="7.5" cy="15.5" r="1" />
                    <circle cx="16.5" cy="15.5" r="1" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Vehicle
                  </p>
                  <p className="mt-1 font-semibold text-ink">
                    {draft.vehicle}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 border-t border-border pt-6">
              <h3 className="font-bold text-ink">Price summary</h3>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted">{service.name}</span>
                  <span className="font-medium text-ink">
                    ₹{service.price}
                  </span>
                </div>

                {surcharge > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted">SUV surcharge</span>
                    <span className="font-medium text-ink">
                      ₹{surcharge}
                    </span>
                  </div>
                )}

                <div className="flex justify-between border-t border-border pt-4">
                  <span className="font-semibold text-ink">
                    Estimated total
                  </span>
                  <span className="text-xl font-bold text-forest">
                    ₹{total}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/booking/payment"
              className="flex min-h-12 items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white transition hover:bg-ink"
            >
              Return to payment
            </Link>

            <Link
              href="/services"
              className="flex min-h-12 items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-semibold text-ink transition hover:border-forest"
            >
              Explore services
            </Link>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-muted">
            This preview is not a booking receipt. Once the backend is
            connected, confirmed bookings will include a booking reference
            and verified payment status.
          </p>
        </div>
      </section>
    </div>
  );
}
