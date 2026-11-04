
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PackageItem = {
  id: string;
  name: string;
  price: number;
  currency: string;
  credits: number;
  validityMonths: number;
  displayOrder: number;
};

type PackageResponse = {
  success: boolean;
  society?: {
    id: string;
    name: string;
  };
  packages?: PackageItem[];
  error?: string;
};

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(Number(price));
}

function formatValidity(months: number) {
  if (months === 12) return "1 year";
  if (months === 1) return "1 month";
  return `${months} months`;
}

export default function PackagePaymentPage() {
  const [selectedPackage, setSelectedPackage] =
    useState<PackageItem | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [societyName, setSocietyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAuthentication() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.authenticated) {
          const returnTo =
            window.location.pathname + window.location.search;

          window.location.replace(
            `/booking/verify?returnTo=${encodeURIComponent(returnTo)}`
          );

          return;
        }
      } catch {
        const returnTo =
          window.location.pathname + window.location.search;

        window.location.replace(
          `/booking/verify?returnTo=${encodeURIComponent(returnTo)}`
        );

        return;
      }

      setCheckingAuth(false);
    }

    checkAuthentication();
  }, []);

  useEffect(() => {
    async function loadPackage() {
      const params = new URLSearchParams(window.location.search);
      const packageId = params.get("package");
      const societyId = params.get("societyId");

      if (!packageId || !societyId) {
        setError("Package or society information is missing.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/packages?societyId=${encodeURIComponent(societyId)}`,
          { cache: "no-store" }
        );

        const data: PackageResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Unable to load package information."
          );
        }

        const selected = data.packages?.find(
          (item) => item.id === packageId
        );

        if (!selected) {
          throw new Error(
            "This package is not available at the selected society."
          );
        }

        setSelectedPackage(selected);
        setSocietyName(data.society?.name || "");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading your package."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPackage();
  }, []);

  const price = selectedPackage
    ? formatPrice(selectedPackage.price, selectedPackage.currency)
    : "";

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-cream grid place-items-center">
        <p className="text-sm text-muted">
          Checking your account...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <section className="bg-forest text-white">
        <div className="container-shell py-10 md:py-14">
          <Link
            href="/packages/catalogue"
            className="text-sm text-white/70 transition hover:text-lime"
          >
            ← Back to packages
          </Link>

          <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-lime">
            Secure checkout
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Complete your purchase
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Review your selected prepaid package before proceeding with payment.
          </p>
        </div>
      </section>

      <section className="container-shell py-8 md:py-12">
        {loading && (
          <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-white p-8 text-center">
            <p className="text-sm text-muted">
              Loading your package details...
            </p>
          </div>
        )}

        {!loading && error && (
          <div
            className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-8"
            role="alert"
          >
            <h2 className="text-xl font-bold text-ink">
              Unable to load checkout
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted">
              {error}
            </p>

            <Link
              href="/packages/catalogue"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-6 text-sm font-semibold text-white"
            >
              Return to packages
            </Link>
          </div>
        )}

        {!loading && !error && selectedPackage && (
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-border bg-white p-6 sm:p-8">
              <h2 className="text-xl font-bold text-ink">
                Order summary
              </h2>

              <p className="mt-1 text-sm text-muted">
                Prepaid wash package
              </p>

              <div className="mt-6 rounded-2xl bg-cream p-5">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-forest">
                  Selected package
                </p>

                <h3 className="mt-2 text-2xl font-bold text-ink">
                  {selectedPackage.name}
                </h3>

                {societyName && (
                  <p className="mt-2 text-sm text-muted">
                    Society: {societyName}
                  </p>
                )}

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted">Credits</p>
                    <p className="mt-1 font-bold text-ink">
                      {selectedPackage.credits}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted">Validity</p>
                    <p className="mt-1 font-bold text-ink">
                      {formatValidity(selectedPackage.validityMonths)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4 border-b border-border pb-4">
                <span className="text-sm text-muted">
                  Package price
                </span>
                <span className="font-semibold text-ink">
                  {price}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="font-bold text-ink">
                  Total payable
                </span>
                <span className="text-2xl font-bold text-forest">
                  {price}
                </span>
              </div>

              <p className="mt-4 text-xs leading-5 text-muted">
                The amount shown is the configured package price.
                Applicable taxes or additional charges must be confirmed
                by the payment integration before checkout goes live.
              </p>
            </div>

            <aside className="rounded-3xl border border-border bg-white p-6 sm:p-8">
              <div className="grid size-12 place-items-center rounded-2xl bg-cream text-forest">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  aria-hidden="true"
                >
                  <rect
                    x="4"
                    y="10"
                    width="16"
                    height="11"
                    rx="2"
                  />
                  <path
                    d="M8 10V7a4 4 0 1 1 8 0v3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <h2 className="mt-5 text-xl font-bold text-ink">
                Payment
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted">
                Online payment will be available here once the payment
                provider and server-side verification are connected.
              </p>

              <div
                className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4"
                role="status"
              >
                <p className="font-semibold text-amber-950">
                  Checkout not connected
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-900">
                  No payment has been initiated. Your credits will not
                  be activated from this preview page.
                </p>
              </div>

              <button
                type="button"
                disabled
                className="mt-6 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-full bg-stone-200 px-6 py-3 text-sm font-bold text-stone-500"
              >
                Pay {price}
              </button>

              <Link
                href="/packages/catalogue"
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center text-sm font-semibold text-forest transition hover:underline"
              >
                Cancel and return to packages
              </Link>

              <p className="mt-5 text-center text-xs leading-5 text-muted">
                Buying a package does not create a wash booking.
              </p>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
