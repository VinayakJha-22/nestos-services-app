
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BookingVerifyPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const normalisedPhone = phone.replace(/\D/g, "");
  const isPhoneValid = /^[6-9]\d{9}$/.test(normalisedPhone);
  const isOtpValid = /^\d{6}$/.test(otp);

  async function handleSendOtp() {
    setMessage("");

    if (!isPhoneValid) {
      setMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: normalisedPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to send OTP. Please try again.");
      }

      setStep("otp");
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to send OTP. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerifyOtp() {
    setMessage("");

    if (!isOtpValid) {
      setMessage("Enter a valid 6-digit verification code.");
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: normalisedPhone,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "OTP verification failed. Please try again.");
      }

      if (data.requiresProfile) {
        router.push("/booking/profile");
        return;
      }

      router.push("/booking/payment");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to verify OTP. Please try again."
      );
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <section className="bg-forest text-white">
        <div className="container-shell py-10 md:py-14">
          <Link
            href="/booking/review"
            className="text-sm text-white/70 transition hover:text-lime"
          >
            ← Back to booking review
          </Link>

          <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-lime">
            Step 5 · Phone verification
          </p>

          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            {step === "phone"
              ? "Let's verify your number."
              : "Enter your verification code."}
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Verify your mobile number to continue with your NestOS booking.
          </p>
        </div>
      </section>

      <section className="container-shell flex justify-center py-10 md:py-16">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-9">
          <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-cream text-forest">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-7"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <rect
                x="6"
                y="2.5"
                width="12"
                height="19"
                rx="2"
              />
              <path d="M10 18h4" strokeLinecap="round" />
            </svg>
          </div>

          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <strong>Integration in progress:</strong> Real WhatsApp OTP delivery is
            connected. OTP verification and customer sign-in are being connected next.
            Do not use the preview verification button yet.
          </div>

          {step === "phone" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSendOtp();
              }}
            >
              <h2 className="text-xl font-bold text-ink">
                Your mobile number
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted">
                Enter your Indian mobile number. We'll send a one-time
                password to your WhatsApp number.
              </p>

              <label
                htmlFor="phone"
                className="mt-6 block text-sm font-semibold text-ink"
              >
                Mobile number
              </label>

              <div className="mt-2 flex overflow-hidden rounded-xl border border-border focus-within:border-forest">
                <span className="flex items-center border-r border-border bg-cream px-4 text-sm font-semibold text-ink">
                  +91
                </span>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={phone}
                  onChange={(event) => {
                    setPhone(
                      event.target.value.replace(/\D/g, "").slice(0, 10)
                    );
                    setMessage("");
                  }}
                  placeholder="10-digit mobile number"
                  className="min-w-0 flex-1 px-4 py-3.5 text-sm text-ink outline-none"
                  aria-describedby="phone-help"
                />
              </div>

              <p id="phone-help" className="mt-2 text-xs text-muted">
                Your number will be used for essential booking updates.
              </p>

              {message && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="mt-7 flex min-h-12 w-full items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? "Sending OTP..." : "Send verification code →"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleVerifyOtp();
              }}
            >
              <h2 className="text-xl font-bold text-ink">
                Verify your number
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted">
                Enter the 6-digit code sent to WhatsApp at +91 {normalisedPhone}.
              </p>

              <label
                htmlFor="otp"
                className="mt-6 block text-sm font-semibold text-ink"
              >
                6-digit verification code
              </label>

              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) => {
                  setOtp(
                    event.target.value.replace(/\D/g, "").slice(0, 6)
                  );
                  setMessage("");
                }}
                placeholder="Enter 6 digits OTP"
                className="mt-2 w-full rounded-xl border border-border px-4 py-4 text-center text-xl font-bold tracking-[0.4em] text-ink outline-none focus:border-forest"
              />

              {message && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {message}
                </p>
              )}

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="mt-7 flex min-h-12 w-full items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerifying ? "Verifying OTP..." : "Verify and continue →"}
                </button>

              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setMessage("");
                }}
                className="mt-4 w-full py-2 text-sm font-semibold text-forest hover:underline"
              >
                Change mobile number
              </button>
            </form>
          )}

          <div className="mt-7 border-t border-border pt-5">
            <p className="text-xs leading-5 text-muted">
              In production, the server will verify the OTP, enforce
              attempt limits, and create a secure session. The browser
              preview cannot establish an authenticated session.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
