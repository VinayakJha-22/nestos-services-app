"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SignInModalProps = {
  open: boolean;
  onClose: () => void;
};

const societies = ["Green Residency", "Palm Heights"];

export default function SignInModal({
  open,
  onClose,
}: SignInModalProps) {
  const router = useRouter();

  const [step, setStep] = useState<"phone" | "otp" | "register">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [society, setSociety] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!open) return null;

  function resetAndClose() {
    setStep("phone");
    setPhone("");
    setOtp("");
    setFullName("");
    setSociety("");
    setError("");
    setNotice("");
    onClose();
  }

  function continueWithPhone() {
    setError("");
    setNotice("");

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    // UI demo only: replace with real account lookup later.
    setStep("otp");
    setNotice("Demo OTP: 123456");
  }

  function verifyOtp() {
    setError("");

    if (otp !== "123456") {
      setError("Incorrect demo OTP. Try 123456.");
      return;
    }

    // Mock accounts for demonstrating the UI.
    if (phone === "8888888888") {
      router.push("/operations");
      return;
    }

    if (phone === "9999999999") {
      router.push("/");
      return;
    }

    setStep("register");
    setNotice("");
  }

  function registerCustomer() {
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!society) {
      setError("Please choose your society.");
      return;
    }

    // Registration is not saved yet; backend integration comes later.
    router.push("/");
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
            {step === "phone" && "Welcome back"}
            {step === "otp" && "Verify your number"}
            {step === "register" && "Let's get you started"}
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#65746B]">
            {step === "phone" &&
              "Sign in or create an account to book convenient car care at your society."}
            {step === "otp" &&
              `Enter the demo OTP for +91 ${phone}.`}
            {step === "register" &&
              "Tell us a little about yourself to set up your customer profile."}
          </p>
        </div>

        {step === "phone" && (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              continueWithPhone();
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
              className="flex h-14 w-full items-center justify-center rounded-full bg-[#174C3D] px-6 font-semibold text-white transition hover:bg-[#152B25]"
            >
              Continue with phone
              <span className="ml-2">→</span>
            </button>

            <p className="text-center text-xs leading-5 text-[#7A877F]">
              Authentication is simulated for this design preview. No SMS will
              be sent.
            </p>
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
            {notice && (
              <div className="rounded-xl border border-[#D5E4D8] bg-[#E8F0E8] p-3 text-sm text-[#174C3D]">
                {notice}
              </div>
            )}

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
                placeholder="Enter 123456"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, ""))
                }
                className="h-14 w-full rounded-xl border border-[#DCE4DC] bg-white px-4 text-lg tracking-[0.3em] text-[#152B25] outline-none focus:border-[#174C3D]"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="h-14 w-full rounded-full bg-[#174C3D] font-semibold text-white transition hover:bg-[#152B25]"
            >
              Verify and continue
            </button>

            <button
              type="button"
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
              registerCustomer();
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
                placeholder="Enter your full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
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
                value={society}
                onChange={(event) => setSociety(event.target.value)}
                className="h-14 w-full rounded-xl border border-[#DCE4DC] bg-white px-4 text-sm text-[#152B25] outline-none focus:border-[#174C3D]"
              >
                <option value="">Choose your society</option>
                {societies.map((item) => (
                  <option key={item} value={item}>
                    {item}
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
              className="h-14 w-full rounded-full bg-[#174C3D] font-semibold text-white transition hover:bg-[#152B25]"
            >
              Create account
            </button>
          </form>
        )}

        <p className="mt-7 text-center text-xs leading-5 text-[#7A877F]">
          By continuing, you agree to use NestOS Services in accordance with
          its terms and privacy policy.
        </p>
      </section>
    </div>
  );
}
