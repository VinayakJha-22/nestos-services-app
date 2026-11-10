
"use client";

import { useState } from "react";
import {
  bookings,
  societies,
  serviceStatuses,
  changeRequests,
  bookingActivities,
} from "@/lib/operations/bookings";


const statusStyles: Record<string, string> = {
  Confirmed: "bg-blue-50 text-blue-700",
  Assigned: "bg-amber-50 text-amber-700",
  "In Progress": "bg-purple-50 text-purple-700",
  Completed: "bg-green-50 text-green-700",
  Cancelled: "bg-red-50 text-red-700",
};


const statusTimeline = [
  "Confirmed",
  "Assigned",
  "In Progress",
  "Completed",
] as const;


const allowedStatusTransitions: Record<
  (typeof serviceStatuses)[number],
  (typeof serviceStatuses)[number][]
> = {
  Confirmed: ["Assigned", "Cancelled"],
  Assigned: ["In Progress", "Cancelled"],
  "In Progress": ["Completed"],
  Completed: [],
  Cancelled: [],
};


function getTimelineProgress(status: string) {
  if (status === "Cancelled") return -1;
  return statusTimeline.indexOf(
    status as (typeof statusTimeline)[number]
  );
}


const paymentStyles: Record<string, string> = {
  Paid: "bg-green-50 text-green-700",
  Pending: "bg-amber-50 text-amber-700",
  "Refund Pending": "bg-orange-50 text-orange-700",
};

