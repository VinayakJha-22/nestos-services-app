
"use client";

import { useState } from "react";
import {
  bookings,
  societies,
  serviceStatuses,
} from "@/lib/operations/bookings";


const statusStyles: Record<string, string> = {
  Confirmed: "bg-blue-50 text-blue-700",
  Assigned: "bg-amber-50 text-amber-700",
  "In Progress": "bg-purple-50 text-purple-700",
  Completed: "bg-green-50 text-green-700",
  Cancelled: "bg-red-50 text-red-700",
};

const paymentStyles: Record<string, string> = {
  Paid: "bg-green-50 text-green-700",
  Pending: "bg-amber-50 text-amber-700",
  "Refund Pending": "bg-orange-50 text-orange-700",
};

export default function OperationsBookingsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [societyFilter, setSocietyFilter] = useState("All");

  const filteredBookings = bookings.filter((booking) => {
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
            <p className="mt-1 text-xl font-bold">{bookings.length}</p>
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
                    className="transition hover:bg-gray-50"
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
                      Today, {booking.slot}
                    </td>

                    <td className="px-5 py-4">{booking.service}</td>

                    <td className="px-5 py-4 font-medium whitespace-nowrap">
                      ₹{booking.amount}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[booking.status] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                          paymentStyles[booking.payment] ??
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

      <p className="text-xs text-gray-500">
        Preview data only. Customer details, booking statuses and payment
        records are illustrative, not live production data.
      </p>
    </div>
  );
}
