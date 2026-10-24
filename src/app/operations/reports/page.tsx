
"use client";

import { useMemo, useState } from "react";
import {
  bookings as sampleBookings,
  societies,
} from "@/lib/operations/bookings";

const serviceNames = [
  "Exterior Cleaning",
  "Exterior + Interior",
  "Premium Cleaning",
];

const statusStyles: Record<string, string> = {
  Confirmed: "bg-blue-50 text-blue-700",
  Assigned: "bg-amber-50 text-amber-700",
  "In Progress": "bg-purple-50 text-purple-700",
  Completed: "bg-green-50 text-green-700",
  Cancelled: "bg-red-50 text-red-700",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function OperationsReportsPage() {
  const [period, setPeriod] = useState("month");
  const [society, setSociety] = useState("All");

  const filteredBookings = useMemo(() => {
    return sampleBookings.filter((booking) => {
      const matchesSociety =
        society === "All" || booking.society === society;

      const bookingDate = new Date(`${booking.date}T12:00:00`);
      const startDate = new Date("2026-10-24T12:00:00");

      if (period === "today") {
        return matchesSociety && booking.date === "2026-10-24";
      }

      if (period === "week") {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() - 6);

        return (
          matchesSociety &&
          bookingDate >= weekStart &&
          bookingDate <= startDate
        );
      }

      return (
        matchesSociety &&
        bookingDate.getFullYear() === 2026 &&
        bookingDate.getMonth() === 9
      );
    });
  }, [period, society]);

  const completedCount = filteredBookings.filter(
    (booking) => booking.status === "Completed",
  ).length;

  const cancelledCount = filteredBookings.filter(
    (booking) => booking.status === "Cancelled",
  ).length;

  const paidRevenue = filteredBookings
    .filter(
      (booking) =>
        booking.payment === "Paid" && booking.status !== "Cancelled",
    )
    .reduce((total, booking) => total + booking.amount, 0);

  const pendingPayments = filteredBookings
    .filter((booking) => booking.payment === "Pending")
    .reduce((total, booking) => total + booking.amount, 0);

  const serviceBreakdown = serviceNames.map((service) => {
    const serviceBookings = filteredBookings.filter(
      (booking) => booking.service === service,
    );

    const count = serviceBookings.length;
    const revenue = serviceBookings
      .filter(
        (booking) =>
          booking.payment === "Paid" && booking.status !== "Cancelled",
      )
      .reduce((total, booking) => total + booking.amount, 0);

    return { service, count, revenue };
  });

  const maxServiceCount = Math.max(
    1,
    ...serviceBreakdown.map((service) => service.count),
  );

  const selectClass =
    "rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#174C3D]";

  const summaryCards = [
    {
      label: "Total bookings",
      value: filteredBookings.length.toString(),
      note: "Bookings in selected period",
    },
    {
      label: "Completed",
      value: completedCount.toString(),
      note: "Successfully completed services",
    },
    {
      label: "Cancelled",
      value: cancelledCount.toString(),
      note: "Cancelled bookings",
    },
    {
      label: "Revenue received",
      value: formatCurrency(paidRevenue),
      note: "Marked as paid in sample data",
    },
  ];

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold text-[#174C3D]">
          OPERATIONS / REPORTS
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="mt-2 text-sm text-gray-500">
              Review booking performance and payment summaries.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div>
              <label
                htmlFor="report-period"
                className="mb-2 block text-sm font-medium text-gray-600"
              >
                Reporting period
              </label>
              <select
                id="report-period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className={selectClass}
              >
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">This month</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="report-society"
                className="mb-2 block text-sm font-medium text-gray-600"
              >
                Society
              </label>
              <select
                id="report-society"
                value={society}
                onChange={(event) => setSociety(event.target.value)}
                className={selectClass}
              >
                <option value="All">All societies</option>
                {societies.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[#174C3D]/10 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="mt-4 text-2xl font-bold tracking-tight">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-gray-500">{card.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#174C3D]/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Service breakdown</h2>
          <p className="mt-1 text-sm text-gray-500">
            Booking volume by service type
          </p>

          <div className="mt-6 space-y-6">
            {serviceBreakdown.map((item) => (
              <div key={item.service}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{item.service}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.count} booking{item.count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold whitespace-nowrap">
                    {formatCurrency(item.revenue)}
                  </p>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#174C3D]"
                    style={{
                      width: `${(item.count / maxServiceCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#174C3D]/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Payment summary</h2>
          <p className="mt-1 text-sm text-gray-500">
            Based on payment statuses in the preview data
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-[#F7F8F3] p-4">
              <div>
                <p className="text-sm font-medium">Revenue received</p>
                <p className="mt-1 text-xs text-gray-500">
                  Payments marked Paid
                </p>
              </div>
              <p className="text-lg font-bold text-[#174C3D]">
                {formatCurrency(paidRevenue)}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#F7F8F3] p-4">
              <div>
                <p className="text-sm font-medium">Payments pending</p>
                <p className="mt-1 text-xs text-gray-500">
                  Awaiting payment
                </p>
              </div>
              <p className="text-lg font-bold">
                {formatCurrency(pendingPayments)}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#F7F8F3] p-4">
              <div>
                <p className="text-sm font-medium">Completed services</p>
                <p className="mt-1 text-xs text-gray-500">
                  Within selected period
                </p>
              </div>
              <p className="text-lg font-bold">{completedCount}</p>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#F7F8F3] p-4">
              <div>
                <p className="text-sm font-medium">Cancelled bookings</p>
                <p className="mt-1 text-xs text-gray-500">
                  Refunds tracked separately
                </p>
              </div>
              <p className="text-lg font-bold">{cancelledCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#174C3D]/10 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-5">
          <h2 className="text-lg font-bold">Booking activity</h2>
          <p className="mt-1 text-sm text-gray-500">
            Records included in the selected report
          </p>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-500">
            No bookings found for these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-[#F7F8F3] text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Booking</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Society</th>
                  <th className="px-5 py-4 font-semibold">Service</th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-semibold text-[#174C3D]">
                      {booking.id}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {formatDate(booking.date)}
                    </td>
                    <td className="px-5 py-4">{booking.society}</td>
                    <td className="px-5 py-4">{booking.service}</td>
                    <td className="px-5 py-4 font-medium whitespace-nowrap">
                      {formatCurrency(booking.amount)}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-gray-500">
        Demo report only. The reporting date is fixed to 24 October 2026 so
        these sample filters remain predictable. Revenue is calculated from
        illustrative records and is not a verified financial statement.
      </p>
    </div>
  );
}