export default function OperationsBookingsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [societyFilter, setSocietyFilter] = useState("All");
  const [selectedBooking, setSelectedBooking] =
    useState<(typeof bookings)[number] | null>(null);
  const [bookingRecords, setBookingRecords] = useState([...bookings]);
  const [activityRecords, setActivityRecords] = useState([...bookingActivities]);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] =
    useState<(typeof serviceStatuses)[number] | "">("");

  const filteredBookings = bookingRecords.filter((booking) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      booking.id.toLowerCase().includes(query) ||
      booking.customer.toLowerCase().includes(query) ||
      booking.phone.includes(query) ||
      booking.vehicle.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "All" || booking.status === statusFilter;

    const matchesSociety =
      societyFilter === "All" || booking.society === societyFilter;

    return matchesSearch && matchesStatus && matchesSociety;
  });

  const selectClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#174C3D]";
  function confirmStatusUpdate() {
    if (!selectedBooking || !pendingStatus) return;
    if (
      !allowedStatusTransitions[selectedBooking.status].includes(pendingStatus)
    ) {
      setPendingStatus("");
      setShowStatusConfirm(false);
      return;
    }
    if (selectedBooking.status === pendingStatus) return;

    const previousStatus = selectedBooking.status;
    const updatedBooking = {
      ...selectedBooking,
      status: pendingStatus,
    };

    setBookingRecords((current) =>
      current.map((booking) =>
        booking.id === selectedBooking.id ? updatedBooking : booking
      )
    );

    setSelectedBooking(updatedBooking);

    setActivityRecords((current) => [
      {
        id: `ACT-${Date.now()}`,
        bookingId: selectedBooking.id,
        type: "Status Changed",
        description: `Service status changed from ${previousStatus} to ${pendingStatus}.`,
        timestamp: new Date().toISOString(),
        performedBy: "Operations User (Preview)",
      },
      ...current,
    ]);

    setPendingStatus("");
    setShowStatusConfirm(false);
  }

  return (
    <div className="space-y-7">
      <section>
        <p className="text-sm font-semibold text-[#174C3D]">
          OPERATIONS / BOOKINGS
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
            <p className="mt-2 text-sm text-gray-500">
              Search and track customer bookings across your societies.
            </p>
          </div>

          <div className="rounded-xl border border-[#174C3D]/10 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">Bookings in this preview</p>
            <p className="mt-1 text-xl font-bold">{bookingRecords.length}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#174C3D]/10 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Search and filters</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="booking-search"
              className="mb-2 block text-sm font-medium text-gray-600"
            >
              Search bookings
            </label>
            <input
              id="booking-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Booking ID, customer, phone..."
              className={selectClass}
            />
          </div>

          <div>
            <label
              htmlFor="booking-status"
              className="mb-2 block text-sm font-medium text-gray-600"
            >
              Service status
            </label>
            <select
              id="booking-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={selectClass}
            >
              <option value="All">All statuses</option>
              {serviceStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="booking-society"
              className="mb-2 block text-sm font-medium text-gray-600"
            >
              Society / location
            </label>
            <select
              id="booking-society"
              value={societyFilter}
              onChange={(event) => setSocietyFilter(event.target.value)}
              className={selectClass}
            >
              <option value="All">All societies</option>
              {societies.map((society) => (
                <option key={society} value={society}>
                  {society}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Showing {filteredBookings.length} of {bookings.length} bookings
          </p>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("All");
              setSocietyFilter("All");
            }}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#174C3D] hover:bg-[#174C3D]/5"
          >
            Clear filters
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#174C3D]/10 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-5">
          <h2 className="text-lg font-bold">All bookings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Service progress and payment progress are tracked separately.
          </p>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="font-semibold">No bookings found</p>
            <p className="mt-2 text-sm text-gray-500">
              Try a different search or clear your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-[#F7F8F3] text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Booking</th>
                  <th className="px-5 py-4 font-semibold">Customer</th>
                  <th className="px-5 py-4 font-semibold">Vehicle</th>
                  <th className="px-5 py-4 font-semibold">Society</th>
                  <th className="px-5 py-4 font-semibold">Schedule</th>
                  <th className="px-5 py-4 font-semibold">Service</th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Service status</th>
                  <th className="px-5 py-4 font-semibold">Payment</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    className="cursor-pointer transition hover:bg-[#174C3D]/5"
                  >
                    <td className="px-5 py-4 font-semibold text-[#174C3D]">
                      {booking.id}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium">{booking.customer}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {booking.phone}
                      </p>
                    </td>

                    <td className="px-5 py-4">{booking.vehicle}</td>
                    <td className="px-5 py-4">{booking.society}</td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-medium">
                        {new Date(`${booking.date}T12:00:00`).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {booking.slot}
                      </p>
                    </td>

                    <td className="px-5 py-4">{booking.service}</td>

                    <td className="px-5 py-4 font-medium whitespace-nowrap">
                      ₹{booking.amount}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[booking.status] ??
                          "bg-gray-100 text-gray-700"
                          }`}
                      >
                        {booking.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${paymentStyles[booking.payment] ??
                          "bg-gray-100 text-gray-700"
                          }`}
                      >
                        {booking.payment}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => setSelectedBooking(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-detail-title"
            className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#174C3D]">
                  BOOKING DETAILS
                </p>
                <h2
                  id="booking-detail-title"
                  className="mt-2 text-2xl font-bold"
                >
                  {selectedBooking.id}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Complete booking information
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="mt-6 space-y-6">
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold">Customer</h3>
                <p className="mt-3 font-medium">{selectedBooking.customer}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedBooking.phone}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold">Appointment</h3>
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Service</dt>
                    <dd className="mt-1 font-medium">
                      {selectedBooking.service}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Vehicle</dt>
                    <dd className="mt-1 font-medium">
                      {selectedBooking.vehicle}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Society / location</dt>
                    <dd className="mt-1 font-medium">
                      {selectedBooking.society}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Date</dt>
                    <dd className="mt-1 font-medium">
                      {new Date(
                        `${selectedBooking.date}T12:00:00`
                      ).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Time slot</dt>
                    <dd className="mt-1 font-medium">
                      {selectedBooking.slot}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Change requests</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Cancellation and rescheduling requests for this booking.
                    </p>
                  </div>
                  <a
                    href="/operations/change-requests"
                    className="shrink-0 text-sm font-semibold text-[#174C3D] hover:underline"
                  >
                    View all
                  </a>
                </div>
                {(() => {
                  const relatedRequests = changeRequests.filter(
                    (request) => request.bookingId === selectedBooking.id
                  );
                  return relatedRequests.length === 0 ? (
                    <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                      No cancellation or rescheduling requests for this booking.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {relatedRequests.map((request) => (
                        <div
                          key={request.id}
                          className="rounded-xl border border-gray-100 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">{request.type}</p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${request.status === "Pending Review"
                                  ? "bg-amber-50 text-amber-700"
                                  : request.status === "Approved"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                            >
                              {request.status}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            Request ID: {request.id}
                          </p>
                          <p className="mt-2 text-sm text-gray-600">
                            {request.reason}
                          </p>
                          {request.type === "Rescheduling" &&
                            request.requestedDate && (
                              <p className="mt-2 text-sm">
                                <span className="text-gray-500">Requested appointment: </span>
                                <span className="font-medium">
                                  {new Date(
                                    `${request.requestedDate}T12:00:00`
                                  ).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                  {request.requestedSlot
                                    ? `, ${request.requestedSlot}`
                                    : ""}
                                </span>
                              </p>
                            )}

                          {request.decisionNote && (
                            <p className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Decision note: </span>
                              {request.decisionNote}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold">Activity log</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Recorded events for this booking.
                </p>

                {(() => {
                  const activities = activityRecords
                    .filter((activity) => activity.bookingId === selectedBooking.id)
                    .sort(
                      (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                    );

                  return activities.length === 0 ? (
                    <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                      No activity records available for this booking.
                    </p>
                  ) : (
                    <ol className="mt-4 space-y-4">
                      {activities.map((activity) => (
                        <li key={activity.id} className="flex gap-3">
                          <div className="mt-1 size-2 shrink-0 rounded-full bg-[#174C3D]" />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold">
                                {activity.type}
                              </p>
                              <time className="text-xs text-gray-500">
                                {new Date(activity.timestamp).toLocaleString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "Asia/Kolkata",
                                })}
                              </time>
                            </div>

                            <p className="mt-1 text-sm text-gray-600">
                              {activity.description}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              By: {activity.performedBy}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  );
                })()}
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold">Service status timeline</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Illustrative progression based on the current status, not an audit log.
                </p>

                {selectedBooking.status === "Cancelled" ? (
                  <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    This booking is cancelled. Check the related change request and
                    payment status separately.
                  </div>
                ) : (
                  <ol className="mt-5 space-y-4">
                    {statusTimeline.map((status, index) => {
                      const progress = getTimelineProgress(selectedBooking.status);
                      const isComplete = index <= progress;
                      const isCurrent = index === progress;

                      return (
                        <li key={status} className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${isComplete
                                ? "bg-[#174C3D] text-white"
                                : "border border-gray-300 bg-white text-gray-400"
                              }`}
                          >
                            {isComplete ? "✓" : index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{status}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {isCurrent
                                ? "Current status"
                                : index < progress
                                  ? "Previous stage (inferred)"
                                  : "Not reached"}
                            </p>
                          </div>

                          {isCurrent && (
                            <span className="rounded-full bg-[#174C3D]/10 px-2.5 py-1 text-xs font-semibold text-[#174C3D]">
                              Current
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold">Service and payment</h3>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-500">
                    Service status
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[selectedBooking.status] ??
                      "bg-gray-100 text-gray-700"
                      }`}
                  >
                    {selectedBooking.status}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-500">
                    Payment status
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentStyles[selectedBooking.payment] ??
                      "bg-gray-100 text-gray-700"
                      }`}
                  >
                    {selectedBooking.payment}
                  </span>
                </div>
                <div className="mt-5 border-t border-gray-100 pt-4">
                <label
                  htmlFor="booking-status-update"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Update service status
                </label>

                <select
                  id="booking-status-update"
                  value={pendingStatus}
                  onChange={(event) =>
                    setPendingStatus(
                      event.target.value as (typeof serviceStatuses)[number] | ""
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm"
                >
                  <option value="">Select a new status</option>       
                  {allowedStatusTransitions[selectedBooking.status].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!pendingStatus}
                  onClick={() => setShowStatusConfirm(true)}
                  className="mt-3 w-full rounded-xl bg-[#174C3D] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Review status change
                </button>
              </div>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-500">Booking amount</p>
                  <p className="mt-1 text-2xl font-bold">
                    ₹{selectedBooking.amount.toLocaleString("en-IN")}
                  </p>
                </div>
              
<div className="mt-4 grid grid-cols-2 gap-3">
  <div className="rounded-xl bg-gray-50 p-3">
    <p className="text-xs text-gray-500">Booking reference</p>
    <p className="mt-1 font-semibold">{selectedBooking.id}</p>
  </div>

  <div className="rounded-xl bg-gray-50 p-3">
    <p className="text-xs text-gray-500">Payment category</p>
    <p className="mt-1 font-semibold">
      {selectedBooking.payment === "Refund Pending"
        ? "Refund"
        : "Service payment"}
    </p>
  </div>
</div>

{selectedBooking.payment === "Pending" && (
  <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
    Payment is pending. Verify the payment provider record before treating
    this booking as paid.
  </p>
)}

{selectedBooking.payment === "Refund Pending" && (
  <p className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
    A refund is pending. Track the refund separately from the booking's
    cancellation status.
  </p>
)}

              </div>
            </div>
          </section>
          
                  {showStatusConfirm && selectedBooking && pendingStatus && (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4">
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="status-confirm-title"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <h3 id="status-confirm-title" className="text-lg font-bold">
                Confirm status change
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                Change booking {selectedBooking.id} from{" "}
                <strong>{selectedBooking.status}</strong> to{" "}
                <strong>{pendingStatus}</strong>?
              </p>

              <p className="mt-2 text-xs text-gray-500">
                This will add an activity entry in this preview session.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowStatusConfirm(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold"
                >
                  Go back
                </button>

                <button
                  type="button"
                  onClick={confirmStatusUpdate}
                  className="rounded-xl bg-[#174C3D] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Confirm change
                </button>
              </div>
            </section>
          </div>
        )}
        </div>
      )}
      <p className="text-xs text-gray-500">
        Preview data only. Customer details, booking statuses and payment
        records are illustrative, not live production data.
      </p>
    </div>
  );
}
