
import Link from "next/link";

const packages = [
  {
    id: "starter",
    name: "Starter",
    price: 1699,
    credits: 5,
    validity: "2 months",
    description: "A simple way to get started with prepaid car care.",
  },
  {
    id: "value",
    name: "Value",
    price: 3399,
    credits: 10,
    validity: "4 months",
    description: "For regular washes throughout the year.",
    featured: true,
  },
  {
    id: "max-value",
    name: "Max Value",
    price: 6799,
    credits: 20,
    validity: "1 year",
    description: "More credits for frequent car care.",
  },
];

const washOptions = [
  {
    name: "Exterior Wash",
    description: "Exterior cleaning",
    credits: 1,
  },
  {
    name: "Exterior + Interior Wash",
    description: "Interior and exterior cleaning",
    credits: 2,
  },
  {
    name: "Premium Wash",
    description: "Premium car-care service",
    credits: 3,
  },
];

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

export default function PackageCataloguePage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Page introduction */}
      <section className="bg-forest text-white">
        <div className="container-shell py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">
            Prepaid car care
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Choose your package
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Purchase credits once and use them for eligible washes
            at your supported residential society.
          </p>
        </div>
      </section>

      {/* Package cards */}
      <section className="container-shell py-8 md:py-12">
        <div className="grid items-stretch gap-5 md:grid-cols-3">
          {packages.map((item) => (
            <article
              key={item.id}
              className={`relative flex flex-col overflow-hidden rounded-3xl border bg-white ${
                item.featured
                  ? "border-forest ring-1 ring-forest"
                  : "border-border"
              }`}
            >
              {item.featured && (
                <div className="bg-lime px-5 py-2 text-center text-xs font-bold uppercase tracking-wider text-ink">
                  A flexible choice
                </div>
              )}

              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <h2 className="text-xl font-bold text-forest">
                  {item.name}
                </h2>

                <p className="mt-2 min-h-12 text-sm leading-6 text-muted">
                  {item.description}
                </p>

                <div className="mt-5">
                  <p className="text-3xl font-bold tracking-tight text-ink">
                    {formatPrice(item.price)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    One-time package price
                  </p>
                </div>

                <div className="mt-6 rounded-2xl bg-cream p-4">
                  <p className="text-sm text-muted">Included credits</p>
                  <p className="mt-1 text-3xl font-bold text-forest">
                    {item.credits}
                  </p>

                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-sm text-muted">Validity</p>
                    <p className="mt-1 font-semibold text-ink">
                      {item.validity}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-forest">
                    Use credits for
                  </p>

                  <ul className="mt-3 space-y-3">
                    {washOptions.map((wash) => (
                      <li
                        key={wash.name}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <span className="text-ink">
                          {wash.name}
                        </span>

                        <span className="shrink-0 font-semibold text-forest">
                          {wash.credits}{" "}
                          {wash.credits === 1 ? "credit" : "credits"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-7">
                  <Link
                    href={`/packages/payment?package=${item.id}`}
                    className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                      item.featured
                        ? "bg-forest text-white hover:bg-ink"
                        : "bg-lime text-ink hover:brightness-95"
                    }`}
                  >
                    Choose {item.name}
                    <span className="ml-2" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* How credits work */}
        <section className="mt-12 rounded-3xl border border-border bg-white p-5 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest">
            Simple by design
          </p>

          <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink">
            Make every credit count
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Choose a package based on how often you wash your car
            and the type of cleaning you prefer.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {washOptions.map((wash) => (
              <div
                key={wash.name}
                className="rounded-2xl border border-border bg-cream p-4"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-lime font-bold text-forest">
                  {wash.credits}
                </div>

                <h3 className="mt-4 font-bold text-ink">
                  {wash.name}
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted">
                  {wash.description}
                </p>

                <p className="mt-4 text-sm font-semibold text-forest">
                  {wash.credits}{" "}
                  {wash.credits === 1 ? "credit" : "credits"} per wash
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Existing customer link */}
        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-ink">
              Already purchased a package?
            </h2>
            <p className="mt-1 text-sm text-muted">
              Check your remaining credits and package history.
            </p>
          </div>

          <Link
            href="/packages"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest px-5 text-sm font-semibold text-forest transition hover:bg-cream"
          >
            My Packages →
          </Link>
        </div>
      </section>
    </div>
  );
}
