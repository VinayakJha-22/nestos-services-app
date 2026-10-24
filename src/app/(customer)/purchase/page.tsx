
import Link from "next/link";
import { notFound } from "next/navigation";

const packages = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 1699,
    credits: 5,
    validity: "2 months",
  },
  value: {
    id: "value",
    name: "Value",
    price: 3399,
    credits: 10,
    validity: "4 months",
  },
  "max-value": {
    id: "max-value",
    name: "Max Value",
    price: 6799,
    credits: 20,
    validity: "1 year",
  },
};

type PurchasePageProps = {
  searchParams: Promise<{ package?: string }>;
};

export default async function PackagePurchasePage({
  searchParams,
}: PurchasePageProps) {
  const { package: packageId } = await searchParams;

  const selectedPackage =
    packageId && packageId in packages
      ? packages[packageId as keyof typeof packages]
      : null;

  if (!selectedPackage) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-cream">
      <section className="bg-forest text-white">
        <div className="container-shell py-10 md:py-14">
          <Link
            href="/packages/catalogue"
            className="text-sm text-white/70 transition hover:text-lime"
          >
            ← Back to packages
          </Link>

          <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-lime">
            Prepaid car care
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Review your package
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Check your package details before continuing to payment.
          </p>
        </div>
      </section>

      <section className="container-shell py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-3xl border border-border bg-white">
            <div className="bg-forest p-6 text-white sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime">
                Selected package
              </p>

              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                {selectedPackage.name}
              </h2>

              <p className="mt-2 text-sm text-white/75">
                Prepaid credits for eligible car washes.
              </p>

              <p className="mt-6 text-4xl font-bold">
                ₹{selectedPackage.price.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-sm text-white/70">
                One-time package price
              </p>
            </div>

            <div className="space-y-5 p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                <span className="text-sm text-muted">Wash credits</span>
                <span className="font-bold text-ink">
                  {selectedPackage.credits} credits
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                <span className="text-sm text-muted">Package validity</span>
                <span className="font-bold text-ink">
                  {selectedPackage.validity}
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-cream p-4">
                <p className="font-semibold text-ink">
                  What happens next?
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  You will proceed to payment in the next step. Credits
                  will only be added after the payment is verified by
                  the server. Buying a package does not book a wash.
                </p>
              </div>

              <Link
                href={`/packages/payment?package=${selectedPackage.id}`}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-lime px-6 py-3 text-sm font-bold text-ink transition hover:brightness-95"
              >
                Continue to payment →
              </Link>

              <Link
                href="/packages/catalogue"
                className="inline-flex min-h-10 w-full items-center justify-center text-sm font-semibold text-forest transition hover:underline"
              >
                Choose a different package
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
