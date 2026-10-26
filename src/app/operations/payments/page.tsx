
"use client";

import { useEffect, useState } from "react";
import {
  bookings,
  paymentStatuses,
  bookingRefunds,
} from "@/lib/operations/bookings";

const paymentStyles: Record<string, string> = {
  Paid: "bg-green-50 text-green-700",
  Pending: "bg-amber-50 text-amber-700",
  "Refund Pending": "bg-orange-50 text-orange-700",
};

const refundStatusStyles: Record<string, string> = {
  "Pending Review": "bg-amber-50 text-amber-800",
  Approved: "bg-blue-50 text-blue-800",
  Rejected: "bg-red-50 text-red-800",
  Processed: "bg-green-50 text-green-800",
  "Not Requested": "bg-gray-100 text-gray-600",
};

export default function OperationsPaymentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedPayment, setSelectedPayment] =
  useState<(typeof bookings)[number] | null>(null);

const [refundRecords, setRefundRecords] = useState([
  ...bookingRefunds,
]);

const [refundRecordsLoaded, setRefundRecordsLoaded] = useState(false);

// Load previously saved refund decisions when the page opens.
useEffect(() => {
  try {
    const savedRefunds = window.localStorage.getItem(
      "nestos-operations-refunds"
    );

    if (savedRefunds) {
      const parsedRefunds = JSON.parse(savedRefunds);

      if (Array.isArray(parsedRefunds)) {
        setRefundRecords(parsedRefunds);
      }
    }
  } catch (error) {
    console.error("Unable to load saved refund records:", error);
  } finally {
    setRefundRecordsLoaded(true);
  }
}, []);

