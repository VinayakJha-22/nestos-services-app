"use client";

import { useEffect, useMemo, useState } from "react";
import { bookingRefunds } from "@/lib/operations/bookings";

type PaymentRecord = {
  payment_type: "booking" | "package";
  record_id: string;
  booking_id: string | null;
  booking_reference: string | null;
  customer_name: string;
  customer_phone: string;
  society_id: string;
  society_name: string;
  description: string;
  package_name: string | null;
  amount: string;
  currency: string;
  status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  failure_reason: string | null;
  created_at: string;
  paid_at: string | null;
};

type PaymentSummary = {
  totalRecords: number;
  collectedAmount: number;
  pendingCount: number;
  failedCount: number;
  refundPendingCount: number;
};

type PaymentTab = "all" | "booking" | "package";

const paymentStatusLabels: Record<string, string> = {
  paid: "Paid",
  pending_payment: "Pending",
  failed: "Failed",
  refund_pending: "Refund Pending",
  refunded: "Refunded",
};

const paymentStyles: Record<string, string> = {
  paid: "bg-green-50 text-green-700",
  pending_payment: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  refund_pending: "bg-orange-50 text-orange-700",
  refunded: "bg-blue-50 text-blue-700",
};

const refundStatusStyles: Record<string, string> = {
  "Pending Review": "bg-amber-50 text-amber-800",
  Approved: "bg-blue-50 text-blue-800",
  Rejected: "bg-red-50 text-red-800",
  Processed: "bg-green-50 text-green-800",
  "Not Requested": "bg-gray-100 text-gray-600",
};

const selectClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#174C3D]";

