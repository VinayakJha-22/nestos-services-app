
import Link from "next/link";

const services = [
  {
    number: "01",
    name: "Exterior Cleaning",
    description: "A fresh, clean exterior for your everyday drives.",
    price: 349,
    label: "Everyday essential",
    visual: "bg-[#E6EFE8]",
    accent: "bg-[#174C3D]",
  },
  {
    number: "02",
    name: "Exterior + Interior",
    description: "A cleaner exterior and a tidier cabin.",
    price: 499,
    label: "Complete clean",
    visual: "bg-[#EFF0D9]",
    accent: "bg-[#758C3D]",
  },
  {
    number: "03",
    name: "Premium Cleaning",
    description: "An elevated clean for when your car needs extra care.",
    price: 799,
    label: "Premium care",
    visual: "bg-[#E6E9EF]",
    accent: "bg-[#455B7D]",
  },
];

const benefits = [
  {
    number: "01",
    title: "Right at your society",
    description: "Skip the drive. Get your car cleaned where it is parked.",
  },
  {
    number: "02",
    title: "Choose your slot",
    description: "Pick from the available booking times at your location.",
  },
  {
    number: "03",
    title: "Clear pricing",
    description: "Know the service price before you confirm your booking.",
  },
];

function ArrowUpRight() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5"
    >
      <path
        d="M7 17 17 7M7 7h10v10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CarIllustration({ premium = false }: { premium?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 170"
      fill="none"
      className="w-full max-w-[290px]"
    >
      <ellipse cx="160" cy="140" rx="112" ry="10" fill="#152B25" opacity=".08" />
      <path
        d="m65 101 12-28c4-10 12-16 23-18l36-6c10-2 19-1 28 4l32 20 37 8c11 3 18 10 21 20l4 17H54l3-10c1-3 4-6 8-7Z"
        fill={premium ? "#455B7D" : "#174C3D"}
      />
      <path
        d="m111 63-12 32h65V62l-7-4c-7-4-14-5-22-4l-18 3c-3 1-5 3-6 6Z"
        fill="#DDE9E0"
      />
      <path
        d="M173 64v31h65l-4-8c-2-4-6-7-11-8l-31-7-19-8Z"
        fill="#DDE9E0"
      />
      <path
        d="M99 99h145"
        stroke="#C7F36B"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M65 106h-7c-4 0-7 3-7 7v4h22"
        fill="#C7F36B"
      />
      <path
        d="M250 108h7c3 0 6 2 7 5l1 4h-20"
        fill="#E7D6A1"
      />
      <circle cx="96" cy="119" r="21" fill="#152B25" />
      <circle cx="96" cy="119" r="11" fill="#E7EBE5" />
      <circle cx="96" cy="119" r="4" fill="#7B8B81" />
      <circle cx="224" cy="119" r="21" fill="#152B25" />
      <circle cx="224" cy="119" r="11" fill="#E7EBE5" />
      <circle cx="224" cy="119" r="4" fill="#7B8B81" />
      {premium && (
        <path
          d="m160 28 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1 3-7Z"
          fill="#C7F36B"
        />
      )}
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden">
        <div className="container-shell grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-8 lg:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-xs font-semibold text-forest sm:text-sm">
              <span className="size-2 rounded-full bg-lime-500" />
              Car care, made convenient
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Your car, cleaned.
              <span className="mt-2 block text-forest">
                Without the drive.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">
              A cleaner car without another errand on your list. Book a wash
              at your residential society and get on with your day.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/societies"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-forest px-7 font-semibold text-white transition hover:bg-ink"
              >
                Choose your society
                <ArrowUpRight />
              </Link>

              <Link
                href="/services"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-border bg-white px-7 font-semibold text-ink transition hover:border-forest"
              >
                Explore services
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted">
              <span className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-lime text-xs font-bold text-ink">
                  ✓
                </span>
                At your society
              </span>
              <span className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-lime text-xs font-bold text-ink">
                  ✓
                </span>
                Convenient slots
              </span>
              <span className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-lime text-xs font-bold text-ink">
                  ✓
                </span>
                Clear pricing
              </span>
            </div>
          </div>

          {/* Hero illustration */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -right-3 top-8 size-28 rounded-full bg-lime/50 blur-2xl sm:size-40" />
            <div className="absolute -bottom-3 left-4 size-32 rounded-full bg-forest/10 blur-2xl" />

            <div className="relative overflow-hidden rounded-[32px] bg-[#E8EEE4] p-5 sm:p-9">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest/70">
                    A better kind of car care
                  </p>
                  <p className="mt-2 text-xl font-bold text-ink sm:text-2xl">
                    Your time stays yours.
                  </p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-forest">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-6"
                  >
                    <path
                      d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48 2.12 2.12m0-12.72-2.12 2.12m-8.48 8.48-2.12 2.12"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </div>

              <div className="relative mt-5 flex min-h-[220px] items-center justify-center sm:min-h-[270px]">
                <div className="absolute bottom-7 h-12 w-[85%] rounded-[50%] bg-forest/10 blur-xl" />
                <CarIllustration />
                <div className="absolute bottom-2 right-1 rounded-2xl border border-white bg-white/95 p-3 shadow-sm sm:right-3 sm:p-4">
                  <p className="text-xs text-muted">Exterior cleaning from</p>
                  <p className="mt-1 text-xl font-bold text-forest">
                    ₹349
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 p-4">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Your society. Your schedule.
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Choose an available booking slot.
                  </p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lime text-ink">
                  <ArrowUpRight />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section-spacing border-y border-border bg-white">
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest">
                Find your clean
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                The right wash for your car.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
                Choose a service that works for you. You can review the details
                and available options before booking.
              </p>
            </div>

            <Link
              href="/services"
              className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-forest hover:text-ink"
            >
              View all services
              <ArrowUpRight />
            </Link>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.number}
                className="group overflow-hidden rounded-[24px] border border-border bg-cream transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-forest/5"
              >
                <div
                  className={`relative flex h-48 items-center justify-center overflow-hidden ${service.visual}`}
                >
                  <span className="absolute left-5 top-5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-ink">
                    {service.label}
                  </span>
                  <span className="absolute right-5 top-5 text-xs font-bold text-ink/40">
                    {service.number}
                  </span>
                  <CarIllustration premium={service.number === "03"} />
                </div>

                <div className="p-5 sm:p-6">
                  <h3 className="text-xl font-bold text-ink">
                    {service.name}
                  </h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-muted">
                    {service.description}
                  </p>

                  <div className="mt-5 flex items-end justify-between gap-3 border-t border-border pt-5">
                    <div>
                      <p className="text-xs text-muted">Starting at</p>
                      <p className="mt-1 text-2xl font-bold text-forest">
                        ₹{service.price}
                      </p>
                    </div>
                    <Link
                      href="/societies"
                      aria-label={`Choose your society to book ${service.name}`}
                      className={`inline-flex size-11 items-center justify-center rounded-full text-white transition group-hover:scale-105 ${service.accent}`}
                    >
                      <ArrowUpRight />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-5 text-xs leading-5 text-muted">
            Displayed prices are base service prices. Vehicle surcharges and
            final booking amounts are shown during booking review.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="section-spacing">
        <div className="container-shell">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest">
              Simple by design
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              A few taps. One less errand.
            </h2>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {benefits.map((benefit) => (
              <div
                key={benefit.number}
                className="rounded-[24px] border border-border bg-white p-6 sm:p-7"
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-lime text-sm font-bold text-forest">
                  {benefit.number}
                </span>
                <h3 className="mt-5 text-lg font-bold text-ink">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prepaid packages */}
      <section className="pb-16 sm:pb-20">
        <div className="container-shell">
          <div className="relative overflow-hidden rounded-[28px] bg-forest p-7 text-white sm:p-10 lg:p-12">
            <div className="absolute -right-16 -top-24 size-64 rounded-full border-[36px] border-white/5 sm:size-80" />
            <div className="absolute -bottom-28 right-40 size-64 rounded-full bg-lime/10 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center">
              <div className="max-w-xl">
                <span className="inline-flex rounded-full bg-lime px-3 py-1.5 text-xs font-bold text-ink">
                  PREPAID PACKAGES
                </span>
                <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  Car care that fits your routine.
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-6 text-white/75 sm:text-base">
                  Explore prepaid packages for repeat washes. Review the
                  available credits, validity and eligible locations before
                  purchasing.
                </p>
              </div>

              <Link
                href="/packages/catalogue"
                className="inline-flex min-h-14 w-fit shrink-0 items-center justify-center gap-3 rounded-full bg-lime px-7 font-semibold text-ink transition hover:bg-white"
              >
                Explore packages
                <ArrowUpRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-white py-12 sm:py-14">
        <div className="container-shell flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Ready for a cleaner car?
            </h2>
            <p className="mt-2 text-sm text-muted">
              Start by checking whether your society is supported.
            </p>
          </div>
          <Link
            href="/societies"
            className="inline-flex min-h-12 w-fit items-center justify-center gap-3 rounded-full bg-forest px-6 font-semibold text-white transition hover:bg-ink"
          >
            Choose your society
            <ArrowUpRight />
          </Link>
        </div>
      </section>
    </>
  );
}
