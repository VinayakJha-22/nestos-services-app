
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Profile = {
  fullName: string;
  email: string;
  phone: string;
  preferredSociety: string;
  bookingUpdates: boolean;
  promotionalMessages: boolean;
};

type Society = {
  id: string;
  name: string;
  address_line: string;
  locality: string | null;
  city: string;
};

type SavedSociety = {
  name: string;
  address: string;
};

type AccountInfo = {
  id: string;
  phoneVerifiedAt: string | null;
  createdAt: string;
  accountStatus: string;
};

const initialProfile: Profile = {
  fullName: "",
  email: "",
  phone: "",
  preferredSociety: "",
  bookingUpdates: true,
  promotionalMessages: false,
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getErrorMessage(data: any, fallback: string) {
  return data?.message || data?.error || fallback;
}

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [savedProfile, setSavedProfile] = useState<Profile>(initialProfile);

  const [societies, setSocieties] = useState<Society[]>([]);
  const [savedSociety, setSavedSociety] = useState<SavedSociety | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [editing, setEditing] = useState(false);

  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showPhoneChangeConfirmation, setShowPhoneChangeConfirmation] =
    useState(false);
  const [showSignOutConfirmation, setShowSignOutConfirmation] =
    useState(false);

  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [confirmingPhoneChange, setConfirmingPhoneChange] = useState(false);

  const [notice, setNotice] = useState("");
  const [phoneDialogError, setPhoneDialogError] = useState("");
  const [confirmationError, setConfirmationError] = useState("");

  useEffect(() => {
    async function loadAccount() {
      try {
        const [profileResponse, societiesResponse] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/societies", { cache: "no-store" }),
        ]);

        const profileData = await profileResponse.json();
        const societiesData = await societiesResponse.json();

        if (!profileResponse.ok || !profileData.authenticated) {
          window.location.href = "/sign-in";
          return;
        }

        if (!societiesResponse.ok || !societiesData.success) {
          throw new Error("Unable to load available societies.");
        }

        const customer = profileData.customer;

        const loadedProfile: Profile = {
          fullName: customer.fullName ?? "",
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          preferredSociety: customer.preferredSocietyId ?? "",
          bookingUpdates: customer.bookingUpdates ?? true,
          promotionalMessages: customer.promotionalMessages ?? false,
        };

        setProfile(loadedProfile);
        setSavedProfile(loadedProfile);
        setSocieties(societiesData.societies ?? []);
        setSavedSociety(customer.preferredSociety ?? null);

        setAccountInfo({
          id: customer.id,
          phoneVerifiedAt: customer.phoneVerifiedAt ?? null,
          createdAt: customer.createdAt,
          accountStatus: customer.accountStatus ?? "unknown",
        });
      } catch (error) {
        console.error("Account loading error:", error);
        setNotice("Unable to load your account details. Please refresh.");
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, []);

  const selectedSociety = societies.find(
    (society) => society.id === profile.preferredSociety
  );

  const selectedSocietyAddress = selectedSociety
    ? [
      selectedSociety.address_line,
      selectedSociety.locality,
      selectedSociety.city,
    ]
      .filter(Boolean)
      .join(", ")
    : savedSociety?.address ?? "";

  function updateProfile<K extends keyof Profile>(
    field: K,
    value: Profile[K]
  ) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile() {
    if (!profile.fullName.trim()) {
      setNotice("Please enter your full name.");
      return;
    }

    setSaving(true);
    setNotice("");

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName.trim(),
          email: profile.email.trim() || null,
          preferredSocietyId: profile.preferredSociety || null,
          promotionalMessages: profile.promotionalMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          getErrorMessage(data, "Unable to save your profile.")
        );
      }

      const updatedProfile = {
        ...profile,
        fullName: profile.fullName.trim(),
        email: profile.email.trim(),
      };

      setProfile(updatedProfile);
      setSavedProfile(updatedProfile);
      setEditing(false);
      setNotice("Your profile has been updated.");
    } catch (error) {
      console.error("Profile save error:", error);
      setNotice(
        error instanceof Error ? error.message : "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  function openPhoneVerification() {
    setNewPhone("");
    setOtp("");
    setOtpSent(false);
    setPhoneDialogError("");
    setNotice("");
    setShowPhoneVerification(true);
  }

  function closePhoneVerification() {
    setShowPhoneVerification(false);
    setNewPhone("");
    setOtp("");
    setOtpSent(false);
    setPhoneDialogError("");
  }

  async function sendPhoneOtp() {
    if (!/^[6-9]\d{9}$/.test(newPhone)) {
      setPhoneDialogError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    const currentPhone = profile.phone.replace(/\D/g, "").replace(/^91/, "");

    if (newPhone === currentPhone) {
      setPhoneDialogError(
        "This is already your registered phone number."
      );
      return;
    }

    setSendingOtp(true);
    setPhoneDialogError("");

    try {
      const response = await fetch("/api/auth/change-phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          getErrorMessage(data, "Unable to send OTP. Please try again.")
        );
      }

      setOtpSent(true);
      setPhoneDialogError(
        data.message || "OTP sent successfully. Please check your WhatsApp."
      );
    } catch (error) {
      setPhoneDialogError(
        error instanceof Error ? error.message : "Unable to send OTP."
      );
    } finally {
      setSendingOtp(false);
    }
  }


  async function verifyPhoneOtp() {
    if (!/^\d{6}$/.test(otp)) {
      setPhoneDialogError("Enter the 6-digit OTP.");
      return;
    }

    setVerifyingOtp(true);
    setPhoneDialogError("");

    try {
      const response = await fetch("/api/auth/change-phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: newPhone,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.verified) {
        throw new Error(
          getErrorMessage(data, "OTP verification failed. Please try again.")
        );
      }

      // Preserve newPhone for the confirmation modal.
      setShowPhoneVerification(false);
      setOtp("");
      setPhoneDialogError("");

      setConfirmationError("");
      setShowPhoneChangeConfirmation(true);
    } catch (error) {
      setPhoneDialogError(
        error instanceof Error ? error.message : "OTP verification failed."
      );
    } finally {
      setVerifyingOtp(false);
    }
  }


  async function confirmPhoneChange() {
    setConfirmingPhoneChange(true);
    setConfirmationError("");

    try {
      const response = await fetch("/api/auth/change-phone/confirm", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          getErrorMessage(data, "Unable to update your phone number.")
        );
      }

      window.location.href = data.redirectTo || "/sign-in";
    } catch (error) {
      setConfirmationError(
        error instanceof Error
          ? error.message
          : "Unable to update your phone number. Please try again."
      );
    } finally {
      setConfirmingPhoneChange(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    setNotice("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          getErrorMessage(data, "Unable to sign out. Please try again.")
        );
      }

      window.location.href = "/properties";
    } catch (error) {
      console.error("Sign-out error:", error);
      setNotice(
        error instanceof Error ? error.message : "Unable to sign out."
      );
      setShowSignOutConfirmation(false);
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <section className="container-shell py-20 text-center">
          <p className="text-sm font-medium text-muted">
            Loading your account...
          </p>
        </section>
      </div>
    );
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
          <div className="space-y-6">
            {/* Personal details */}
            <section className="rounded-3xl border border-border bg-white p-5 md:p-8">
              <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-ink">
                    Personal details
                  </h2>

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
                    Email address{" "}
                    <span className="font-normal text-muted">(optional)</span>
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
                      <span aria-hidden="true">✓</span> Verified
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={openPhoneVerification}
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
                    <option value="">Select a society (optional)</option>

                    {savedSociety &&
                      profile.preferredSociety &&
                      !societies.some(
                        (society) => society.id === profile.preferredSociety
                      ) && (
                        <option value={profile.preferredSociety}>
                          {savedSociety.name} (not currently accepting bookings)
                        </option>
                      )}

                    {societies.map((society) => (
                      <option key={society.id} value={society.id}>
                        {society.name}
                      </option>
                    ))}
                  </select>

                  {selectedSocietyAddress && (
                    <p className="mt-2 text-xs text-muted">
                      {selectedSocietyAddress}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-muted">
                    Your preferred society is a convenience for future
                    bookings; you can still book at other available locations.
                  </p>
                </div>
              </div>

              {editing && (
                <div className="mt-7 flex flex-wrap gap-3 border-t border-border pt-6">
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={saving}
                    className="rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfile(savedProfile);
                      setEditing(false);
                      setNotice("");
                    }}
                    disabled={saving}
                    className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-ink transition hover:bg-cream disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </section>

            {/* Read-only account information */}
            <section className="rounded-3xl border border-border bg-white p-5 md:p-8">
              <h2 className="text-xl font-bold text-ink">
                Account information
              </h2>

              <p className="mt-1 text-sm text-muted">
                These details are maintained by NestOS and cannot be edited.
              </p>

              <div className="mt-6 divide-y divide-border">
                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-muted">Customer ID</span>
                  <span className="break-all text-sm font-semibold text-ink sm:max-w-[60%] sm:text-right">
                    {accountInfo?.id || "Not available"}
                  </span>
                </div>

                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-muted">
                    Phone verification
                  </span>
                  <span className="text-sm font-semibold text-forest sm:text-right">
                    {accountInfo?.phoneVerifiedAt
                      ? `Verified on ${formatDate(accountInfo.phoneVerifiedAt)}`
                      : "Verified"}
                  </span>
                </div>

                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-muted">Account created</span>
                  <span className="text-sm font-semibold text-ink sm:text-right">
                    {formatDate(accountInfo?.createdAt)}
                  </span>
                </div>

                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-muted">Account status</span>
                  <span
                    className={`text-sm font-semibold capitalize ${accountInfo?.accountStatus === "active"
                        ? "text-forest"
                        : "text-ink"
                      }`}
                  >
                    {accountInfo?.accountStatus || "Unknown"}
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Communication preferences */}
            <section className="rounded-3xl border border-border bg-white p-5 md:p-7">
              <h2 className="text-xl font-bold text-ink">
                Communication preferences
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted">
                Important booking information is always enabled. Choose whether
                you would also like promotional messages.
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
                    checked
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
                      disabled={!editing}
                      onChange={(event) =>
                        updateProfile(
                          "promotionalMessages",
                          event.target.checked
                        )
                      }
                      className="mt-1 size-5 accent-forest"
                    />
                  </label>
                </div>

                {!editing && (
                  <p className="border-t border-border pt-4 text-xs text-muted">
                    Select Edit profile to change your promotional preference.
                  </p>
                )}
              </div>
            </section>

            {/* Activity */}
            <section className="rounded-3xl border border-border bg-white p-5 md:p-7">
              <h2 className="text-xl font-bold text-ink">
                Your NestOS activity
              </h2>

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

            {/* Sign out */}
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

      {/* Phone OTP modal */}
      {showPhoneVerification && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePhoneVerification();
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
              Enter your new mobile number. We will send an OTP to your
              WhatsApp number to verify it.
            </p>

            {phoneDialogError && (
              <div
                role="status"
                className="mt-4 rounded-xl border border-border bg-cream p-3 text-sm text-ink"
              >
                {phoneDialogError}
              </div>
            )}

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
                disabled={otpSent || sendingOtp || verifyingOtp}
                onChange={(event) =>
                  setNewPhone(event.target.value.replace(/\D/g, ""))
                }
                className="min-w-0 flex-1 rounded-r-xl px-4 py-3 outline-none disabled:bg-cream"
                placeholder="10-digit number"
              />
            </div>

            {otpSent && (
              <>
                <label
                  htmlFor="otp"
                  className="mb-2 mt-5 block text-sm font-semibold text-ink"
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
                  Enter the OTP sent to your new WhatsApp number. The OTP is
                  valid for 5 minutes.
                </p>
              </>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {!otpSent ? (
                <button
                  type="button"
                  onClick={sendPhoneOtp}
                  disabled={sendingOtp}
                  className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {sendingOtp ? "Sending OTP..." : "Send OTP"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={verifyPhoneOtp}
                  disabled={verifyingOtp}
                  className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {verifyingOtp ? "Verifying..." : "Verify OTP"}
                </button>
              )}

              <button
                type="button"
                onClick={closePhoneVerification}
                disabled={sendingOtp || verifyingOtp}
                className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Confirm phone change modal */}
      {showPhoneChangeConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="phone-confirm-title"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl md:p-8"
          >
            <h2
              id="phone-confirm-title"
              className="text-xl font-bold text-ink"
            >
              Confirm phone number change
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted">
              Your new phone number has been verified. Confirming this change
              will replace your registered number and sign you out of all
              active sessions. You will need to sign in again using your new
              number.
            </p>

            <div className="mt-5 rounded-xl border border-border bg-cream p-4">
              <p className="text-xs font-medium text-muted">Current number</p>
              <p className="mt-1 font-semibold text-ink">{profile.phone}</p>

              <p className="mt-4 text-xs font-medium text-muted">New number</p>
              <p className="mt-1 font-semibold text-forest">+91 {newPhone}</p>
            </div>

            {confirmationError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {confirmationError}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={confirmPhoneChange}
                disabled={confirmingPhoneChange}
                className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {confirmingPhoneChange
                  ? "Updating number..."
                  : "Confirm change"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPhoneChangeConfirmation(false);
                  setConfirmationError("");
                }}
                disabled={confirmingPhoneChange}
                className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Sign-out confirmation modal */}
      {showSignOutConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-dialog-title"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl md:p-8"
          >
            <h2
              id="signout-dialog-title"
              className="text-xl font-bold text-ink"
            >
              Sign out of NestOS?
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted">
              You will need to verify your identity again to access your
              account. Your bookings and packages will remain available when
              you sign back in.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {signingOut ? "Signing out..." : "Confirm sign out"}
              </button>

              <button
                type="button"
                onClick={() => setShowSignOutConfirmation(false)}
                disabled={signingOut}
                className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60"
              >
                Stay signed in
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
