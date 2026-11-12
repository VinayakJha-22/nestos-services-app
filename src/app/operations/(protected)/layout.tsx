
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOperationsUser } from "@/lib/operations/auth";
import LogoutButton from "./logout-button";

export const instant = false;

const navigation = [
  { label: "Bookings", href: "/operations/bookings" },
  { label: "Payments", href: "/operations/payments" },
  { label: "Change Requests", href: "/operations/change-requests" },
  { label: "Reports", href: "/operations/reports" },
];

export default async function OperationsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const user = await getOperationsUser();

  if (!user) {
    redirect("/operations/login");
  }
  return (
    <div className="min-h-screen bg-[#F7F8F3] text-[#152B25]">
      <header className="border-b border-[#174C3D]/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/operations" className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#174C3D] text-lg font-bold text-white">
              N
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">NestOS</p>
              <p className="text-xs text-gray-500">Services · Operations</p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            {[
              ...navigation,
              ...(user.role === "central_admin"
                ? [{ label: "Team & Access", href: "/operations/team" }]
                : []),
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#174C3D] transition hover:bg-[#174C3D]/10"
              >
                {item.label}
              </Link>
            ))}

            <LogoutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-[#174C3D]/10 bg-white px-5 py-4 text-center text-xs text-gray-500">
        NestOS Services · Operations Dashboard
      </footer>
    </div>
  );
}
