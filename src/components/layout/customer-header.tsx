
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import SignInModal from "@/components/auth/sign-in-modal";

const navigation = [
  { label: "Services", href: "/services" },
  { label: "Packages", href: "/packages" },
  { label: "My Bookings", href: "/bookings" },
];

export default function CustomerHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [signInOpen, setSignInOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function checkSession() {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        setIsAuthenticated(false);
        return false;
      }

      const data = await response.json();
      const authenticated = data.authenticated === true;

      setIsAuthenticated(authenticated);
      return authenticated;
    } catch (error) {
      console.error("Unable to check customer session:", error);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsCheckingAuth(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function initialiseAuth() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });

        const data = response.ok ? await response.json() : null;
        const authenticated = data?.authenticated === true;

        if (!isActive) return;

        setIsAuthenticated(authenticated);

        if (pathname === "/" && !authenticated && response.ok) {
          setSignInOpen(true);
        }
      } catch (error) {
        console.error("Unable to check customer session:", error);
      } finally {
        if (isActive) {
          setIsCheckingAuth(false);
        }
      }
    }

    initialiseAuth();

    return () => {
      isActive = false;
    };
  }, [pathname]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to log out. Please try again.");
      }

      setIsAuthenticated(false);
      setSignInOpen(false);

      // Remove the unfinished booking data after logout
      sessionStorage.removeItem("nestos-booking-draft");

      // Redirect the customer away from protected booking pages
      if (pathname.startsWith("/booking") || pathname === "/bookings") {
        router.replace("/");
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Logout failed:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Unable to log out. Please try again."
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleModalClose() {
    setSignInOpen(false);
    await checkSession();
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-cream/95 backdrop-blur">
        <div className="container-shell flex min-h-[76px] items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="grid size-10 place-items-center rounded-xl bg-forest text-lg font-bold text-white">
              N
            </span>

            <span className="leading-tight">
              <span className="block text-lg font-bold tracking-tight text-forest">
                NestOS
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Services
              </span>
            </span>
          </Link>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 md:flex"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-ink transition-colors hover:text-forest"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut || isCheckingAuth}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSignInOpen(true)}
              disabled={isCheckingAuth}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sign Up
            </button>
          )}
        </div>

        <nav
          aria-label="Mobile navigation"
          className="flex gap-5 overflow-x-auto border-t border-border px-4 py-3 md:hidden"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 text-sm font-medium text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <SignInModal
        open={signInOpen}
        onClose={handleModalClose}
      />
    </>
  );
}
