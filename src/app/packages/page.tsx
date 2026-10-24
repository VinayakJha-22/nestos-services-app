
"use client";

import { useState } from "react";
import Link from "next/link";

type PackageStatus = "Active" | "Exhausted" | "Expired";

type WashPackage = {
  id: string;
  name: string;
  society: string;
  purchasedOn: string;
  expiresOn: string;
  totalCredits: number;
  usedCredits: number;
  amountPaid: number;
  status: PackageStatus;
};

const demoPackages: WashPackage[] = [
  {
    id: "PKG-DEMO-201",
    name: "Essential Wash Package",
    society: "Amrapali Kingswood & Golfhomes",
    purchasedOn: "2026-10-01",
    expiresOn: "2026-12-31",
    totalCredits: 10,
    usedCredits: 3,
    amountPaid: 2999,
    status: "Active",
  },
  {
    id: "PKG-DEMO-184",
    name: "Everyday Car Care",
    society: "Amrapali Kingswood & Golfhomes",
    purchasedOn: "2026-07-01",
    expiresOn: "2026-09-30",
    totalCredits: 5,
    usedCredits: 5,
    amountPaid: 1499,
    status: "Exhausted",
  },
];

const statusStyles: Record<PackageStatus, string> = {
  Active: "bg-emerald-50 text-emerald-800",
  Exhausted: "bg-stone-100 text-stone-700",
  Expired: "bg-red-50 text-red-700",
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MyPackagesPage() {
  const [showHistory, setShowHistory] = useState(true);

  const activePackages = demoPackages.filter(
    (item) =>
      item.status === "Active" &&
      item.usedCredits < item.totalCredits
  );

  const totalRemaining = activePackages.reduce(
    (total, item) => total + item.totalCredits - item.usedCredits,
    0
  );

  const totalUsed = demoPackages.reduce(
    (total, item) => total + item.usedCredits,
    0
  );

  const historyPackages = demoPackages.filter(
    (item) => item.status !== "Active"
  );

  return (
    <div className="min-h-screen bg-cream">
      <section className="bg-forest text-white">
        <div className="container-shell py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">
            Your NestOS account
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            My Packages
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Keep track of your prepaid washes, remaining credits and
            previous packages.
          </p>
        </div>
      </section>

      <section className="container-shell py-8 md:py-12">
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-950">
            Development preview — sample package data
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            These packages and balances are illustrative, not your actual
            account. Package purchasing, credit deductions and expiry
            checks are not connected to the backend yet.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="text-sm text-muted">Active packages</p>
            <p className="mt-2 text-3xl font-bold text-forest">
              {activePackages.length}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="text-sm text-muted">Washes remaining</p>
            <p className="mt-2 text-3xl font-bold text-forest">
              {totalRemaining}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="text-sm text-muted">Credits used (history)</p>
            <p className="mt-2 text-3xl font-bold text-ink">
              {totalUsed}
            </p>
          </div>
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-ink">
              Your active packages
            </h2>
            <p className="mt-1 text-sm text-muted">
              Prepaid credits available for eligible washes.
            </p>
          </div>

          <Link
            href="/services"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-lime px-5 text-sm font-bold text-ink transition hover:brightness-95"
          >
            Explore services →
          </Link>
        </div>

        <div className="mt-5 space-y-5">
          {activePackages.length > 0 ? (
            activePackages.map((item) => {
              const remaining = item.totalCredits - item.usedCredits;
              const progress = Math.min(
                100,
                (item.usedCredits / item.totalCredits) * 100
              );

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-border bg-white"
                >
                  <div className="bg-forest p-6 text-white sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-lime">
                          Prepaid wash package
                        </p>
                        <h3 className="mt-2 text-2xl font-bold">
                          {item.name}
                        </h3>
                        <p className="mt-2 text-sm text-white/70">
                          {item.society}
                        </p>
                      </div>

                      <span className="rounded-full bg-lime px-3 py-1.5 text-xs font-bold text-forest">
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-8 grid gap-5 sm:grid-cols-3">
                      <div>
                        <p className="text-sm text-white/70">
                          Total credits
                        </p>
                        <p className="mt-1 text-3xl font-bold">
                          {item.totalCredits}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-white/70">
                          Credits used
                        </p>
                        <p className="mt-1 text-3xl font-bold">
                          {item.usedCredits}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-white/70">
                          Remaining
                        </p>
                        <p className="mt-1 text-3xl font-bold text-lime">
                          {remaining}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-semibold text-ink">
                        Package usage
                      </span>
                      <span className="text-muted">
                        {item.usedCredits} of {item.totalCredits} used
                      </span>
                    </div>

                    <div
                      className="mt-3 h-3 overflow-hidden rounded-full bg-cream"
                      role="progressbar"
                      aria-label="Package credits used"
                      aria-valuemin={0}
                      aria-valuemax={item.totalCredits}
                      aria-valuenow={item.usedCredits}
                    >
                      <div
                        className="h-full rounded-full bg-forest transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Purchased on
                        </p>
                        <p className="mt-1 font-semibold text-ink">
                          {formatDate(item.purchasedOn)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Valid until
                        </p>
                        <p className="mt-1 font-semibold text-ink">
                          {formatDate(item.expiresOn)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
                      <div>
                        <p className="text-xs text-muted">Purchase amount</p>
                        <p className="mt-1 text-lg font-bold text-ink">
                          ₹{item.amountPaid.toLocaleString("en-IN")}
                        </p>
                      </div>

                      <Link
                        href="/services"
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest px-5 text-sm font-semibold text-forest transition hover:bg-cream"
                      >
                        Browse washes
                      </Link>
                    </div>

                    <p className="mt-4 text-xs leading-5 text-muted">
                      Using package credits during checkout is not
                      connected yet. Booking through the services page
                      does not deduct credits in this preview.
                    </p>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-border bg-white p-8 text-center">
              <h3 className="font-bold text-ink">
                No active packages
              </h3>
              <p className="mt-2 text-sm text-muted">
                Your active prepaid packages will appear here.
              </p>
            </div>
          )}
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-white">
          <button
            type="button"
            onClick={() => setShowHistory((current) => !current)}
            aria-expanded={showHistory}
            className="flex w-full items-center justify-between gap-4 p-6 text-left sm:p-7"
          >
            <div>
              <h2 className="text-xl font-bold text-ink">
                Package history
              </h2>
              <p className="mt-1 text-sm text-muted">
                Previously exhausted, expired or inactive packages.
              </p>
            </div>

            <span className="text-sm font-semibold text-forest">
              {showHistory ? "Hide −" : "View +"}
            </span>
          </button>

          {showHistory && (
            <div className="border-t border-border">
              {historyPackages.length > 0 ? (
                historyPackages.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 border-b border-border p-6 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-bold text-ink">
                          {item.name}
                        </h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-muted">
                        Purchased {formatDate(item.purchasedOn)}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {item.usedCredits} of {item.totalCredits} credits used
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="font-bold text-ink">
                        ₹{item.amountPaid.toLocaleString("en-IN")}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Ref: {item.id}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="p-6 text-sm text-muted">
                  No previous packages to display.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-white p-6 sm:p-8">
          <h2 className="text-lg font-bold text-ink">
            How prepaid credits work
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <li>
              • Credits are deducted only when an eligible booking is
              successfully confirmed by the backend.
            </li>
            <li>
              • The server must prevent duplicate deductions if payment
              or booking requests are retried.
            </li>
            <li>
              • Expiry, cancellation and credit-restoration rules will
              follow the final package policy.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
