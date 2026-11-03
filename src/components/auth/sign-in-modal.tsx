
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SignInModalProps = {
  open: boolean;
  onClose: () => void;
};

type Society = {
  id: string;
  name: string;
  locality: string | null;
  city: string | null;
};

type Step = "phone" | "otp" | "register";

export default function SignInModal({
  open,
  onClose,
}: SignInModalProps) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [societyId, setSocietyId] = useState("");

  const [societies, setSocieties] = useState<Society[]>([]);
  const [isLoadingSocieties, setIsLoadingSocieties] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open || step !== "register") return;

    async function loadSocieties() {
      setIsLoadingSocieties(true);

      try {
        const response = await fetch("/api/societies", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load societies.");
        }

        setSocieties(data.societies || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load societies."
        );
      } finally {
        setIsLoadingSocieties(false);
      }
    }

    loadSocieties();
  }, [open, step]);

  if (!open) return null;

  function resetAndClose() {
    setStep("phone");
    setPhone("");
    setOtp("");
    setFullName("");
    setEmail("");
    setSocietyId("");
    setError("");
    setNotice("");
    onClose();
  }

  async function sendOtp() {
    setError("");
    setNotice("");

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to send OTP.");
      }

      setStep("otp");
      setNotice(
        "If this number is registered, you will receive an OTP on WhatsApp."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to send OTP."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyOtp() {
    setError("");
    setNotice("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "OTP verification failed.");
      }

      if (data.requiresProfile) {
        setStep("register");
        setNotice("");
        return;
      }

      // Existing customer successfully signed in.
      resetAndClose();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify OTP."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function completeRegistration() {
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (
      email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim() || null,
          preferredSocietyId: societyId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to create your account."
        );
      }

      // New customer successfully registered and signed in.
      resetAndClose();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#152B25]/65 p-4 backdrop-blur-sm"
      onClick={resetAndClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-title"
        className="relative my-auto w-full max-w-md rounded-3xl bg-[#F7F8F3] p-6 shadow-2xl sm:p-9"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={resetAndClose}
          aria-label="Close sign in"
          className="absolute right-5 top-5 grid size-9 place-items-center rounded-full border border-[#DCE4DC] text-xl text-[#152B25] transition hover:bg-white"
        >
          ×
        </button>

        <div className="mb-7">
          <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-[#174C3D] text-xl font-bold text-white">
            N
          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#62806F]">
            NestOS Services
          </p>

          <h2
            id="sign-in-title"
            className="text-3xl font-bold tracking-tight text-[#152B25]"
          >
            {step === "phone" && "Welcome to NestOS"}
            {step === "otp" && "Verify your number"}
            {step === "register" && "Create your account"}
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#65746B]">
            {step === "phone" &&
              "Sign in or create an account to book convenient car care at your society."}

            {step === "otp" &&
              `Enter the 6-digit OTP sent to +91 ${phone}.`}

            {step === "register" &&
              "Complete your profile to get started with NestOS Services."}
          </p>
        </div>

        {step === "phone" && (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              sendOtp();
            }}
          >
            <div>
              <label
                htmlFor="sign-in-phone"
                className="mb-2 block text-sm font-semibold text-[#152B25]"
              >
                Mobile number
              </label>

              <div className="flex h-14 items-center rounded-xl border border-[#DCE4DC] bg-white px-4 focus-within:border-[#174C3D]">
                <span className="mr-3 border-r border-[#DCE4DC] pr-3 text-sm font-semibold text-[#52665A]">
                  +91
                </span>

                <input
                  id="sign-in-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value.replace(/\D/g, ""))
                  }
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#152B25] outline-none"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-14 w-full items-center justify-center rounded-full bg-[#174C3D] px-6 font-semibold text-white transition hover:bg-[#152B25] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending OTP..." : "Continue with phone"}
              {!isSubmitting && <span className="ml-2">→</span>}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              verifyOtp();
            }}
          >
            <div>
              <label
                htmlFor="sign-in-otp"
                className="mb-2 block text-sm font-semibold text-[#152B25]"
              >
                6-digit OTP
              </label>

              <input
                id="sign-in-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="Enter OTP"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, ""))
                }
                className="h-14 w-full rounded-xl border border-[#DCE4DC] bg-white px-4 text-lg tracking-[0.3em] text-[#152B25] outline-none focus:border-[#174C3D]"
              />
            </div>

            {notice && (
              <p className="text-sm text-[#52665A]">{notice}</p>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-14 w-full rounded-full bg-[#174C3D] font-semibold text-white transition hover:bg-[#152B25] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Verifying..." : "Verify and continue"}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError("");
                setNotice("");
              }}
              className="w-full py-2 text-sm font-semibold text-[#174C3D]"
            >
              Change mobile number
            </button>
          </form>
        )}

        {step === "register" && (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              completeRegistration();
            }}
          >
            <div>
              <label
                htmlFor="sign-up-name"
                className="mb-2 block text-sm font-semibold text-[#152B25]"
              >
                Full name
              </label>

              <input
                id="sign-up-name"
                type="text"
                autoComplete="name"
                maxLength={100}
                placeholder="Enter your full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="h-14 w-full rounded-xl border border-[#DCE4DC] bg-white px-4 text-sm text-[#152B25] outline-none focus:border-[#174C3D]"
              />
            </div>

            <div>
              <label
                htmlFor="sign-up-email"
                className="mb-2 block text-sm font-semibold text-[#152B25]"
              >
                Email address (optional)
              </label>

              <input
                id="sign-up-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-14 w-full rounded-xl border border-[#DCE4DC] bg-white px-4 text-sm text-[#152B25] outline-none focus:border-[#174C3D]"
              />
            </div>

            <div>
              <label
                htmlFor="sign-up-society"
                className="mb-2 block text-sm font-semibold text-[#152B25]"
              >
                Preferred society
              </label>

              <select
                id="sign-up-society"
                value={societyId}
                onChange={(event) => setSocietyId(event.target.value)}
                disabled={isLoadingSocieties}
                className="h-14 w-full rounded-xl border border-[#DCE4DC] bg-white px-4 text-sm text-[#152B25] outline-none focus:border-[#174C3D] disabled:opacity-60"
              >
                <option value="">
                  {isLoadingSocieties
                    ? "Loading societies..."
                    : "Select your society (optional)"}
                </option>

                {societies.map((society) => (
                  <option key={society.id} value={society.id}>
                    {society.name}
                    {society.locality ? `, ${society.locality}` : ""}
                    {society.city ? `, ${society.city}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl bg-white p-4">
              <p className="text-xs font-medium text-[#7A877F]">
                Verified mobile number
              </p>
              <p className="mt-1 font-semibold text-[#152B25]">
                +91 {phone}
              </p>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLoadingSocieties}
              className="h-14 w-full rounded-full bg-[#174C3D] font-semibold text-white transition hover:bg-[#152B25] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}

        <p className="mt-7 text-center text-xs leading-5 text-[#7A877F]">
          By continuing, you agree to use NestOS Services in accordance
          with its terms and privacy policy.
        </p>
      </section>
    </div>
  );
}
