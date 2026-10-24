
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type BookingStatus =
  | "Confirmed"
  | "Completed"
  | "Cancelled"
  | "Refunded";

type PaymentStatus = "Paid" | "Refunded" | "Not paid";

type Booking = {
  id: string;
  service: string;
  society: string;
  date: string;
  time: string;
  vehicle: string;
  amount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
};

type RequestType = "Cancellation" | "Rescheduling";

const demoBookings: Booking[] = [
  {
    id: "NOS-DEMO-1042",
    service: "Exterior + Interior Cleaning",
    society: "Amrapali Kingswood & Golfhomes",
    date: "2026-10-24",
    time: "08:00 AM",
    vehicle: "Hatchback",
    amount: 499,
    status: "Confirmed",
    paymentStatus: "Paid",
  },
  {
    id: "NOS-DEMO-1031",
    service: "Exterior Cleaning",
    society: "Amrapali Kingswood & Golfhomes",
    date: "2026-10-12",
    time: "09:00 AM",
    vehicle: "Sedan",
    amount: 349,
    status: "Completed",
    paymentStatus: "Paid",
  },
  {
    id: "NOS-DEMO-1025",
    service: "Premium Cleaning",
    society: "Amrapali Kingswood & Golfhomes",
    date: "2026-10-05",
    time: "10:00 AM",
    vehicle: "SUV",
    amount: 899,
    status: "Cancelled",
    paymentStatus: "Refunded",
  },
  {
    id: "NOS-DEMO-1018",
    service: "Exterior Cleaning",
    society: "Amrapali Kingswood & Golfhomes",
    date: "2026-09-28",
    time: "11:00 AM",
    vehicle: "Hatchback",
    amount: 349,
    status: "Refunded",
    paymentStatus: "Refunded",
  },
];

