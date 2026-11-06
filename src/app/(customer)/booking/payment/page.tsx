"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type VehicleType = "Hatchback" | "Sedan" | "SUV";

type BookingDraft = {
  societyId: string;
  serviceId: string;
  date: string;
  time: string;
  vehicle: VehicleType;
};

type Society = {
  id: string;
  name: string;
  locality: string;
  city: string;
  is_accepting_bookings: boolean;
};

type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  featured: boolean;
  duration_minutes: number | null;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme: { color: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal: { ondismiss: () => void };
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: string,
    callback: (response: {
      error?: {
        description?: string;
        reason?: string;
      };
    }) => void
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (
      options: RazorpayCheckoutOptions
    ) => RazorpayInstance;
  }
}

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
  const [society, setSociety] = useState<Society | null>(null);
  const [service, setService] = useState<Service | null>(null);

  const [ready, setReady] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const [bookingId, setBookingId] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [paymentReceived, setPaymentReceived] = useState(false);

  const [loadError, setLoadError] = useState("");

  // Check whether the customer has an active authenticated session.
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

        setCheckingAuth(false);
      } catch {
        const returnTo =
          window.location.pathname + window.location.search;

        window.location.replace(
          `/booking/verify?returnTo=${encodeURIComponent(returnTo)}`
        );
      }
    }

    checkAuthentication();
  }, []);

  // Load the Razorpay checkout script for one-time payments.
  // Prepaid bookings do not depend on Razorpay being available.
  useEffect(() => {
    if (window.Razorpay) return;

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) return;

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onerror = () => {
      setPaymentError(
        "Unable to load secure payment checkout. Please refresh the page or try again."
      );
    };

    document.body.appendChild(script);

    return () => {
      script.onerror = null;
    };
  }, []);

  // Load and validate the saved booking draft.
  useEffect(() => {
    let cancelled = false;

    async function loadBookingDetails() {
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

        const [societiesResponse, servicesResponse] = await Promise.all([
          fetch("/api/societies", { cache: "no-store" }),
          fetch(
            `/api/services?societyId=${encodeURIComponent(parsed.societyId)}`,
            { cache: "no-store" }
          ),
        ]);

        const societiesData = await societiesResponse.json();
        const servicesData = await servicesResponse.json();

        if (!societiesResponse.ok || !societiesData.success) {
          throw new Error("Unable to verify the selected society.");
        }

        if (!servicesResponse.ok || !servicesData.success) {
          throw new Error("Unable to load the selected service.");
        }

        const selectedSociety = societiesData.societies.find(
          (item: Society) => item.id === parsed.societyId
        );

        const selectedService = servicesData.services.find(
          (item: Service) => item.id === parsed.serviceId
        );

        if (!selectedSociety) {
          router.replace("/societies");
          return;
        }

        if (!selectedService) {
          router.replace("/services");
          return;
        }

        if (cancelled) return;

        setSociety(selectedSociety);
        setService(selectedService);

        setDraft({
          societyId: parsed.societyId,
          serviceId: parsed.serviceId,
          date: parsed.date,
          time: parsed.time,
          vehicle: parsed.vehicle as VehicleType,
        });

        setReady(true);
      } catch (error) {
        console.error("Failed to load booking details:", error);

        if (!cancelled) {
          setLoadError(
            "Unable to load your booking details. Please refresh the page."
          );
        }
      }
    }

    loadBookingDetails();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Reserve the slot, then either:
  // 1. Redirect immediately if prepaid credits were used.
  // 2. Continue to Razorpay for a one-time payment.
  async function handlePayment() {
    if (!draft || processingPayment || paymentReceived) return;

    setProcessingPayment(true);
    setPaymentError("");
    setPaymentMessage("");

    try {
      let currentBookingId = bookingId;

      // A. Create the booking reservation.
      if (!currentBookingId) {
        const reserveResponse = await fetch("/api/bookings/reserve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            societyId: draft.societyId,
            serviceId: draft.serviceId,
            date: draft.date,
            time: draft.time,
            vehicleType: draft.vehicle.toLowerCase(),
          }),
        });

        const reserveData = await reserveResponse.json();

        if (!reserveResponse.ok || !reserveData.success) {
          throw new Error(
            reserveData.error || "Unable to reserve your selected slot."
          );
        }

        currentBookingId = reserveData.bookingId;

        setBookingId(currentBookingId);
        setBookingReference(reserveData.bookingReference);

        // Prepaid booking:
        // The reserve API has already deducted credits and confirmed
        // the booking. Do not create a Razorpay order.
        if (reserveData.paymentRequired === false) {
          router.replace(
            `/booking/confirmation?bookingId=${encodeURIComponent(
              currentBookingId
            )}`
          );
          return;
        }
      }

      // B. Create or reuse the Razorpay order for one-time bookings.
      const orderResponse = await fetch("/api/bookings/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: currentBookingId }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok || !orderData.success) {
        throw new Error(
          orderData.error || "Unable to create payment order."
        );
      }

      if (!window.Razorpay) {
        throw new Error(
          "Secure checkout has not loaded. Please try again."
        );
      }

      // C. Open Razorpay Checkout.
      const checkout = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "NestOS Services",
        description: `${service?.name || "Car wash"} booking`,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.customer?.name || "",
          email: orderData.customer?.email || "",
          contact: orderData.customer?.contact || "",
        },
        theme: { color: "#174C3D" },

        handler: () => {
          router.replace(
            `/booking/confirmation?bookingId=${encodeURIComponent(
              currentBookingId
            )}`
          );
        },

        modal: {
          ondismiss: () => {
            setProcessingPayment(false);
            setPaymentMessage("");
          },
        },
      });

      checkout.on("payment.failed", (response) => {
        setProcessingPayment(false);
        setPaymentMessage("");

        setPaymentError(
          response.error?.description ||
            "Payment failed. Please try again."
        );
      });

      checkout.open();
    } catch (error) {
      setProcessingPayment(false);

      setPaymentError(
        error instanceof Error
          ? error.message
          : "Unable to initiate payment."
      );
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-cream grid place-items-center">
        <p className="text-sm text-muted">Checking your account...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container-shell py-20 text-center text-red-600">
        {loadError}
      </div>
    );
  }

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
            Review your booking and service amount before proceeding.
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
                    {paymentReceived
                      ? "Payment verification pending"
                      : bookingId
                        ? "Slot temporarily reserved"
                        : "Awaiting confirmation"}
                  </p>

                  {bookingReference && (
                    <p className="mt-1 text-xs text-muted">
                      Reference: {bookingReference}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {paymentError && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800"
              >
                {paymentError}
              </div>
            )}

            {paymentMessage && (
              <div
                role="status"
                className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm leading-6 text-green-900"
              >
                {paymentMessage}
              </div>
            )}
          </div>

          <aside className="h-fit rounded-3xl border border-border bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-xl font-bold text-ink">
              Price summary
            </h2>

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
                    Service amount
                  </span>

                  <span className="text-2xl font-bold text-forest">
                    ₹{total}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-5 text-muted">
                  If you have an eligible prepaid package, the required
                  credits will be deducted automatically. Otherwise, you
                  will pay this amount through secure checkout.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePayment}
              disabled={processingPayment || paymentReceived}
              className="mt-7 flex min-h-12 w-full items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paymentReceived
                ? "Payment received"
                : processingPayment
                  ? "Processing..."
                  : "Continue →"}
            </button>

            <Link
              href="/booking/review"
              className="mt-4 block text-center text-sm font-semibold text-forest hover:underline"
            >
              Return to booking review
            </Link>

            <p className="mt-6 text-center text-xs leading-5 text-muted">
              Eligible prepaid bookings are confirmed after credit
              deduction. Other bookings are confirmed after successful
              payment verification.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}