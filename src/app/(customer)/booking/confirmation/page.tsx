
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Booking = {
  id: string;
  bookingReference: string;
  societyName: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  vehicleType: string;
  vehicleDetails: string | null;
  pricing: {
    baseServicePrice: number;
    vehicleSurcharge: number;
    totalAmount: number;
    currency: string;
  };
  bookingStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  confirmedAt: string | null;
  createdAt: string;
};

type BookingResponse = {
  success: boolean;
  error?: string;
  booking?: Booking;
};

type BookingState =
  | "confirmed"
  | "pending"
  | "failed"
  | "refund_pending"
  | "refunded"
  | "expired";

function formatDate(value: string) {
  const date = value.slice(0, 10);
  const [year, month, day] = date.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function getBookingState(booking: Booking): BookingState {
  if (booking.paymentStatus === "refund_pending") {
    return "refund_pending";
  }

  if (booking.paymentStatus === "refunded") {
    return "refunded";
  }

  if (
    booking.paymentStatus === "paid" &&
    ["confirmed", "assigned", "in_progress", "completed"].includes(
      booking.bookingStatus
    )
  ) {
    return "confirmed";
  }

  if (booking.paymentStatus === "failed") {
    return "failed";
  }

  if (["expired", "cancelled"].includes(booking.bookingStatus)) {
    return "expired";
  }

  return "pending";
}

function BookingConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastChecked, setLastChecked] = useState("");

  const fetchBookingStatus = useCallback(async () => {
    if (!bookingId) {
      setError("Booking reference is missing.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/bookings/status?bookingId=${encodeURIComponent(bookingId)}`,
        { cache: "no-store" }
      );

      const data: BookingResponse = await response.json();

      if (response.status === 401) {
        const returnTo =
          window.location.pathname + window.location.search;

        router.replace(
          `/booking/verify?returnTo=${encodeURIComponent(returnTo)}`
        );
        return;
      }

      if (!response.ok || !data.success || !data.booking) {
        throw new Error(
          data.error || "Unable to retrieve your booking."
        );
      }

      setBooking(data.booking);
      setError("");

      setLastChecked(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to retrieve booking status."
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId, router]);

  useEffect(() => {
    fetchBookingStatus();
  }, [fetchBookingStatus]);

  // Refresh while the Razorpay webhook is still processing payment.
  useEffect(() => {
    if (!booking) return;

    if (getBookingState(booking) !== "pending") return;

    const timer = window.setInterval(() => {
      fetchBookingStatus();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [booking, fetchBookingStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream grid place-items-center px-5">
        <div className="text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-4 border-forest/20 border-t-forest" />
          <p className="mt-5 text-sm text-muted">
            Retrieving your booking details...
          </p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <main className="min-h-screen bg-cream grid place-items-center px-5">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-ink">
            Unable to load booking
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted">
            {error}
          </p>

          <button
            type="button"
            onClick={fetchBookingStatus}
            className="mt-6 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white hover:bg-ink"
          >
            Try again
          </button>

          <Link
            href="/services"
            className="mt-4 block text-sm font-semibold text-forest hover:underline"
          >
            Back to services
          </Link>
        </div>
      </main>
    );
  }

  if (!booking) return null;

  const state = getBookingState(booking);
  const currency = booking.pricing.currency || "INR";

  const stateContent: Record<
    BookingState,
    {
      title: string;
      description: string;
      icon: string;
      color: string;
    }
  > = {
    confirmed: {
      title: "Your booking is confirmed!",
      description:
        "Your payment has been verified and your car wash appointment is confirmed.",
      icon: "✓",
      color: "border-green-200 bg-green-50 text-green-900",
    },
    pending: {
      title: "Verifying your payment",
      description:
        "We have received the payment response. We are checking the payment with our secure payment system. Please keep this page open.",
      icon: "…",
      color: "border-amber-200 bg-amber-50 text-amber-950",
    },
    failed: {
      title: "Payment was not successful",
      description:
        "Your payment could not be completed. Please contact support if money was deducted from your account.",
      icon: "!",
      color: "border-red-200 bg-red-50 text-red-900",
    },
    refund_pending: {
      title: "Refund processing required",
      description:
        "Your payment was received after the booking reservation expired. The booking is not confirmed and the payment requires refund processing.",
      icon: "!",
      color: "border-amber-200 bg-amber-50 text-amber-950",
    },
    refunded: {
      title: "Payment refunded",
      description:
        "The payment associated with this booking has been marked as refunded.",
      icon: "✓",
      color: "border-green-200 bg-green-50 text-green-900",
    },
    expired: {
      title: "Booking reservation expired",
      description:
        "This booking is no longer active. If a payment was deducted, please contact support with your booking reference.",
      icon: "!",
      color: "border-red-200 bg-red-50 text-red-900",
    },
  };

  const currentState = stateContent[state];

  return (
    <main className="min-h-screen bg-cream">
      <section className="bg-forest text-white">
        <div className="container-shell py-12 text-center md:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">
            NestOS Services
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Booking update
          </h1>

          <p className="mt-3 text-sm text-white/75">
            Your appointment details and payment status.
          </p>
        </div>
      </section>

      <section className="container-shell py-10 md:py-14">
        <div className="mx-auto max-w-2xl space-y-6">
          <div
            role="status"
            aria-live="polite"
            className={`rounded-3xl border p-6 sm:p-8 ${currentState.color}`}
          >
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-full bg-white/70 text-2xl font-bold">
                {currentState.icon}
              </div>

              <div>
                <h2 className="text-xl font-bold sm:text-2xl">
                  {currentState.title}
                </h2>

                <p className="mt-2 text-sm leading-6">
                  {currentState.description}
                </p>

                {state === "pending" && (
                  <p className="mt-3 text-xs font-medium">
                    Automatically checking for updates every 3 seconds.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Booking reference
                </p>

                <h2 className="mt-2 text-xl font-bold text-forest">
                  {booking.bookingReference}
                </h2>
              </div>

              <span className="rounded-full bg-cream px-3 py-1.5 text-xs font-semibold capitalize text-ink">
                {booking.bookingStatus.replaceAll("_", " ")}
              </span>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Service
                </p>
                <p className="mt-2 font-semibold text-ink">
                  {booking.serviceName}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Society
                </p>
                <p className="mt-2 font-semibold text-ink">
                  {booking.societyName}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Appointment date
                </p>
                <p className="mt-2 font-semibold text-ink">
                  {formatDate(booking.date)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Appointment time
                </p>
                <p className="mt-2 font-semibold text-ink">
                  {formatTime(booking.startTime)} –{" "}
                  {formatTime(booking.endTime)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Vehicle
                </p>
                <p className="mt-2 font-semibold capitalize text-ink">
                  {booking.vehicleType}
                </p>

                {booking.vehicleDetails && (
                  <p className="mt-1 text-sm text-muted">
                    {booking.vehicleDetails}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Payment method
                </p>
                <p className="mt-2 font-semibold capitalize text-ink">
                  {booking.paymentMethod.replaceAll("_", " ")}
                </p>
              </div>
            </div>

            <div className="mt-7 border-t border-border pt-6">
              <h3 className="font-bold text-ink">Payment summary</h3>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Service amount</span>
                  <span className="font-medium text-ink">
                    {formatMoney(
                      booking.pricing.baseServicePrice,
                      currency
                    )}
                  </span>
                </div>

                {booking.pricing.vehicleSurcharge > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted">Vehicle surcharge</span>
                    <span className="font-medium text-ink">
                      {formatMoney(
                        booking.pricing.vehicleSurcharge,
                        currency
                      )}
                    </span>
                  </div>
                )}

                <div className="flex justify-between gap-4 border-t border-border pt-4">
                  <span className="font-semibold text-ink">
                    Total amount
                  </span>
                  <span className="text-xl font-bold text-forest">
                    {formatMoney(
                      booking.pricing.totalAmount,
                      currency
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-muted">Payment status</span>
                  <span className="font-semibold capitalize text-ink">
                    {booking.paymentStatus.replaceAll("_", " ")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {error && booking && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              We could not refresh the latest status. We will try again
              automatically.
            </div>
          )}

          {state === "confirmed" && (
            <div className="rounded-2xl border border-border bg-white p-5 text-sm text-muted">
              Your appointment is confirmed. Please arrive at the selected
              society at your scheduled time.
            </div>
          )}

          {state === "refund_pending" && (
            <div className="rounded-2xl border border-border bg-white p-5 text-sm leading-6 text-muted">
              Please retain your booking reference for support enquiries.
              This payment has not been automatically refunded by the
              current integration.
            </div>
          )}

          {state === "refunded" && (
            <div className="rounded-2xl border border-border bg-white p-5 text-sm leading-6 text-muted">
              The payment status is marked as refunded. Please retain your
              booking reference for your records.
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/services"
              className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white transition hover:bg-ink"
            >
              Explore services
            </Link>

            {state !== "pending" && (
              <button
                type="button"
                onClick={fetchBookingStatus}
                className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-semibold text-forest transition hover:bg-cream"
              >
                Refresh booking status
              </button>
            )}
          </div>

          {lastChecked && (
            <p className="text-center text-xs text-muted">
              Last checked at {lastChecked}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream grid place-items-center px-5">
          <div className="text-center">
            <div className="mx-auto size-10 animate-spin rounded-full border-4 border-forest/20 border-t-forest" />
            <p className="mt-5 text-sm text-muted">
              Loading booking confirmation...
            </p>
          </div>
        </div>
      }
    >
      <BookingConfirmationContent />
    </Suspense>
  );
}
