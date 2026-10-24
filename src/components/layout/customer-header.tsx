
import Link from "next/link";

const navigation = [
  { label: "Services", href: "/services" },
  { label: "Packages", href: "/packages" },
  { label: "My Bookings", href: "/bookings" },
];

export default function CustomerHeader() {
  return (
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

        <Link
          href="/account"
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white transition-colors hover:bg-ink"
        >
          My Account
        </Link>
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
  );
}
