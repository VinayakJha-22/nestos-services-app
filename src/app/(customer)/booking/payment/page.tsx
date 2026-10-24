
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

export default function BookingPaymentPage() {
  const router = useRouter();

  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState(false);

  useEffect(() => {
    try {
      const rawDraft = sessionStorage.getItem("nestos-booking-draft");

      if (!rawDraft) {
        router.replace("/services");
        return;
      }

      const parsed = JSON.parse(rawDraft) as Partial<BookingDraft>;

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

      const selectedSociety = societies.find(
        (item) =>
          item.id === parsed.societyId && item.status === "accepting"
      );

      const selectedService = services.find(
        (item) => item.id === parsed.serviceId
      );

      if (!selectedSociety) {
        router.replace("/societies");
        return;
      }

      if (!selectedService) {
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
        Loading your booking summary...
      </div>
    );
  }

  const vehicleSurcharge = draft.vehicle === "SUV" ? 100 : 0;
  const total = service.price + vehicleSurcharge;

  return (
    <div className="min-h-screen bg-cream">
      <section className="bg-forest text-white">
        <div className="container-shell py-10 md:py-14">
          <Link
            href="/booking/review"
            className="text-sm text-white/70 transition hover:text-lime"
          >
            ← Back to booking review
          </Link>

          <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-lime">
            Step 6 · Payment
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            One step closer to a cleaner car.
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Review your booking and price before proceeding to payment.
          </p>
        </div>
      </section>

      <section className="container-shell py-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted">
                    Selected service
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-ink">
                    {service.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Car care delivered at your residential society.
                  </p>
                </div>

                <Link
                  href={`/booking/calendar?service=${service.id}`}
                  className="text-sm font-semibold text-forest hover:underline"
                >
                  Edit booking
                </Link>
              </div>

              <div className="mt-7 grid gap-5 border-t border-border pt-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Society
                  </p>
                  <p className="mt-2 font-semibold text-ink">
                    {society.name}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {society.locality}, {society.city}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Appointment date
                  </p>
                  <p className="mt-2 font-semibold text-ink">
                    {formatDate(draft.date)}
                  </p>
                  <p className="mt-1 text-sm text-muted">{draft.time}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Vehicle type
                  </p>
                  <p className="mt-2 font-semibold text-ink">
                    {draft.vehicle}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Booking status
                  </p>
                  <p className="mt-2 font-semibold text-amber-700">
                    Awaiting payment
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-lg" aria-hidden="true">
                  !
                </span>
                <div>
                  <h3 className="font-semibold text-amber-950">
                    Payment integration is not connected yet
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-amber-900">
                    This is a development preview. No payment will be
                    collected, and your appointment time has not been
                    reserved or confirmed.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-border bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-xl font-bold text-ink">Price summary</h2>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted">{service.name}</span>
                <span className="font-medium text-ink">
                  ₹{service.price}
                </span>
              </div>

              {vehicleSurcharge > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted">SUV surcharge</span>
                  <span className="font-medium text-ink">
                    ₹{vehicleSurcharge}
                  </span>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-ink">
                    Total payable
                  </span>
                  <span className="text-2xl font-bold text-forest">
                    ₹{total}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Preview estimate based on the current service configuration.
                  The server must calculate the final amount before payment.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPaymentNotice(true)}
              className="mt-7 flex min-h-12 w-full items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white transition hover:bg-ink"
            >
              Proceed to payment →
            </button>

            {paymentNotice && (
              <p
                role="status"
                className="mt-4 rounded-xl bg-cream p-4 text-sm leading-6 text-ink"
              >
                Online payment is not available in this preview. We’ll
                connect the payment provider and server-side verification
                before enabling real transactions.
              </p>
            )}

            <Link
              href="/booking/review"
              className="mt-4 block text-center text-sm font-semibold text-forest hover:underline"
            >
              Return to booking review
            </Link>

            <p className="mt-6 text-center text-xs leading-5 text-muted">
              Your booking is confirmed only after successful payment
              verification and server-side booking confirmation.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
