
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Society = {
    id: string;
    name: string;
    address_line: string;
    locality: string;
    city: string;
    is_accepting_bookings: boolean;
};

function getSafeReturnTo(value: string | null): string {
    const fallback = "/booking/payment";

    if (!value) return fallback;

    try {
        const url = new URL(value, window.location.origin);

        if (url.origin !== window.location.origin) {
            return fallback;
        }

        const allowedPaths = [
            "/booking/payment",
            "/packages/payment",
        ];

        if (!allowedPaths.includes(url.pathname)) {
            return fallback;
        }

        return `${url.pathname}${url.search}`;
    } catch {
        return fallback;
    }
}

export default function ProfilePage() {
    const router = useRouter();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [preferredSocietyId, setPreferredSocietyId] = useState("");

    const [societies, setSocieties] = useState<Society[]>([]);
    const [loadingSocieties, setLoadingSocieties] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadSocieties() {
            try {
                const response = await fetch("/api/societies", {
                    cache: "no-store",
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || "Unable to load societies.");
                }

                const availableSocieties: Society[] = data.societies ?? [];
                setSocieties(availableSocieties);

                const selectedSociety = sessionStorage.getItem(
                    "nestos-selected-society"
                );

                if (
                    selectedSociety &&
                    availableSocieties.some((society) => society.id === selectedSociety)
                ) {
                    setPreferredSocietyId(selectedSociety);
                }
            } catch (err) {
                console.error("Failed to load societies:", err);
                setLoadError("We couldn't load societies. Please try again.");
            } finally {
                setLoadingSocieties(false);
            }
        }

        async function loadVerifiedPhone() {
            try {
                const response = await fetch("/api/auth/onboarding", {
                    cache: "no-store",
                    credentials: "include",
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || "Phone verification is required.");
                }

                setPhone(data.phone);
            } catch (err) {
                console.error("Unable to retrieve verified phone:", err);

                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to retrieve your verified phone number."
                );
            }
        }

        loadSocieties();
        loadVerifiedPhone();
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        if (!fullName.trim()) {
            setError("Please enter your full name.");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/auth/complete-profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fullName: fullName.trim(),
                    email: email.trim() || undefined,
                    preferredSocietyId: preferredSocietyId || null,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Unable to create your account.");
            }

            const returnTo = getSafeReturnTo(
                new URLSearchParams(window.location.search).get("returnTo")
            );

            router.push(returnTo);
            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-full bg-cream">
            <section className="border-b border-border bg-white">
                <div className="container-shell py-8 sm:py-10">
                    <Link
                        href="/"
                        className="text-sm font-medium text-muted hover:text-forest"
                    >
                        ← Back to home
                    </Link>

                    <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-forest">
                        Your account · Almost there
                    </p>

                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                        Complete your profile
                    </h1>

                    <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
                        Tell us a little about yourself to make booking and managing your
                        car washes easier.
                    </p>
                </div>
            </section>

            <section className="container-shell py-8 sm:py-12">
                <div className="mx-auto max-w-2xl">
                    <form
                        onSubmit={handleSubmit}
                        className="rounded-[24px] border border-border bg-white p-5 shadow-sm sm:p-8"
                    >
                        <div>
                            <h2 className="text-lg font-bold text-ink">
                                Personal details
                            </h2>
                            <p className="mt-1 text-sm text-muted">
                                Your phone number has already been verified.
                            </p>
                        </div>

                        <div className="mt-7 space-y-5">
                            <div>
                                <label
                                    htmlFor="fullName"
                                    className="mb-2 block text-sm font-semibold text-ink"
                                >
                                    Full name
                                </label>
                                <input
                                    id="fullName"
                                    type="text"
                                    required
                                    maxLength={100}
                                    value={fullName}
                                    onChange={(event) => setFullName(event.target.value)}
                                    placeholder="Enter your full name"
                                    className="min-h-12 w-full rounded-xl border border-border bg-cream px-4 text-sm text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/10"
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
                                    maxLength={254}
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="you@example.com"
                                    className="min-h-12 w-full rounded-xl border border-border bg-cream px-4 text-sm text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/10"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="phone"
                                    className="mb-2 block text-sm font-semibold text-ink"
                                >
                                    Verified phone number
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    readOnly
                                    placeholder="Verified phone number"
                                    className="min-h-12 w-full rounded-xl border border-border bg-[#F1F3EF] px-4 text-sm text-muted outline-none"
                                />
                                <p className="mt-2 text-xs text-muted">
                                    This number was verified using WhatsApp OTP.
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="preferredSociety"
                                    className="mb-2 block text-sm font-semibold text-ink"
                                >
                                    Preferred society
                                    <span className="font-normal text-muted"> (optional)</span>
                                </label>

                                <select
                                    id="preferredSociety"
                                    value={preferredSocietyId}
                                    onChange={(event) =>
                                        setPreferredSocietyId(event.target.value)
                                    }
                                    disabled={loadingSocieties || !!loadError}
                                    className="min-h-12 w-full rounded-xl border border-border bg-cream px-4 text-sm text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/10 disabled:opacity-60"
                                >
                                    <option value="">
                                        {loadingSocieties
                                            ? "Loading societies..."
                                            : "Select your preferred society"}
                                    </option>

                                    {societies.map((society) => (
                                        <option key={society.id} value={society.id}>
                                            {society.name} — {society.locality}, {society.city}
                                            {!society.is_accepting_bookings
                                                ? " (Not accepting bookings)"
                                                : ""}
                                        </option>
                                    ))}
                                </select>

                                {loadError && (
                                    <p className="mt-2 text-xs text-red-600">{loadError}</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 border-t border-border pt-6">
                            <h3 className="text-sm font-bold text-ink">
                                Communication preferences
                            </h3>

                            <div className="mt-4 space-y-4">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked
                                        disabled
                                        className="mt-1 size-4 accent-forest"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-ink">
                                            Essential booking updates
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-muted">
                                            Booking confirmations and important service updates are
                                            always enabled.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <input
                                        id="promotions"
                                        type="checkbox"
                                        className="mt-1 size-4 accent-forest"
                                    />
                                    <div>
                                        <label
                                            htmlFor="promotions"
                                            className="text-sm font-semibold text-ink"
                                        >
                                            Promotional messages
                                        </label>
                                        <p className="mt-1 text-xs leading-5 text-muted">
                                            Offers, discounts and occasional updates from NestOS
                                            Services.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || loadingSocieties}
                            className="mt-8 flex min-h-13 w-full items-center justify-center rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? "Creating your account..." : "Continue to booking →"}
                        </button>

                        <p className="mt-4 text-center text-xs leading-5 text-muted">
                            By continuing, you agree to use NestOS Services in accordance
                            with our terms and privacy policy.
                        </p>
                    </form>
                </div>
            </section>
        </div>
    );
}
