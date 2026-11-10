
"use client";

import { useState } from "react";
import {
  bookings,
  changeRequests,
  type BookingChangeRequest,
  type ChangeRequestStatus,
} from "@/lib/operations/bookings";


export default function ChangeRequestsPage() {
  const [statusFilter, setStatusFilter] = useState("Pending Review");
  
  const [requests, setRequests] =
    useState<BookingChangeRequest[]>(changeRequests);

  const [activeRequest, setActiveRequest] =
    useState<BookingChangeRequest | null>(null);

  const [decision, setDecision] =
    useState<"Approved" | "Rejected">("Approved");

  const [decisionNote, setDecisionNote] = useState("");

  const filteredRequests = requests.filter(
    (request) =>
      statusFilter === "All" || request.status === statusFilter,
  );

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-[#174C3D]">
          OPERATIONS
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Change requests
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Review customer cancellation and rescheduling requests.
        </p>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Requests awaiting review
          </p>
          <p className="mt-1 text-2xl font-bold">
            {
              changeRequests.filter(
                (request) => request.status === "Pending Review",
              ).length
            }
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <span className="font-medium text-gray-600">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#174C3D]"
          >
            <option value="Pending Review">Pending review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="All">All requests</option>
          </select>
        </label>
      </section>

      <section className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <h2 className="font-semibold">No requests found</h2>
            <p className="mt-2 text-sm text-gray-500">
              There are no requests for this status.
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const booking = bookings.find(
              (item) => item.id === request.bookingId,
            );

            return (
              <article
                key={request.id}
                className="rounded-2xl border border-[#174C3D]/10 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {request.id} · Booking {request.bookingId}
                    </p>
                    <h2 className="mt-2 text-lg font-bold">
                      {request.type} request
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Requested by {request.requestedBy}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {request.status}
                  </span>
                </div>

                {booking && (
                  <div className="mt-5 grid gap-4 rounded-xl bg-[#F7F8F3] p-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-500">Customer</p>
                      <p className="mt-1 font-medium">{booking.customer}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Service</p>
                      <p className="mt-1 font-medium">{booking.service}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Current appointment</p>
                      <p className="mt-1 font-medium">
                        {booking.date} · {booking.slot}
                      </p>
                    </div>
                    {request.type === "Rescheduling" && (
                      <div>
                        <p className="text-xs text-gray-500">Requested appointment</p>
                        <p className="mt-1 font-medium">
                          {request.requestedDate} · {request.requestedSlot}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Reason
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-700">
                    {request.reason}
                  </p>
                </div>
                {request.status === "Pending Review" && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRequest(request);
                        setDecision("Approved");
                        setDecisionNote("");
                      }}
                      className="rounded-xl bg-[#174C3D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10382D]"
                    >
                      Review & approve
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveRequest(request);
                        setDecision("Rejected");
                        setDecisionNote("");
                      }}
                      className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Review & reject
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
      <p className="text-xs text-gray-500">
        Demo data only. Request decisions are not yet persisted or connected
        to booking, payment, or refund processing.
      </p>
      
{activeRequest && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-dialog-title"
      className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[#174C3D]">
        {activeRequest.id} · {activeRequest.bookingId}
      </p>

      <h2
        id="decision-dialog-title"
        className="mt-2 text-xl font-bold"
      >
        {decision === "Approved" ? "Approve request?" : "Reject request?"}
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        You are about to {decision.toLowerCase()} this{" "}
        {activeRequest.type.toLowerCase()} request from{" "}
        {activeRequest.requestedBy}.
      </p>

      <label
        htmlFor="decision-note"
        className="mt-5 block text-sm font-medium text-gray-700"
      >
        Decision note
      </label>

      <textarea
        id="decision-note"
        value={decisionNote}
        onChange={(event) => setDecisionNote(event.target.value)}
        placeholder="Explain the decision..."
        rows={3}
        className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#174C3D]"
      />
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setActiveRequest(null)}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            setRequests((current) =>
              current.map((request) =>
                request.id === activeRequest.id
                  ? {
                      ...request,
                      status: decision as ChangeRequestStatus,
                      decisionNote: decisionNote.trim(),
                    }
                  : request,
              ),
            );
            setActiveRequest(null);
          }}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
            decision === "Approved"
              ? "bg-[#174C3D] hover:bg-[#10382D]"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          Confirm {decision === "Approved" ? "approval" : "rejection"}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
