
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OperationsLoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const cleanPhone = phone.replace(/\D/g, "");

    if (!/^(?:91)?[6-9]\d{9}$/.test(cleanPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/operations/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to send OTP. Please try again.");
      }

      setOtpSent(true);
      setMessage(
        data.message || "If this number is registered, an OTP will be sent."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the six-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/operations/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "OTP verification failed.");
      }

      router.replace("/operations");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-md items-center justify-center">
      <div className="w-full rounded-3xl border border-[#174C3D]/10 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#174C3D] text-2xl font-bold text-white">
            N
          </div>

          <p className="text-sm font-semibold tracking-widest text-[#174C3D]">
            NESTOS SERVICES
          </p>

          <h1 className="mt-3 text-2xl font-bold tracking-tight">
            Operations Login
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Sign in using your registered operations phone number.
          </p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium"
              >
                Registered mobile number
              </label>

              <div className="flex overflow-hidden rounded-xl border border-gray-200 focus-within:border-[#174C3D]">
                <span className="flex items-center border-r border-gray-200 bg-gray-50 px-4 text-sm text-gray-600">
                  +91
                </span>

                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  required
                  className="min-w-0 flex-1 px-4 py-3 text-sm outline-none"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {message && (
              <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="w-full rounded-xl bg-[#174C3D] px-5 py-3 font-semibold text-white transition hover:bg-[#10392E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label
                htmlFor="otp"
                className="mb-2 block text-sm font-medium"
              >
                Enter six-digit OTP
              </label>

              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                maxLength={6}
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-xl tracking-[0.5em] outline-none focus:border-[#174C3D]"
              />

              <p className="mt-2 text-xs text-gray-500">
                OTP sent to the registered number ending in{" "}
                {phone.slice(-4)}.
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {message && (
              <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-xl bg-[#174C3D] px-5 py-3 font-semibold text-white transition hover:bg-[#10392E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>

            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setError("");
                setMessage("");
              }}
              className="w-full text-sm font-medium text-[#174C3D] hover:underline"
            >
              Change phone number
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          Authorized NestOS operations personnel only.
        </p>
      </div>
    </div>
  );
}