// Save refund decisions whenever the records change.
useEffect(() => {
  if (!refundRecordsLoaded) {
    return;
  }

  try {
    window.localStorage.setItem(
      "nestos-operations-refunds",
      JSON.stringify(refundRecords)
    );
  } catch (error) {
    console.error("Unable to save refund records:", error);
  }
}, [refundRecords, refundRecordsLoaded]);

  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(
    null
  );

  const [refundDecision, setRefundDecision] = useState<
    "Approved" | "Rejected" | null
  >(null);

  const [refundDecisionNote, setRefundDecisionNote] = useState("");
  const selectedRefund =
  refundRecords.find((refund) => refund.id === selectedRefundId) ?? null;

  const filteredPayments = bookings.filter((booking) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      booking.id.toLowerCase().includes(query) ||
      booking.customer.toLowerCase().includes(query) ||
      booking.phone.includes(query);

    const matchesStatus =
      statusFilter === "All" || booking.payment === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#174C3D]";

  const paidCount = bookings.filter(
    (booking) => booking.payment === "Paid"
  ).length;

  const pendingCount = bookings.filter(
    (booking) => booking.payment === "Pending"
  ).length;

  const refundCount = refundRecords.filter(
  (refund) => refund.status === "Pending Review"
  ).length;

  const paidAmount = bookings
    .filter((booking) => booking.payment === "Paid")
    .reduce((total, booking) => total + booking.amount, 0);

  return (
    <div className="space-y-7">
      <section>
        <p className="text-sm font-semibold text-[#174C3D]">
          OPERATIONS / PAYMENTS
        </p>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
            <p className="mt-2 text-sm text-gray-500">
              Track service payments and outstanding refunds across bookings.
            </p>
          </div>

          <div className="rounded-xl border border-[#174C3D]/10 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">Recorded payments</p>
            <p className="mt-1 text-xl font-bold">{bookings.length}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#174C3D]/10 bg-white p-5">
          <p className="text-sm text-gray-500">Paid bookings</p>
          <p className="mt-2 text-2xl font-bold">{paidCount}</p>
        </div>

        <div className="rounded-2xl border border-[#174C3D]/10 bg-white p-5">
          <p className="text-sm text-gray-500">Pending payments</p>
          <p className="mt-2 text-2xl font-bold">{pendingCount}</p>
        </div>

        <div className="rounded-2xl border border-[#174C3D]/10 bg-white p-5">
          <p className="text-sm text-gray-500">Refunds pending</p>
          <p className="mt-2 text-2xl font-bold">{refundCount}</p>
        </div>

        <div className="rounded-2xl border border-[#174C3D]/10 bg-white p-5">
          <p className="text-sm text-gray-500">Paid booking value</p>
          <p className="mt-2 text-2xl font-bold">
            ₹{paidAmount.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Excludes pending payments and refunds
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#174C3D]/10 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Search and filters</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="payment-search"
              className="mb-2 block text-sm font-medium text-gray-600"
            >
              Search payments
            </label>
            <input
              id="payment-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Booking ID, customer, phone..."
              className={selectClass}
            />
          </div>

          <div>
            <label
              htmlFor="payment-status"
              className="mb-2 block text-sm font-medium text-gray-600"
            >
              Payment status
            </label>
            <select
              id="payment-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={selectClass}
            >
              <option value="All">All payment statuses</option>
              {paymentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Showing {filteredPayments.length} of {bookings.length} records
          </p>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("All");
            }}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#174C3D] hover:bg-[#174C3D]/5"
          >
            Clear filters
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#174C3D]/10 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-5">
          <h2 className="text-lg font-bold">Payment records</h2>
          <p className="mt-1 text-sm text-gray-500">
            Payment progress is independent of service status.
          </p>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="font-semibold">No payment records found</p>
            <p className="mt-2 text-sm text-gray-500">
              Try a different search or clear your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#F7F8F3] text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Booking</th>
                  <th className="px-5 py-4 font-semibold">Customer</th>
                  <th className="px-5 py-4 font-semibold">Service</th>
                  <th className="px-5 py-4 font-semibold">Society</th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Payment status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map((booking) => (
                  <tr
                      key={booking.id}
                      onClick={() => setSelectedPayment(booking)}
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

                    <td className="px-5 py-4">{booking.service}</td>
                    <td className="px-5 py-4">{booking.society}</td>

                    <td className="px-5 py-4 font-medium whitespace-nowrap">
                      ₹{booking.amount.toLocaleString("en-IN")}
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
      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Refund Review</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review refund requests separately from booking and payment status.
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Refund ID</th>
              <th className="px-4 py-3 font-medium">Booking</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {refundRecords.map((refund) => (
              <tr key={refund.id}>
                <td className="px-4 py-4 font-semibold">{refund.id}</td>
                <td className="px-4 py-4">{refund.bookingId}</td>
                <td className="px-4 py-4 font-semibold">
                  ₹{refund.amount.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-4 text-gray-600">{refund.reason}</td>
                
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      refundStatusStyles[refund.status] ??
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {refund.status}
                  </span>
                </td>

                
              <td className="px-4 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRefundId(refund.id);
                    setRefundDecisionNote("");
                    setRefundDecision(null);
                  }}
                  className="font-semibold text-[#174C3D] hover:underline"
                >
                  {refund.status === "Pending Review" ? "Review" : "View"}
                </button>
              </td>

              </tr>
            ))}

            {refundRecords.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No refund requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
    
{selectedRefund && (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
    onClick={() => {
      setSelectedRefundId(null);
      setRefundDecision(null);
      setRefundDecisionNote("");
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-dialog-title"
      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="refund-dialog-title"
            className="text-xl font-bold text-gray-900"
          >
            Refund Request Review
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Refund ID: {selectedRefund.id}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedRefundId(null);
            setRefundDecision(null);
            setRefundDecisionNote("");
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          Close
        </button>
      </div>

      <div className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex justify-between gap-4">
          <span className="text-sm text-gray-500">Booking ID</span>
          <span className="text-sm font-semibold text-gray-900">
            {selectedRefund.bookingId}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-sm text-gray-500">Refund amount</span>
          <span className="text-lg font-bold text-gray-900">
            ₹{selectedRefund.amount.toLocaleString("en-IN")}
          </span>
        </div>

        <div>
          <p className="text-sm text-gray-500">Reason for refund</p>
          <p className="mt-1 text-sm leading-6 text-gray-800">
            {selectedRefund.reason}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-500">Current status</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              selectedRefund.status === "Approved"
                ? "bg-green-100 text-green-800"
                : selectedRefund.status === "Rejected"
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"
            }`}
          >
            {selectedRefund.status}
          </span>
        </div>
      </div>

      {selectedRefund.status === "Pending Review" ? (
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-800">
            Select your decision
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRefundDecision("Approved")}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                refundDecision === "Approved"
                  ? "border-green-700 bg-green-50 text-green-800 ring-2 ring-green-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Approve Refund
            </button>

            <button
              type="button"
              onClick={() => setRefundDecision("Rejected")}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                refundDecision === "Rejected"
                  ? "border-red-700 bg-red-50 text-red-800 ring-2 ring-red-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Reject Refund
            </button>
          </div>

          <label
            htmlFor="refund-decision-note"
            className="mt-5 block text-sm font-semibold text-gray-800"
          >
            Decision note <span className="text-red-600">*</span>
          </label>

          <textarea
            id="refund-decision-note"
            value={refundDecisionNote}
            onChange={(event) =>
              setRefundDecisionNote(event.target.value)
            }
            placeholder="Explain the reason for your decision..."
            rows={4}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#174C3D] focus:ring-2 focus:ring-[#174C3D]/20"
          />

          <button
            type="button"
            disabled={
              !refundDecision || !refundDecisionNote.trim()
            }
            onClick={() => {
              if (!refundDecision || !refundDecisionNote.trim()) {
                return;
              }

              const confirmed = window.confirm(
                `Confirm ${refundDecision.toLowerCase()} for refund ${selectedRefund.id}?`
              );

              if (!confirmed) return;

              setRefundRecords((current) =>
                current.map((refund) =>
                  refund.id === selectedRefund.id
                    ? {
                        ...refund,
                        status: refundDecision,
                        decisionNote: refundDecisionNote.trim(),
                      }
                    : refund
                )
              );

              setSelectedRefundId(null);
              setRefundDecision(null);
              setRefundDecisionNote("");
            }}
            className="mt-5 w-full rounded-xl bg-[#174C3D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10392E] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            Confirm Decision
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-900">
            Decision recorded
          </h3>

          <p className="mt-2 text-sm text-gray-600">
            This refund request has been {selectedRefund.status.toLowerCase()}.
          </p>

          {"decisionNote" in selectedRefund &&
            selectedRefund.decisionNote && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700">
                  Decision note
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                  {selectedRefund.decisionNote}
                </p>
              </div>
            )}
        </div>
      )}

      <p className="mt-5 border-t border-gray-100 pt-4 text-xs leading-5 text-gray-500">
        This action records an administrative decision in the prototype.
        It does not initiate a payment-provider refund.
      </p>
    </div>
  </div>
)}

      {selectedPayment && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => setSelectedPayment(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-detail-title"
            className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#174C3D]">
                  PAYMENT DETAILS
                </p>
                <h2
                  id="payment-detail-title"
                  className="mt-2 text-2xl font-bold"
                >
                  {selectedPayment.id}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Payment information for this booking
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold">Customer</h3>
                <p className="mt-3 font-medium">{selectedPayment.customer}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedPayment.phone}
                </p>
                <p className="mt-3 text-sm text-gray-500">
                  {selectedPayment.society}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold">Payment summary</h3>

                <p className="mt-4 text-sm text-gray-500">Service</p>
                <p className="mt-1 font-medium">{selectedPayment.service}</p>

                <p className="mt-4 text-sm text-gray-500">Booking amount</p>
                <p className="mt-1 text-2xl font-bold">
                  ₹{selectedPayment.amount.toLocaleString("en-IN")}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-500">Payment status</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      paymentStyles[selectedPayment.payment] ??
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {selectedPayment.payment}
                  </span>
                </div>
              </div>

              {selectedPayment.payment === "Pending" && (
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  Verify the transaction with the payment provider before
                  marking this payment as successful.
                </div>
              )}

              {selectedPayment.payment === "Refund Pending" && (
                <div className="rounded-xl bg-orange-50 p-4">
                  <h3 className="font-semibold text-orange-900">
                    Refund review required
                  </h3>
                  <p className="mt-2 text-sm text-orange-800">
                    This booking has a pending refund status. Review the
                    cancellation and payment records before taking action.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Preview data only. Payment records and amounts are illustrative and
        are not live payment-provider data.
      </p>
    </div>
  );
}
