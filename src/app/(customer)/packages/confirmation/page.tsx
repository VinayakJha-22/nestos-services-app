
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Purchase = {
  purchaseOrderId: string;
  packageName: string;
  price: string | number;
  currency: string;
  creditsPurchased: number;
  validityMonths: number;
  paidAt: string;
  paymentId: string;
  societyName: string;
  subscriptionId: string;
  subscriptionStatus: string;
  creditsRemaining: number;
  expiresAt: string;
};

type PurchaseResponse = {
  success: boolean;
  purchase?: Purchase;
  error?: string;
};

function formatPrice(price: number | string, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(Number(price));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatValidity(months: number) {
  if (months === 12) return "1 year";
  if (months === 1) return "1 month";
  return `${months} months`;
}

export default function PackageConfirmationPage() {
  const router = useRouter();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPurchase() {
      const params = new URLSearchParams(window.location.search);
      const purchaseOrderId = params.get("purchaseOrderId");

      if (!purchaseOrderId) {
        setError("Purchase reference is missing.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/packages/purchase?purchaseOrderId=${encodeURIComponent(
            purchaseOrderId
          )}`,
          { cache: "no-store" }
        );

        const data: PurchaseResponse = await response.json();

        if (response.status === 401) {
          const returnTo =
            window.location.pathname + window.location.search;

          router.replace(
            `/booking/verify?returnTo=${encodeURIComponent(returnTo)}`
          );
          return;
        }

        if (!response.ok || !data.success || !data.purchase) {
          throw new Error(
            data.error || "Unable to retrieve your purchase details."
          );
        }

        setPurchase(data.purchase);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading your purchase."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPurchase();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream grid place-items-center">
        <p className="text-sm text-muted">
          Confirming your package purchase...
        </p>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="min-h-screen bg-cream grid place-items-center px-5">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-ink">
            Purchase details unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted">
            {error || "We could not retrieve your purchase details."}
          </p>

          <p className="mt-3 text-xs leading-5 text-muted">
            If your payment was deducted, please contact NestOS Services
            support with your payment reference.
          </p>

          <Link
            href="/packages/catalogue"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-6 text-sm font-semibold text-white"
          >
            Return to packages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <section className="bg-forest text-white">
        <div className="container-shell py-12 text-center md:py-16">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-lime text-forest">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-8"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                d="m5 12 4 4L19 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-lime">
            Payment confirmed
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Your package is active!
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Your payment has been verified and your prepaid wash credits
            have been added to your account.
          </p>
        </div>
      </section>

      <section className="container-shell py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Purchased package
                </p>
                <h2 className="mt-2 text-2xl font-bold text-forest">
                  {purchase.packageName}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {purchase.societyName}
                </p>
              </div>

              <span className="rounded-full bg-lime/30 px-3 py-1.5 text-xs font-semibold text-forest">
                Active
              </span>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-cream p-4">
                <p className="text-sm text-muted">Credits purchased</p>
                <p className="mt-2 text-3xl font-bold text-forest">
                  {purchase.creditsPurchased}
                </p>
              </div>

              <div className="rounded-2xl bg-cream p-4">
                <p className="text-sm text-muted">Credits remaining</p>
                <p className="mt-2 text-3xl font-bold text-forest">
                  {purchase.creditsRemaining}
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-4 border-t border-border pt-6">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted">Amount paid</span>
                <span className="font-semibold text-ink">
                  {formatPrice(purchase.price, purchase.currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted">Validity</span>
                <span className="font-semibold text-ink">
                  {formatValidity(purchase.validityMonths)}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted">Valid until</span>
                <span className="font-semibold text-ink">
                  {formatDate(purchase.expiresAt)}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted">Payment date</span>
                <span className="font-semibold text-ink">
                  {formatDateTime(purchase.paidAt)}
                </span>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted">
                  Purchase reference
                </p>
                <p className="mt-1 break-all font-mono text-xs text-ink">
                  {purchase.purchaseOrderId}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted">
                  Razorpay payment reference
                </p>
                <p className="mt-1 break-all font-mono text-xs text-ink">
                  {purchase.paymentId}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/packages"
              className="flex min-h-12 items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white transition hover:bg-ink"
            >
              View my packages
            </Link>

            <Link
              href="/services"
              className="flex min-h-12 items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-semibold text-ink transition hover:border-forest"
            >
              Book a wash
            </Link>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-muted">
            Package credits are valid for eligible services at the
            purchased society. Buying a package does not create a wash booking.
          </p>
        </div>
      </section>
    </div>
  );
}