const statusStyles: Record<BookingStatus, string> = {
  Confirmed: "bg-emerald-50 text-emerald-800",
  Completed: "bg-stone-100 text-stone-700",
  Cancelled: "bg-red-50 text-red-700",
  Refunded: "bg-violet-50 text-violet-700",
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MyBookingsPage() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [request, setRequest] = useState<{
    booking: Booking;
    type: RequestType;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [requestedTime, setRequestedTime] = useState("");
  const [notice, setNotice] = useState("");

  const today = "2026-10-23";

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return demoBookings.filter((booking) => {
      const isUpcoming =
        booking.status === "Confirmed" && booking.date >= today;

      const matchesFilter =
        filter === "All" ||
        (filter === "Upcoming" && isUpcoming) ||
        (filter === "History" && !isUpcoming);

      const matchesSearch =
        !query ||
        booking.id.toLowerCase().includes(query) ||
        booking.service.toLowerCase().includes(query) ||
        booking.society.toLowerCase().includes(query) ||
        booking.status.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

  function openRequest(booking: Booking, type: RequestType) {
    setNotice("");
    setReason("");
    setRequestedDate("");
    setRequestedTime("");
    setRequest({ booking, type });
  }

  function submitPreviewRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!request) return;

    // Preview only. No request is saved or sent to a manager.
    setNotice(
      `${request.type} request preview completed for ${request.booking.id}. No real request was submitted.`
    );
    setRequest(null);
    setExpandedId(null);
  }

  return (
    <div className="min-h-screen bg-cream">
      <section className="bg-forest text-white">
        <div className="container-shell py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">
            Your NestOS account
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            My Bookings
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            View your appointments, revisit past washes, and manage
            cancellation or rescheduling requests.
          </p>
        </div>
      </section>

      <section className="container-shell py-8 md:py-12">
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-950">
            Development preview — sample bookings
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            These records are illustrative and are not retrieved from your
            account. Request actions below do not update bookings or notify
            a manager.
          </p>
        </div>

        {notice && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-border bg-white p-4 text-sm text-ink"
          >
            {notice}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="text-sm text-muted">Upcoming</p>
            <p className="mt-2 text-3xl font-bold text-forest">
              {
                demoBookings.filter(
                  (b) => b.status === "Confirmed" && b.date >= today
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="text-sm text-muted">Completed</p>
            <p className="mt-2 text-3xl font-bold text-ink">
              {demoBookings.filter((b) => b.status === "Completed").length}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="text-sm text-muted">Past bookings</p>
            <p className="mt-2 text-3xl font-bold text-ink">
              {demoBookings.filter((b) => b.date < today).length}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {["All", "Upcoming", "History"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  filter === item
                    ? "bg-forest text-white"
                    : "border border-border bg-white text-ink hover:border-forest"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search bookings..."
            aria-label="Search bookings"
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none focus:border-forest sm:max-w-xs"
          />
        </div>

        <div className="mt-6 space-y-4">
          {filteredBookings.map((booking) => {
            const expanded = expandedId === booking.id;
            const isUpcoming =
              booking.status === "Confirmed" && booking.date >= today;

            return (
              <article
                key={booking.id}
                className="overflow-hidden rounded-2xl border border-border bg-white"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(expanded ? null : booking.id)
                  }
                  aria-expanded={expanded}
                  className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-stone-50 sm:p-6"
                >
                  <div className="flex w-full flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted">
                        Booking reference · {booking.id}
                      </p>
                      <h2 className="mt-2 text-lg font-bold text-ink">
                        {booking.service}
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        {booking.society}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[booking.status]}`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                      <span>{formatDate(booking.date)}</span>
                      <span>{booking.time}</span>
                      <span>{booking.vehicle}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-ink">
                        ₹{booking.amount}
                      </span>
                      <span className="text-xs font-semibold text-forest">
                        {expanded ? "Close −" : "Details +"}
                      </span>
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-border bg-stone-50 p-5 sm:p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Payment status
                        </p>
                        <p className="mt-1 font-semibold text-ink">
                          {booking.paymentStatus}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Vehicle
                        </p>
                        <p className="mt-1 font-semibold text-ink">
                          {booking.vehicle}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Appointment
                        </p>
                        <p className="mt-1 font-semibold text-ink">
                          {formatDate(booking.date)} · {booking.time}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Total amount
                        </p>
                        <p className="mt-1 font-semibold text-ink">
                          ₹{booking.amount}
                        </p>
                      </div>
                    </div>

                    {booking.paymentStatus === "Refunded" && (
                      <p className="mt-4 rounded-xl bg-violet-50 p-3 text-sm leading-6 text-violet-900">
                        Refund status: Refunded. In production, the actual
                        refund status will come from the backend.
                      </p>
                    )}

                    {isUpcoming && (
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            openRequest(booking, "Rescheduling")
                          }
                          className="rounded-full border border-forest px-4 py-2.5 text-sm font-semibold text-forest hover:bg-white"
                        >
                          Request rescheduling
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openRequest(booking, "Cancellation")
                          }
                          className="rounded-full border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-white"
                        >
                          Request cancellation
                        </button>
                      </div>
                    )}

                    {isUpcoming && (
                      <p className="mt-3 text-xs leading-5 text-muted">
                        Requests require manager approval. Your existing
                        booking remains unchanged until a request is approved.
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          {filteredBookings.length === 0 && (
            <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center">
              <h2 className="text-lg font-bold text-ink">
                No bookings found
              </h2>
              <p className="mt-2 text-sm text-muted">
                Try another search or filter, or explore our services.
              </p>
              <Link
                href="/services"
                className="mt-5 inline-flex rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white hover:bg-ink"
              >
                Explore services
              </Link>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/services"
            className="inline-flex rounded-full bg-lime px-6 py-3 text-sm font-bold text-ink transition hover:brightness-95"
          >
            Book another wash →
          </Link>
        </div>
      </section>

      {request && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-5"
          onClick={() => setRequest(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {request.booking.id}
                </p>
                <h2
                  id="request-title"
                  className="mt-2 text-2xl font-bold text-ink"
                >
                  Request {request.type.toLowerCase()}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setRequest(null)}
                aria-label="Close request form"
                className="rounded-full border border-border px-3 py-1.5 text-ink hover:bg-cream"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-muted">
              {request.type === "Cancellation"
                ? "Tell us why you need to cancel. The existing booking stays unchanged until a manager reviews the request."
                : "Choose your preferred replacement date and time. This is a request only; your current appointment remains unchanged until approval."}
            </p>

            <form onSubmit={submitPreviewRequest} className="mt-6 space-y-5">
              {request.type === "Rescheduling" && (
                <>
                  <div>
                    <label
                      htmlFor="requested-date"
                      className="block text-sm font-semibold text-ink"
                    >
                      Preferred new date
                    </label>
                    <input
                      id="requested-date"
                      type="date"
                      required
                      min={today}
                      value={requestedDate}
                      onChange={(event) =>
                        setRequestedDate(event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm text-ink outline-none focus:border-forest"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="requested-time"
                      className="block text-sm font-semibold text-ink"
                    >
                      Preferred time
                    </label>
                    <select
                      id="requested-time"
                      required
                      value={requestedTime}
                      onChange={(event) =>
                        setRequestedTime(event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none focus:border-forest"
                    >
                      <option value="">Select a preferred time</option>
                      <option value="08:00 AM">08:00 AM</option>
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="03:00 PM">03:00 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                    </select>
                    <p className="mt-2 text-xs leading-5 text-muted">
                      These are preview choices, not verified available slots.
                    </p>
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="request-reason"
                  className="block text-sm font-semibold text-ink"
                >
                  Reason {request.type === "Cancellation" ? "(required)" : "(optional)"}
                </label>
                <textarea
                  id="request-reason"
                  required={request.type === "Cancellation"}
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={
                    request.type === "Cancellation"
                      ? "Tell us why you need to cancel"
                      : "Add any details for the manager"
                  }
                  className="mt-2 w-full resize-y rounded-xl border border-border px-4 py-3 text-sm text-ink outline-none focus:border-forest"
                />
              </div>

              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-5 text-amber-950">
                Preview only: submitting this form will not save or send a
                real request.
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="min-h-12 flex-1 rounded-full bg-forest px-5 text-sm font-semibold text-white hover:bg-ink"
                >
                  Preview request
                </button>
                <button
                  type="button"
                  onClick={() => setRequest(null)}
                  className="min-h-12 rounded-full border border-border px-5 text-sm font-semibold text-ink hover:bg-cream"
                >
                  Go back
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
