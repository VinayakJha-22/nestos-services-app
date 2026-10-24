
export type BookingStatus =
  | "Confirmed"
  | "Assigned"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export type PaymentStatus =
  | "Paid"
  | "Pending"
  | "Refund Pending";

export type OperationsBooking = {
  id: string;
  customer: string;
  phone: string;
  vehicle: string;
  society: string;
  date: string;
  slot: string;
  service: string;
  amount: number;
  status: BookingStatus;
  payment: PaymentStatus;
};

export const bookings: OperationsBooking[] = [
  {
    id: "NS-1042",
    customer: "Aarav Sharma",
    phone: "98765 43210",
    vehicle: "Hyundai Creta",
    society: "Green Residency",
    date: "2026-10-24",
    slot: "09:00 AM",
    service: "Premium Cleaning",
    amount: 799,
    status: "In Progress",
    payment: "Paid",
  },
  {
    id: "NS-1043",
    customer: "Priya Verma",
    phone: "98765 12345",
    vehicle: "Honda City",
    society: "Green Residency",
    date: "2026-10-24",
    slot: "09:30 AM",
    service: "Exterior + Interior",
    amount: 499,
    status: "Confirmed",
    payment: "Paid",
  },
  {
    id: "NS-1044",
    customer: "Rohan Mehta",
    phone: "98111 22334",
    vehicle: "Maruti Baleno",
    society: "Palm Heights",
    date: "2026-10-24",
    slot: "10:00 AM",
    service: "Exterior Cleaning",
    amount: 349,
    status: "Assigned",
    payment: "Paid",
  },
  {
    id: "NS-1045",
    customer: "Neha Gupta",
    phone: "98990 11223",
    vehicle: "Tata Nexon",
    society: "Palm Heights",
    date: "2026-10-24",
    slot: "10:30 AM",
    service: "Premium Cleaning",
    amount: 799,
    status: "Completed",
    payment: "Paid",
  },
  {
    id: "NS-1046",
    customer: "Karan Singh",
    phone: "98100 55667",
    vehicle: "Maruti Swift",
    society: "Green Residency",
    date: "2026-10-24",
    slot: "11:00 AM",
    service: "Exterior Cleaning",
    amount: 349,
    status: "Confirmed",
    payment: "Pending",
  },
  {
    id: "NS-1047",
    customer: "Ananya Rao",
    phone: "98700 99887",
    vehicle: "Kia Seltos",
    society: "Palm Heights",
    date: "2026-10-24",
    slot: "11:30 AM",
    service: "Exterior + Interior",
    amount: 499,
    status: "Cancelled",
    payment: "Refund Pending",
  },
];

export const societies = [
  "Green Residency",
  "Palm Heights",
];

export const serviceStatuses: BookingStatus[] = [
  "Confirmed",
  "Assigned",
  "In Progress",
  "Completed",
  "Cancelled",
];

export const paymentStatuses: PaymentStatus[] = [
  "Paid",
  "Pending",
  "Refund Pending",
];
