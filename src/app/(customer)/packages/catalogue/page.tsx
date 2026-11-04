
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Society = {
  id: string;
  name: string;
  address_line?: string;
  locality?: string;
  city?: string;
};

type PackageItem = {
  id: string;
  name: string;
  price: number;
  currency: string;
  credits: number;
  validityMonths: number;
  displayOrder: number;
};

type WashOption = {
  id: string;
  name: string;
  description: string;
  creditCost: number;
};

function formatPrice(price: number) {
  return `₹${Number(price).toLocaleString("en-IN")}`;
}

function formatValidity(months: number) {
  if (months === 12) return "1 year";
  return `${months} months`;
}

export default function PackageCataloguePage() {
  const router = useRouter();

  const [society, setSociety] = useState<Society | null>(null);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [washOptions, setWashOptions] = useState<WashOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCatalogue() {
      try {
        // Read the society selected on the existing society page.
        const savedSocietyId = sessionStorage.getItem(
          "nestos-selected-society"
        );

        if (!savedSocietyId) {
          router.replace("/societies?next=/packages/catalogue");
          return;
        }

        // Confirm that the saved society is still accepting bookings.
        const societyResponse = await fetch("/api/societies", {
          cache: "no-store",
        });

        const societyData = await societyResponse.json();

        if (!societyResponse.ok || !societyData.success) {
          throw new Error("Unable to verify your selected society.");
        }

        const selectedSociety = societyData.societies.find(
          (item: Society) => item.id === savedSocietyId
        );

        if (!selectedSociety) {
          sessionStorage.removeItem("nestos-selected-society");
          router.replace("/societies?next=/packages/catalogue");
          return;
        }

        setSociety(selectedSociety);

        // Load packages and eligible services for this society.
        const packageResponse = await fetch(
          `/api/packages?societyId=${encodeURIComponent(savedSocietyId)}`,
          { cache: "no-store" }
        );

        const packageData = await packageResponse.json();

        if (!packageResponse.ok || !packageData.success) {
          throw new Error(
            packageData.error || "Unable to load packages."
          );
        }

        setPackages(packageData.packages || []);
        setWashOptions(packageData.eligibleServices || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading packages."
        );
      } finally {
        setLoading(false);
      }
    }

    loadCatalogue();
  }, [router]);

  return (
    <div className="min-h-screen bg-cream">
      {/* Page introduction */}
      <section className="bg-forest text-white">
        <div className="container-shell py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">
            Prepaid car care
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Choose your package
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Purchase credits once and use them for eligible washes
            at your supported residential society.
          </p>
        </div>
      </section>

      <section className="container-shell py-8 md:py-12">
        {/* Selected society */}
        {society && (
          <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Packages available at
              </p>

              <h2 className="mt-1 font-bold text-forest">
                {society.name}
              </h2>

              <p className="mt-1 text-sm text-muted">
                {[society.locality, society.city].filter(Boolean).join(", ")}
              </p>
            </div>

            <Link
              href="/societies?next=/packages/catalogue"
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-forest px-5 text-sm font-semibold text-forest transition hover:bg-cream"
            >
              Change society
            </Link>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-border bg-white p-8 text-center">
            <p className="text-sm text-muted">
              Loading packages for your society...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-white p-6">
            <p className="font-semibold text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {/* Package cards */}
        {!loading && !error && packages.length > 0 && (
          <div className="grid items-stretch gap-5 md:grid-cols-3">
            {packages.map((item, index) => {
              const featured = item.name === "Value";

              return (
                <article
                  key={item.id}
                  className={`relative flex flex-col overflow-hidden rounded-3xl border bg-white ${
                    featured
                      ? "border-forest ring-1 ring-forest"
                      : "border-border"
                  }`}
                >
                  {featured && (
                    <div className="bg-lime px-5 py-2 text-center text-xs font-bold uppercase tracking-wider text-ink">
                      A flexible choice
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h2 className="text-xl font-bold text-forest">
                      {item.name}
                    </h2>

                    <div className="mt-5">
                      <p className="text-3xl font-bold tracking-tight text-ink">
                        {formatPrice(item.price)}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        One-time package price
                      </p>
                    </div>

                    <div className="mt-6 rounded-2xl bg-cream p-4">
                      <p className="text-sm text-muted">
                        Included credits
                      </p>
                      <p className="mt-1 text-3xl font-bold text-forest">
                        {item.credits}
                      </p>

                      <div className="mt-4 border-t border-border pt-4">
                        <p className="text-sm text-muted">Validity</p>
                        <p className="mt-1 font-semibold text-ink">
                          {formatValidity(item.validityMonths)}
                        </p>
                      </div>
                    </div>

                    {washOptions.length > 0 && (
                      <div className="mt-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-forest">
                          Use credits for
                        </p>

                        <ul className="mt-3 space-y-3">
                          {washOptions.map((wash) => (
                            <li
                              key={wash.id}
                              className="flex items-start justify-between gap-3 text-sm"
                            >
                              <span className="text-ink">
                                {wash.name}
                              </span>

                              <span className="shrink-0 font-semibold text-forest">
                                {wash.creditCost}{" "}
                                {wash.creditCost === 1 ? "credit" : "credits"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-auto pt-7">
                      <Link
                        href={`/packages/payment?package=${encodeURIComponent(item.id)}&societyId=${encodeURIComponent(society!.id)}`}
                        className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                          featured
                            ? "bg-forest text-white hover:bg-ink"
                            : "bg-lime text-ink hover:brightness-95"
                        }`}
                      >
                        Choose {item.name}
                        <span className="ml-2" aria-hidden="true">
                          →
                        </span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Empty package state */}
        {!loading && !error && packages.length === 0 && (
          <div className="rounded-2xl border border-border bg-white p-8 text-center">
            <h2 className="font-bold text-ink">
              No packages available
            </h2>
            <p className="mt-2 text-sm text-muted">
              Prepaid packages are not currently available at this society.
            </p>
            <Link
              href="/societies?next=/packages/catalogue"
              className="mt-5 inline-flex rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white"
            >
              Choose another society
            </Link>
          </div>
        )}

        {/* How credits work */}
        {!loading && !error && washOptions.length > 0 && (
          <section className="mt-12 rounded-3xl border border-border bg-white p-5 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest">
              Simple by design
            </p>

            <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink">
              Make every credit count
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Choose a package based on how often you wash your car
              and the type of cleaning you prefer.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {washOptions.map((wash) => (
                <div
                  key={wash.id}
                  className="rounded-2xl border border-border bg-cream p-4"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-lime font-bold text-forest">
                    {wash.creditCost}
                  </div>

                  <h3 className="mt-4 font-bold text-ink">
                    {wash.name}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    {wash.description}
                  </p>

                  <p className="mt-4 text-sm font-semibold text-forest">
                    {wash.creditCost}{" "}
                    {wash.creditCost === 1 ? "credit" : "credits"} per wash
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Existing customer link */}
        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-ink">
              Already purchased a package?
            </h2>
            <p className="mt-1 text-sm text-muted">
              Check your remaining credits and package history.
            </p>
          </div>

          <Link
            href="/packages"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest px-5 text-sm font-semibold text-forest transition hover:bg-cream"
          >
            My Packages →
          </Link>
        </div>
      </section>
    </div>
  );
}