function formatAmount(amount: string | number, currency = "INR") {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OperationsPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalRecords: 0,
    collectedAmount: 0,
    pendingCount: 0,
    failedCount: 0,
    refundPendingCount: 0,
  });
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<PaymentTab>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(
    null
  );

  const [refundRecords, setRefundRecords] = useState([...bookingRefunds]);
  const [refundRecordsLoaded, setRefundRecordsLoaded] = useState(false);
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);
  const [refundDecision, setRefundDecision] = useState<
    "Approved" | "Rejected" | null
  >(null);
  const [refundDecisionNote, setRefundDecisionNote] = useState("");

  const selectedRefund =
    refundRecords.find((refund) => refund.id === selectedRefundId) ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadPayments() {
      try {
        setPaymentsLoading(true);
        setPaymentsError("");

        const response = await fetch("/api/operations/payments", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load payment records.");
        }

        const data = await response.json();

        if (!cancelled) {
          setPayments(Array.isArray(data.payments) ? data.payments : []);
          setSummary(
            data.summary ?? {
              totalRecords: 0,
              collectedAmount: 0,
              pendingCount: 0,
              failedCount: 0,
              refundPendingCount: 0,
            }
          );
        }
      } catch (error) {
        console.error("Payments loading failed:", error);
        if (!cancelled) {
          setPaymentsError("Unable to load payments. Please refresh.");
        }
      } finally {
        if (!cancelled) setPaymentsLoading(false);
      }
    }

    loadPayments();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load previously saved refund decisions when the page opens.
  useEffect(() => {
    try {
      const savedRefunds = window.localStorage.getItem(
        "nestos-operations-refunds"
      );

      if (savedRefunds) {
        const parsedRefunds = JSON.parse(savedRefunds);
        if (Array.isArray(parsedRefunds)) setRefundRecords(parsedRefunds);
      }
    } catch (error) {
      console.error("Unable to load saved refund records:", error);
    } finally {
      setRefundRecordsLoaded(true);
    }
  }, []);

  // Save refund decisions whenever the records change.
  useEffect(() => {
    if (!refundRecordsLoaded) return;

    try {
      window.localStorage.setItem(
        "nestos-operations-refunds",
        JSON.stringify(refundRecords)
      );
    } catch (error) {
      console.error("Unable to save refund records:", error);
    }
  }, [refundRecords, refundRecordsLoaded]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const searchableValues = [
        payment.record_id,
        payment.booking_id ?? "",
        payment.booking_reference ?? "",
        payment.razorpay_order_id ?? "",
        payment.razorpay_payment_id ?? "",
        payment.customer_name,
        payment.customer_phone,
        payment.society_name,
        payment.description,
        payment.package_name ?? "",
      ];

      const matchesSearch =
        !query ||
        searchableValues.some((value) => value.toLowerCase().includes(query));
      const matchesStatus =
        statusFilter === "All" || payment.status === statusFilter;
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "booking" && payment.payment_type === "booking") ||
        (activeTab === "package" && payment.payment_type === "package");

      const paymentDate = new Date(payment.created_at);
      const matchesFromDate =
        !fromDate ||
        (!Number.isNaN(paymentDate.getTime()) &&
          paymentDate >= new Date(`${fromDate}T00:00:00`));
      const matchesToDate =
        !toDate ||
        (!Number.isNaN(paymentDate.getTime()) &&
          paymentDate <= new Date(`${toDate}T23:59:59.999`));

      return (
        matchesSearch &&
        matchesStatus &&
        matchesTab &&
        matchesFromDate &&
        matchesToDate
      );
    });
  }, [payments, search, statusFilter, activeTab, fromDate, toDate]);

  const pendingRefundCount = refundRecords.filter(
    (refund) => refund.status === "Pending Review"
  ).length;

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
    setActiveTab("all");
    setFromDate("");
    setToDate("");
  }

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
              Track service payments, package purchases and outstanding refunds.
            </p>
          </div>
          <div className="rounded-xl border border-[#174C3D]/10 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">Recorded payments</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {summary.totalRecords}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#174C3D]/10 bg-white p-5">
          <p className="text-sm text-gray-500">Total collected</p>
          <p className="mt-2 text-2xl font-bold">
            {formatAmount(summary.collectedAmount)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#174C3D]/10 bg-white p-5">
          <p className="text-sm text-gray-500">Pending payments</p>
          <p className="mt-2 text-2xl font-bold">{summary.pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-[#174C3D]/10 bg-white p-5">
          <p className="text-sm text-gray-500">Failed payments</p>
          <p className="mt-2 text-2xl font-bold">{summary.failedCount}</p>
        </div>
        <div className="rounded-2xl border border-[#174C3D]/10 bg-white p-5">
          <p className="text-sm text-gray-500">Refunds pending</p>
          <p className="mt-2 text-2xl font-bold">
            {summary.refundPendingCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {pendingRefundCount} local review item(s)
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#174C3D]/10 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Search and filters</h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { value: "all", label: "All payments" },
            { value: "booking", label: "Booking payments" },
            { value: "package", label: "Package purchases" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value as PaymentTab)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.value
                  ? "bg-[#174C3D] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
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
              placeholder="Payment ID, order ID, booking reference, customer..."
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
              <option value="paid">Paid</option>
              <option value="pending_payment">Pending</option>
              <option value="failed">Failed</option>
              <option value="refund_pending">Refund pending</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="payment-from-date"
                className="mb-2 block text-sm font-medium text-gray-600"
              >
                From date
              </label>
              <input
                id="payment-from-date"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className={selectClass}
              />
            </div>
            <div>
              <label
                htmlFor="payment-to-date"
                className="mb-2 block text-sm font-medium text-gray-600"
              >
                To date
              </label>
              <input
                id="payment-to-date"
                type="date"
                min={fromDate || undefined}
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className={selectClass}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Showing {filteredPayments.length} of {payments.length} records
          </p>
          <button
            type="button"
            onClick={clearFilters}
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
            Payment progress is independent of service status. Select a record
            to inspect its transaction details.
          </p>
        </div>

        {paymentsLoading ? (
          <div className="px-5 py-14 text-center text-sm text-gray-500">
            Loading payment records...
          </div>
        ) : paymentsError ? (
          <div className="px-5 py-14 text-center">
            <p className="font-semibold text-red-700">{paymentsError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-[#174C3D] px-4 py-2 text-sm font-semibold text-white"
            >
              Refresh page
            </button>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="font-semibold">No payment records found</p>
            <p className="mt-2 text-sm text-gray-500">
              Try a different search or clear your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-[#F7F8F3] text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Payment / booking</th>
                  <th className="px-5 py-4 font-semibold">Customer</th>
                  <th className="px-5 py-4 font-semibold">Type / description</th>
                  <th className="px-5 py-4 font-semibold">Society</th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map((payment) => (
                  <tr
                    key={`${payment.payment_type}-${payment.record_id}`}
                    onClick={() => setSelectedPayment(payment)}
                    className="cursor-pointer transition hover:bg-[#174C3D]/5"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#174C3D]">
                        {payment.booking_reference ||
                          `PAY-${payment.record_id.slice(0, 8)}`}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {payment.razorpay_payment_id || payment.record_id}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{payment.customer_name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {payment.customer_phone}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium">
                        {payment.payment_type === "package"
                          ? "Package purchase"
                          : "Booking payment"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {payment.package_name || payment.description}
                      </p>
                    </td>
                    <td className="px-5 py-4">{payment.society_name}</td>
                    <td className="px-5 py-4 font-semibold whitespace-nowrap">
                      {formatAmount(payment.amount, payment.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                          paymentStyles[payment.status] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {paymentStatusLabels[payment.status] ?? payment.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                      {formatDate(payment.created_at)}
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

                      className={`rounded-full px-3 py-1 text-xs font-semibold ${refundStatusStyles[refund.status] ??

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

                  className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedRefund.status === "Approved"

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

                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${refundDecision === "Approved"

                        ? "border-green-700 bg-green-50 text-green-800 ring-2 ring-green-700"

                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"

                      }`}

                  >

                    Approve Refund

                  </button>



                  <button

                    type="button"

                    onClick={() => setRefundDecision("Rejected")}

                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${refundDecision === "Rejected"

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
                  {selectedPayment.booking_reference ||
                    `PAY-${selectedPayment.record_id.slice(0, 8)}`}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedPayment.payment_type === "package"
                    ? "Package purchase transaction"
                    : "Booking payment transaction"}
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
                <p className="mt-3 font-medium">{selectedPayment.customer_name}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedPayment.customer_phone}
                </p>
                <p className="mt-3 text-sm text-gray-500">
                  {selectedPayment.society_name}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold">Payment summary</h3>
                <p className="mt-4 text-sm text-gray-500">Description</p>
                <p className="mt-1 font-medium">
                  {selectedPayment.package_name || selectedPayment.description}
                </p>
                <p className="mt-4 text-sm text-gray-500">Amount</p>
                <p className="mt-1 text-2xl font-bold">
                  {formatAmount(selectedPayment.amount, selectedPayment.currency)}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-500">Payment status</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      paymentStyles[selectedPayment.status] ??
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {paymentStatusLabels[selectedPayment.status] ??
                      selectedPayment.status}
                  </span>
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4 text-sm">
                  <div className="flex justify-between gap-3 py-1">
                    <span className="text-gray-500">Created</span>
                    <span className="text-right">
                      {formatDate(selectedPayment.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 py-1">
                    <span className="text-gray-500">Paid at</span>
                    <span className="text-right">
                      {formatDate(selectedPayment.paid_at)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 py-1">
                    <span className="text-gray-500">Payment record ID</span>
                    <span className="max-w-[65%] break-all text-right">
                      {selectedPayment.record_id}
                    </span>
                  </div>
                  {selectedPayment.booking_id && (
                    <div className="flex justify-between gap-3 py-1">
                      <span className="text-gray-500">Booking ID</span>
                      <span className="max-w-[65%] break-all text-right">
                        {selectedPayment.booking_id}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 py-1">
                    <span className="text-gray-500">Razorpay order ID</span>
                    <span className="max-w-[65%] break-all text-right">
                      {selectedPayment.razorpay_order_id || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 py-1">
                    <span className="text-gray-500">Razorpay payment ID</span>
                    <span className="max-w-[65%] break-all text-right">
                      {selectedPayment.razorpay_payment_id || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedPayment.failure_reason && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <h3 className="font-semibold text-red-900">Failure reason</h3>
                  <p className="mt-2 text-sm text-red-800">
                    {selectedPayment.failure_reason}
                  </p>
                </div>
              )}

              {selectedPayment.status === "pending_payment" && (
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  Verify the transaction with the payment provider before
                  marking this payment as successful.
                </div>
              )}
              {selectedPayment.status === "refund_pending" && (
                <div className="rounded-xl bg-orange-50 p-4">
                  <h3 className="font-semibold text-orange-900">
                    Refund review required
                  </h3>
                  <p className="mt-2 text-sm text-orange-800">
                    This transaction has a pending refund status. Review the
                    refund and payment records before taking action.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Payment records and summary figures are loaded from the Operations
        Payments API. Refund Review decisions below are still prototype-only
        and are saved in this browser; they do not initiate a payment-provider
        refund.
      </p>
    </div>
  );
}
