
"use client";

import { useState } from "react";
import Link from "next/link";
import { societies } from "@/config/societies";

type Profile = {
  fullName: string;
  email: string;
  phone: string;
  preferredSociety: string;
  bookingUpdates: boolean;
  promotionalMessages: boolean;
};

const initialProfile: Profile = {
  fullName: "Alex Customer",
  email: "",
  phone: "+91 98765 43210",
  preferredSociety: "sample-society-1",
  bookingUpdates: true,
  promotionalMessages: false,
};

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [editing, setEditing] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showSignOutConfirmation, setShowSignOutConfirmation] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [notice, setNotice] = useState("");
  const [signOutNotice, setSignOutNotice] = useState(false);

  const selectedSociety = societies.find(
    (society) => society.id === profile.preferredSociety
  );

  function updateProfile<K extends keyof Profile>(
    field: K,
    value: Profile[K]
  ) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function saveProfile() {
    if (!profile.fullName.trim()) {
      setNotice("Please enter your full name.");
      return;
    }

    setEditing(false);
    setNotice(
      "Preview only: profile changes are not saved to an account yet."
    );
  }

  function verifyPhonePreview() {
    if (!/^[6-9]\d{9}$/.test(newPhone)) {
      setNotice("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setNotice("Enter the 6-digit OTP to continue.");
      return;
    }

    setNotice(
      "Preview only: phone verification is not connected. Your existing verified number has not changed."
    );
    setShowPhoneVerification(false);
    setNewPhone("");
    setOtp("");
  }

  return (
    <div className="min-h-screen bg-cream">
      <section className="container-shell py-10 md:py-14">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-forest">
            Your account
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Account & profile
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
            Manage your contact details, preferred society and communication
            preferences in one place.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <strong>Development preview:</strong> profile edits are held in this
          page only. Account storage, OTP verification and secure sign-out
          require the authentication backend.
        </div>

        {notice && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-border bg-white p-4 text-sm text-ink"
          >
            <div className="flex items-start justify-between gap-4">
              <p>{notice}</p>
              <button
                type="button"
                onClick={() => setNotice("")}
                className="shrink-0 font-semibold text-forest"
                aria-label="Dismiss message"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className="rounded-3xl border border-border bg-white p-5 md:p-8">
            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-ink">Personal details</h2>
                <p className="mt-1 text-sm text-muted">
                  Your details for bookings and service updates.
                </p>
              </div>

              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setNotice("");
                  }}
                  className="rounded-full border border-forest px-5 py-2.5 text-sm font-semibold text-forest transition hover:bg-forest hover:text-white"
                >
                  Edit profile
                </button>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-2 block text-sm font-semibold text-ink"
                >
                  Full name
                </label>
                <input
                  id="fullName"
                  value={profile.fullName}
                  disabled={!editing}
                  onChange={(event) =>
                    updateProfile("fullName", event.target.value)
                  }
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none transition focus:border-forest disabled:bg-cream"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-ink"
                >
                  Email address <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled={!editing}
                  onChange={(event) =>
                    updateProfile("email", event.target.value)
                  }
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none transition focus:border-forest disabled:bg-cream"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-ink"
                >
                  Verified phone number
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="phone"
                    value={profile.phone}
                    readOnly
                    className="w-full rounded-xl border border-border bg-cream px-4 py-3 text-ink"
                  />
                  <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-lime/40 px-3 py-2 text-xs font-semibold text-forest sm:self-center">
                    <span aria-hidden="true">✓</span> Verified (demo)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPhoneVerification(true);
                    setNotice("");
                  }}
                  className="mt-3 text-sm font-semibold text-forest underline underline-offset-4"
                >
                  Change phone number
                </button>
              </div>

              <div>
                <label
                  htmlFor="society"
                  className="mb-2 block text-sm font-semibold text-ink"
                >
                  Preferred society
                </label>
                <select
                  id="society"
                  value={profile.preferredSociety}
                  disabled={!editing}
                  onChange={(event) =>
                    updateProfile("preferredSociety", event.target.value)
                  }
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none transition focus:border-forest disabled:bg-cream"
                >
                  {societies.map((society) => (
                    <option key={society.id} value={society.id}>
                      {society.name}
                    </option>
                  ))}
                </select>
                {selectedSociety && (
                  <p className="mt-2 text-xs text-muted">
                    {selectedSociety.address}
                  </p>
                )}
              </div>
            </div>

            {editing && (
              <div className="mt-7 flex flex-wrap gap-3 border-t border-border pt-6">
                <button
                  type="button"
                  onClick={saveProfile}
                  className="rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink"
                >
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfile(initialProfile);
                    setEditing(false);
                    setNotice("Demo profile restored to its initial values.");
                  }}
                  className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-ink transition hover:bg-cream"
                >
                  Cancel
                </button>
              </div>
            )}
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-border bg-white p-5 md:p-7">
              <h2 className="text-xl font-bold text-ink">
                Communication preferences
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Important booking information is always enabled. Choose
                whether you would also like promotional messages.
              </p>

              <div className="mt-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">Booking updates</p>
                    <p className="mt-1 text-sm leading-5 text-muted">
                      Confirmations, schedule changes and service updates.
                    </p>
                    <span className="mt-2 inline-block text-xs font-semibold text-forest">
                      Always on
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    aria-label="Booking updates always enabled"
                    className="mt-1 size-5 accent-forest"
                  />
                </div>

                <div className="border-t border-border pt-5">
                  <label className="flex cursor-pointer items-start justify-between gap-4">
                    <span>
                      <span className="block font-semibold text-ink">
                        Promotional messages
                      </span>
                      <span className="mt-1 block text-sm leading-5 text-muted">
                        Offers, package deals and service announcements.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={profile.promotionalMessages}
                      onChange={(event) =>
                        updateProfile(
                          "promotionalMessages",
                          event.target.checked
                        )
                      }
                      className="mt-1 size-5 accent-forest"
                    />
                  </label>
                  <p className="mt-4 text-xs text-muted">
                    Preview only: preference changes are not saved yet.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-white p-5 md:p-7">
              <h2 className="text-xl font-bold text-ink">Your NestOS activity</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Quickly return to your bookings and prepaid packages.
              </p>
              <div className="mt-5 space-y-3">
                <Link
                  href="/bookings"
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 font-semibold text-ink transition hover:border-forest"
                >
                  <span>My bookings</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/packages"
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 font-semibold text-ink transition hover:border-forest"
                >
                  <span>My packages</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </section>

            <section className="rounded-3xl border border-red-200 bg-white p-5 md:p-7">
              <h2 className="text-lg font-bold text-ink">Sign out</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Sign out of your account on this device. Your bookings and
                packages will not be deleted.
              </p>
              <button
                type="button"
                onClick={() => setShowSignOutConfirmation(true)}
                className="mt-5 rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
              >
                Sign out
              </button>
            </section>
          </div>
        </div>
      </section>

      {showPhoneVerification && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowPhoneVerification(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="phone-dialog-title"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl md:p-8"
          >
            <h2 id="phone-dialog-title" className="text-xl font-bold text-ink">
              Verify your new number
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Enter your new mobile number and the OTP sent to it. The existing
              verified number stays unchanged unless verification succeeds.
            </p>

            <label
              htmlFor="newPhone"
              className="mb-2 mt-6 block text-sm font-semibold text-ink"
            >
              New mobile number
            </label>
            <div className="flex rounded-xl border border-border">
              <span className="border-r border-border px-3 py-3 text-sm text-muted">
                +91
              </span>
              <input
                id="newPhone"
                inputMode="numeric"
                maxLength={10}
                value={newPhone}
                onChange={(event) =>
                  setNewPhone(event.target.value.replace(/\D/g, ""))
                }
                className="min-w-0 flex-1 rounded-r-xl px-4 py-3 outline-none"
                placeholder="10-digit number"
              />
            </div>

            <label
              htmlFor="otp"
              className="mb-2 mt-4 block text-sm font-semibold text-ink"
            >
              6-digit OTP
            </label>
            <input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, ""))
              }
              className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-forest"
              placeholder="Enter OTP"
            />

            <p className="mt-3 text-xs leading-5 text-muted">
              Development preview: no SMS is sent and this form cannot verify
              a phone number.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={verifyPhonePreview}
                className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => setShowPhoneVerification(false)}
                className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-ink"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      {showSignOutConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-dialog-title"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl md:p-8"
          >
            <h2 id="signout-dialog-title" className="text-xl font-bold text-ink">
              Sign out of NestOS?
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              You will need to verify your identity again to access your
              account. Your bookings and packages will remain available when
              you sign back in.
            </p>
            <p className="mt-3 text-xs leading-5 text-muted">
              Preview only: secure session invalidation is not connected yet.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowSignOutConfirmation(false);
                  setSignOutNotice(true);
                }}
                className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white"
              >
                Confirm sign out
              </button>
              <button
                type="button"
                onClick={() => setShowSignOutConfirmation(false)}
                className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-ink"
              >
                Stay signed in
              </button>
            </div>
          </section>
        </div>
      )}

      {signOutNotice && (
        <div className="fixed bottom-5 left-1/2 z-[60] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 rounded-2xl border border-border bg-white p-4 shadow-xl">
          <p className="text-sm leading-6 text-ink">
            Preview only: you have not been signed out because real
            authentication and session invalidation are not connected yet.
          </p>
          <button
            type="button"
            onClick={() => setSignOutNotice(false)}
            className="mt-3 text-sm font-semibold text-forest underline underline-offset-4"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
