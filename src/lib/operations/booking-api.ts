
import type { OperationsBooking } from "@/lib/operations/bookings";

export type OperationsBookingApiRecord = {
  id: string;
  booking_reference: string;
  society_id: string;
  society_name_snapshot: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  service_id: string;
  service_name_snapshot: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  vehicle_type: string;
  vehicle_details: string | null;
  base_service_price: number | string;
  vehicle_surcharge: number | string;
  total_amount: number | string;
  currency: string;
  booking_status: string;
  payment_method: string;
  payment_status: string;
  booking_source: string;
  responsible_party_type: string | null;
  responsible_party_reference: string | null;
  responsible_party_name_snapshot: string | null;
  created_at: string;
  updated_at: string;
};

type OperationsBookingsResponse = {
  bookings: OperationsBookingApiRecord[];
};

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapBooking(record: OperationsBookingApiRecord): OperationsBooking {
  const statusMap: Record<string, OperationsBooking["status"]> = {
    pending_payment: "Pending Payment",
    confirmed: "Confirmed",
    assigned: "Assigned",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
  };

  const paymentMap: Record<string, OperationsBooking["payment"]> = {
    paid: "Paid",
    pending: "Pending",
    failed: "Failed",
    refund_pending: "Refund Pending",
    refunded: "Refunded",
    not_required: "Not Required",
  };

  return {
    id: record.booking_reference,
    customer: record.customer_name,
    phone: record.customer_phone,
    vehicle: record.vehicle_details
      ? `${record.vehicle_type} · ${record.vehicle_details}`
      : record.vehicle_type,
    society: record.society_name_snapshot,
    date: record.booking_date.slice(0, 10),
    slot: `${formatTime(record.start_time)} - ${formatTime(record.end_time)}`,
    service: record.service_name_snapshot,
    amount: Number(record.total_amount),
    status: statusMap[record.booking_status] ?? "Pending Payment",
    payment: paymentMap[record.payment_status] ?? "Pending",
  };
}

export async function fetchOperationsBookings(
  filters: {
    societyId?: string;
    status?: string;
    from?: string;
    to?: string;
  } = {}
): Promise<OperationsBooking[]> {
  const params = new URLSearchParams();

  if (filters.societyId) params.set("societyId", filters.societyId);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const query = params.toString();
  const url = `/api/operations/bookings${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch operations bookings");
  }

  const data: OperationsBookingsResponse = await response.json();

  return data.bookings.map(mapBooking);
}
