
import Link from "next/link";

export default function CustomerFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="container-shell py-12">
        <div className="grid gap-10 sm:grid-cols-2">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-lime text-lg font-bold text-ink">
                N
              </span>
              <span className="text-lg font-bold">NestOS Services</span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
              Your car, cleaned. Without the drive. Convenient car care
              at your residential society.
            </p>
          </div>

          <div className="sm:text-right">
            <p className="font-semibold">Explore NestOS</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm text-white/70 sm:justify-end">
              <Link href="/services" className="hover:text-lime">
                Services
              </Link>
              <Link href="/packages/catalogue" className="hover:text-lime">
                Packages
              </Link>
              <Link href="/bookings" className="hover:text-lime">
                My Bookings
              </Link>
              <Link href="/account" className="hover:text-lime">
                My Account
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/15 pt-5 text-xs text-white/55">
          © 2026 NestOS Services. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
