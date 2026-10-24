import { bookings } from "@/lib/operations/bookings";

const summaryCards = [
  {
    label: "Today's bookings",
    value: "24",
    note: "Scheduled for today",
  },
  {
    label: "Completed",
    value: "12",
    note: "Services finished",
  },
  {
    label: "In progress",
    value: "5",
    note: "Currently being serviced",
  },
  {
    label: "Income received",
    value: "₹8,450",
    note: "Payments received today",
  },
];


function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Confirmed: "bg-blue-50 text-blue-700",
    Assigned: "bg-amber-50 text-amber-700",
    "In Progress": "bg-purple-50 text-purple-700",
    Completed: "bg-green-50 text-green-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

export default function OperationsOverviewPage() {
  const today = "2026-10-24";

  const todaysBookings = bookings.filter(
    (booking) => booking.date === today,
  );

  const completedCount = todaysBookings.filter(
    (booking) => booking.status === "Completed",
  ).length;

  const inProgressCount = todaysBookings.filter(
    (booking) => booking.status === "In Progress",
  ).length;

  const incomeReceived = todaysBookings
    .filter(
      (booking) =>
        booking.payment === "Paid" &&
        booking.status !== "Cancelled",
    )
    .reduce((total, booking) => total + booking.amount, 0);

  const summaryCards = [
    {
      label: "Today's bookings",
      value: todaysBookings.length.toString(),
      note: "Scheduled for today",
    },
    {
      label: "Completed",
      value: completedCount.toString(),
      note: "Services finished",
    },
    {
      label: "In progress",
      value: inProgressCount.toString(),
      note: "Currently being serviced",
    },
    {
      label: "Income received",
      value: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(incomeReceived),
      note: "Payments received today",
    },
  ];
  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-[#174C3D]">
          OPERATIONS OVERVIEW
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Good morning
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Here is your service operations snapshot.
            </p>
          </div>
          <span className="w-fit rounded-full bg-white px-4 py-2 text-sm text-gray-600 ring-1 ring-gray-200">
            Today's operations
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[#174C3D]/10 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-500">
              {card.label}
            </p>
            <p className="mt-4 text-3xl font-bold tracking-tight">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-gray-500">{card.note}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#174C3D]/10 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Today's schedule</h2>
            <p className="mt-1 text-sm text-gray-500">
              Bookings across your service locations
            </p>
          </div>
          <span className="text-sm font-medium text-[#174C3D]">
            {todaysBookings.length} sample bookings
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-[#F7F8F3] text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Booking</th>
                <th className="px-5 py-4 font-semibold">Customer / Vehicle</th>
                <th className="px-5 py-4 font-semibold">Location</th>
                <th className="px-5 py-4 font-semibold">Time</th>
                <th className="px-5 py-4 font-semibold">Service</th>
                <th className="px-5 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {todaysBookings.map((booking) => (
                <tr key={booking.id} className="transition hover:bg-gray-50">
                  <td className="px-5 py-4 font-semibold text-[#174C3D]">
                    {booking.id}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium">{booking.customer}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {booking.vehicle}
                    </p>
                  </td>
                  <td className="px-5 py-4">{booking.society}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {booking.slot}
                  </td>
                  <td className="px-5 py-4">{booking.service}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={booking.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-gray-500">
        Preview data only. These figures are illustrative and are not live
        booking or payment records.
      </p>
    </div>
  );
}
