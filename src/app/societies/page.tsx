
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { societies } from "@/config/societies";
import type { Society } from "@/types/society";

function statusDetails(status: Society["status"]) {
  switch (status) {
    case "accepting":
      return {
        label: "Accepting bookings",
        className: "bg-[#E5F3DF] text-[#245B34]",
      };
    case "coming-soon":
      return {
        label: "Coming soon",
        className: "bg-[#FFF0CE] text-[#76541A]",
      };
    default:
      return {
        label: "Not currently available",
        className: "bg-[#ECEFED] text-[#64736B]",
      };
  }
}

export default function SocietiesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredSocieties = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return societies;

    return societies.filter((society) =>
      [
        society.name,
        society.address,
        society.locality,
        society.city,
      ].some((value) => value.toLowerCase().includes(term)),
    );
  }, [search]);

  function selectSociety(society: Society) {
    if (society.status !== "accepting") return;

    // Temporary selection persistence for UI development.
    // Booking eligibility must be revalidated by the backend later.
    sessionStorage.setItem("nestos-selected-society", society.id);

    router.push("/services");
  }

  return (
    <div className="min-h-full">
      <section className="border-b border-border bg-white">
        <div className="container-shell py-10 sm:py-14">
          <Link
            href="/"
            className="text-sm font-medium text-muted hover:text-forest"
          >
            ← Back to home
          </Link>

          <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-forest">
            Step 1 · Your location
          </p>

          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-ink sm:text-5xl">
            Where should we clean your car?
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-muted sm:text-base">
            Select your residential society to see the services and booking
            options available at your location.
          </p>

          <div className="mt-8 max-w-2xl">
            <label htmlFor="society-search" className="sr-only">
              Search by society name or area
            </label>

            <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-cream px-4 transition focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/10">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="size-5 shrink-0 text-muted"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="m16 16 4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>

              <input
                id="society-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search society name or area..."
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="shrink-0 text-sm font-semibold text-forest"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink sm:text-2xl">
              Available locations
            </h2>
            <p className="mt-2 text-sm text-muted">
              {filteredSocieties.length}{" "}
              {filteredSocieties.length === 1 ? "location" : "locations"} found
            </p>
          </div>

          <span className="rounded-full bg-white px-3 py-2 text-xs font-medium text-muted ring-1 ring-border">
            Society-based service
          </span>
        </div>

        {filteredSocieties.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSocieties.map((society) => {
              const status = statusDetails(society.status);
              const accepting = society.status === "accepting";

              return (
                <article
                  key={society.id}
                  className="flex flex-col rounded-[24px] border border-border bg-white p-5 transition hover:border-forest/40 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#E8EEE4] text-forest">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="size-6"
                      >
                        <path
                          d="M3 21h18M5 21V7l7-4 7 4v14M9 10h1m4 0h1m-6 4h1m4 0h1m-5 7v-4h4v4"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-ink">
                    {society.name}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    {society.address}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="size-4 shrink-0"
                    >
                      <path
                        d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                      <circle
                        cx="12"
                        cy="10"
                        r="2.5"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                    </svg>
                    {society.locality}, {society.city}
                  </div>

                  <div className="mt-6 border-t border-border pt-4">
                    <button
                      type="button"
                      disabled={!accepting}
                      onClick={() => selectSociety(society)}
                      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                        accepting
                          ? "bg-forest text-white hover:bg-ink"
                          : "cursor-not-allowed bg-[#ECEFED] text-muted"
                      }`}
                    >
                      {accepting ? "Select this society" : "Not available yet"}
                      {accepting && <span aria-hidden="true">→</span>}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-[24px] border border-dashed border-border bg-white px-5 py-14 text-center">
            <h3 className="text-lg font-bold text-ink">
              No matching societies found
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Try another society name or locality. You can also clear your
              search to view all sample locations.
            </p>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mt-5 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white hover:bg-ink"
            >
              Clear search
            </button>
          </div>
        )}

        <p className="mt-8 rounded-2xl border border-border bg-white p-4 text-xs leading-5 text-muted">
          These are sample locations for development. Actual society addresses,
          service eligibility and booking availability must come from
          verified operational data before launch.
        </p>
      </section>
    </div>
  );
}
