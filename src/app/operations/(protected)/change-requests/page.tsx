
"use client";

import { useCallback, useEffect, useState } from "react";

type ChangeRequest = {
  id: string;
  booking_id: string;
  request_type: "cancellation" | "reschedule";
  requested_booking_date: string | null;
  requested_start_time: string | null;
  customer_notes: string;
  request_status: "pending" | "approved" | "rejected" | "withdrawn";
  review_notes: string | null;
  reviewed_at: string | null;
  reviewer_name: string | null;
  created_at: string;

  booking_reference: string;
  booking_status: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  society_name_snapshot: string;
  service_name_snapshot: string;
  vehicle_type: string;
  total_amount: string | number;
  payment_method: string;
  payment_status: string;

  customer_name: string;
  customer_phone: string;
};

type Decision = "approve" | "reject";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  withdrawn: "bg-gray-100 text-gray-600",
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}

function formatTime(value: string | null) {
  if (!value) return "—";

  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);

  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
}

export default function ChangeRequestsPage() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activeRequest, setActiveRequest] =
    useState<ChangeRequest | null>(null);

  const [decision, setDecision] = useState<Decision>("approve");
  const [decisionNote, setDecisionNote] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError("");

      const query =
        statusFilter === "all"
          ? ""
          : `?status=${encodeURIComponent(statusFilter)}`;

      const response = await fetch(
        `/api/operations/change-requests${query}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load change requests.");
      }

      setRequests(data.requests ?? []);
    } catch (error) {
      console.error("Change requests loading failed:", error);

      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load change requests.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  function openReview(request: ChangeRequest, selectedDecision: Decision) {
    setActiveRequest(request);
    setDecision(selectedDecision);
    setDecisionNote("");
    setActionError("");
  }

  async function submitDecision() {
    if (!activeRequest || isSubmitting) return;

    if (decisionNote.trim().length > 1000) {
      setActionError("Decision notes cannot exceed 1000 characters.");
      return;
    }

    setIsSubmitting(true);
    setActionError("");

    try {
      const response = await fetch(
        `/api/operations/change-requests/${activeRequest.id}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision,
            reviewNotes: decisionNote.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to review this request.");
      }

      setActiveRequest(null);
      setDecisionNote("");

      await loadRequests();
    } catch (error) {
      console.error("Change request review failed:", error);

      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to review this request. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const pendingCount = requests.filter(
    (request) => request.request_status === "pending",
  ).length;

  return (
    <div className="space-y-7">
      <section>
        <p className="text-sm font-semibold text-[#174C3D]">
          OPERATIONS
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Change requests
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Review customer cancellation and rescheduling requests.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-[#174C3D]/10 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {statusFilter === "pending"
              ? "Requests awaiting review"
              : "Requests displayed"}
          </p>

          <p className="mt-1 text-2xl font-bold">
            {requests.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-gray-600">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="ml-3 rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#174C3D]"
            >
              <option value="pending">Pending review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="all">All requests</option>
            </select>
          </label>

          <button
            type="button"
            onClick={loadRequests}
            disabled={isLoading}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </section>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Loading change requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <h2 className="font-semibold">No requests found</h2>
          <p className="mt-2 text-sm text-gray-500">
            There are no requests matching this status.
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          {requests.map((request) => (
            <article
              key={request.id}
              className="rounded-2xl border border-[#174C3D]/10 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {request.booking_reference} ·{" "}
                    {request.id.slice(0, 8)}
                  </p>

                  <h2 className="mt-2 text-lg font-bold">
                    {formatLabel(request.request_type)} request
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Requested by {request.customer_name}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Submitted{" "}
                    {new Date(request.created_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Kolkata",
                    })}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    statusStyles[request.request_status]
                  }`}
                >
                  {formatLabel(request.request_status)}
                </span>
              </div>

              <div className="mt-5 grid gap-4 rounded-xl bg-[#F7F8F3] p-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="mt-1 font-medium">
                    {request.customer_name}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {request.customer_phone}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Society</p>
                  <p className="mt-1 font-medium">
                    {request.society_name_snapshot}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Service</p>
                  <p className="mt-1 font-medium">
                    {request.service_name_snapshot}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Current appointment</p>
                  <p className="mt-1 font-medium">
                    {formatDate(request.booking_date)} ·{" "}
                    {formatTime(request.start_time)}
                  </p>
                </div>

                {request.request_type === "reschedule" && (
                  <div>
                    <p className="text-xs text-gray-500">
                      Requested appointment
                    </p>
                    <p className="mt-1 font-medium">
                      {formatDate(request.requested_booking_date)} ·{" "}
                      {formatTime(request.requested_start_time)}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500">Booking amount</p>
                  <p className="mt-1 font-medium">
                    ₹{Number(request.total_amount).toLocaleString("en-IN")}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatLabel(request.payment_method)} ·{" "}
                    {formatLabel(request.payment_status)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Customer's reason
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {request.customer_notes}
                </p>
              </div>

              {request.review_notes && (
                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Review note
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    {request.review_notes}
                  </p>
                  {request.reviewer_name && (
                    <p className="mt-2 text-xs text-gray-500">
                      Reviewed by {request.reviewer_name}
                    </p>
                  )}
                </div>
              )}

              {request.request_status === "pending" && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => openReview(request, "approve")}
                    className="rounded-xl bg-[#174C3D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10382D]"
                  >
                    Review & approve
                  </button>

                  <button
                    type="button"
                    onClick={() => openReview(request, "reject")}
                    className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Review & reject
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="decision-dialog-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#174C3D]">
              {activeRequest.booking_reference}
            </p>

            <h2
              id="decision-dialog-title"
              className="mt-2 text-xl font-bold"
            >
              {decision === "approve"
                ? "Approve change request?"
                : "Reject change request?"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              You are about to {decision} this{" "}
              {activeRequest.request_type} request from{" "}
              {activeRequest.customer_name}.
            </p>

            {decision === "approve" &&
              activeRequest.request_type === "cancellation" && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  Approving this request will cancel the booking and release
                  its reserved slot. Payment refunds are handled separately.
                </p>
              )}

            {decision === "approve" &&
              activeRequest.request_type === "reschedule" && (
                <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                  The requested slot will be checked again for availability.
                  If it is no longer available, the request will remain pending.
                </p>
              )}

            <label
              htmlFor="decision-note"
              className="mt-5 block text-sm font-medium text-gray-700"
            >
              Review note (optional)
            </label>

            <textarea
              id="decision-note"
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              placeholder="Add a note for the customer or operations record..."
              maxLength={1000}
              rows={3}
              className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#174C3D]"
            />

            <p className="mt-1 text-right text-xs text-gray-400">
              {decisionNote.length}/1000
            </p>

            {actionError && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {actionError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setActiveRequest(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                Back
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={submitDecision}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  decision === "approve"
                    ? "bg-[#174C3D] hover:bg-[#10382D]"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isSubmitting
                  ? "Submitting..."
                  : decision === "approve"
                    ? "Confirm approval"
                    : "Confirm rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
