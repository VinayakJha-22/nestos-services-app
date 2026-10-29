
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { services } from "@/config/services";

export default function ServicesPage() {
  const router = useRouter();

  const [societyId, setSocietyId] = useState<string | null>(null);
  const [societyName, setSocietyName] = useState("");
  const [isCheckingSociety, setIsCheckingSociety] = useState(true);

  
  useEffect(() => {
    let cancelled = false;

    async function loadSelectedSociety() {
      const savedSocietyId = sessionStorage.getItem(
        "nestos-selected-society",
      );

      if (!savedSocietyId) {
        router.replace("/societies");
        return;
      }

      try {
        const response = await fetch("/api/societies", {
          cache: "no-store",
        });

        const data = (await response.json()) as {
          success: boolean;
          societies?: {
            id: string;
            name: string;
            is_accepting_bookings: boolean;
          }[];
        };

        if (!response.ok || !data.success) {
          throw new Error("Unable to verify the selected society.");
        }

        const selectedSociety = (data.societies ?? []).find(
          (society) =>
            society.id === savedSocietyId &&
            society.is_accepting_bookings,
        );

        if (cancelled) return;

        if (!selectedSociety) {
          sessionStorage.removeItem("nestos-selected-society");
          router.replace("/societies");
          return;
        }

        setSocietyId(selectedSociety.id);
        setSocietyName(selectedSociety.name);
        setIsCheckingSociety(false);
      } catch (error) {
        console.error("Failed to verify selected society:", error);

        if (!cancelled) {
          router.replace("/societies");
        }
      }
    }

    loadSelectedSociety();

    return () => {
      cancelled = true;
    };
  }, [router]);


  if (isCheckingSociety || !societyId) {
    return (
      <div className="container-shell flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted">
          Checking your selected society...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Page heading */}
      <section className="bg-forest text-white">
        <div className="container-shell py-12 md:py-16">
          <Link
            href="/societies"
            className="text-sm text-white/70 transition hover:text-lime"
          >
            ← Change society
          </Link>

          <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-lime">
            Step 2 · Choose your service
          </p>

          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            A cleaner car, without the drive.
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Choose the car-care service that works for you.
            We bring the convenience to your residential society.
          </p>

          <div className="mt-7 inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
            <span className="grid size-10 place-items-center rounded-xl bg-lime text-forest">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-5"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path
                  d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </span>

            <div>
              <p className="text-xs text-white/65">
                Your selected society
              </p>
              <p className="mt-1 font-semibold">{societyName}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Service cards */}
      <section className="container-shell py-12 md:py-16">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest">
              Our services
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Pick your wash
            </h2>
          </div>

          <p className="text-sm text-muted">
            Clear pricing. Convenient booking.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {services.map((service, index) => (
            <article
              key={service.id}
              className={`relative flex flex-col rounded-3xl border bg-white p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg ${
                service.featured
                  ? "border-forest ring-1 ring-forest/10"
                  : "border-border"
              }`}
            >
              {service.featured && (
                <span className="absolute right-5 top-5 rounded-full bg-lime px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink">
                  Popular
                </span>
              )}

              <div className="grid size-14 place-items-center rounded-2xl bg-cream text-forest">
                {index === 0 && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-7"
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
                      d="M5 14h14M7 11h.01M17 11h.01"
                      strokeLinecap="round"
                    />
                  </svg>
                )}

                {index === 1 && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-7"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 13V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4M3 13h18v5H3v-5Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6 18v2m12-2v2M7 10h10"
                      strokeLinecap="round"
                    />
                  </svg>
                )}

                {index === 2 && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-7"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    aria-hidden="true"
                  >
                    <path
                      d="m12 3 2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              <h3 className="mt-6 max-w-[85%] text-xl font-bold text-ink">
                {service.name}
              </h3>

              <p className="mt-3 min-h-[48px] text-sm leading-6 text-muted">
                {service.description}
              </p>

              <div className="mt-6 border-t border-border pt-5">
                <p className="text-xs text-muted">Starting at</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-forest">
                  ₹{service.price}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Base service price
                </p>
              </div>

              <div className="mt-auto pt-7">
                <Link
                  href={`/booking/calendar?service=${service.id}`}
                  className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition ${
                    service.featured
                      ? "bg-forest text-white hover:bg-ink"
                      : "border border-border bg-white text-forest hover:border-forest hover:bg-cream"
                  }`}
                >
                  Choose service
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-7 text-center text-xs leading-5 text-muted">
          Final pricing will be confirmed during booking. Vehicle-related
          surcharges, where applicable, will be shown before payment.
        </p>
      </section>

      {/* Reassurance section */}
      <section className="border-t border-border bg-white">
        <div className="container-shell grid gap-6 py-10 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-ink">
              <span className="mr-2 text-forest">✓</span>
              At your society
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Book car care where your vehicle is parked.
            </p>
          </div>

          <div>
            <p className="font-semibold text-ink">
              <span className="mr-2 text-forest">✓</span>
              Choose your time
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Select from available booking slots in the next step.
            </p>
          </div>

          <div>
            <p className="font-semibold text-ink">
              <span className="mr-2 text-forest">✓</span>
              Simple booking
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Review your booking details before confirming.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
