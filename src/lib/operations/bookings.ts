
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
    date: "2026-10-25",
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
    date: "2026-10-25",
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
    date: "2026-10-25",
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
    date: "2026-10-25",
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
    date: "2026-10-25",
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
    date: "2026-10-25",
    slot: "11:30 AM",
    service: "Exterior + Interior",
    amount: 499,
    status: "Cancelled",
    payment: "Refund Pending",
  },
];


export const changeRequests: BookingChangeRequest[] = [
  {
    id: "CR-201",
    bookingId: "NS-1043",
    type: "Rescheduling",
    requestedBy: "Priya Verma",
    requestedAt: "2026-10-25T09:15:00+05:30",
    reason: "Customer is unavailable at the original appointment time.",
    status: "Pending Review",
    requestedDate: "2026-10-26",
    requestedSlot: "11:00 AM",
  },
  {
    id: "CR-202",
    bookingId: "NS-1046",
    type: "Cancellation",
    requestedBy: "Karan Singh",
    requestedAt: "2026-10-25T09:30:00+05:30",
    reason: "Customer requested cancellation due to a change in plans.",
    status: "Pending Review",
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

export type RefundStatus =
  | "Not Requested"
  | "Pending Review"
  | "Approved"
  | "Rejected"
  | "Processed";


export type ChangeRequestType = "Cancellation" | "Rescheduling";

export type ChangeRequestStatus =
  | "Pending Review"
  | "Approved"
  | "Rejected";

export type BookingChangeRequest = {
  id: string;
  bookingId: string;
  type: ChangeRequestType;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  status: ChangeRequestStatus;
  requestedDate?: string;
  requestedSlot?: string;
  decisionNote?: string;
};



export type BookingActivityType =
  | "Booking Created"
  | "Status Changed"
  | "Payment Updated"
  | "Change Request";

export type BookingActivity = {
  id: string;
  bookingId: string;
  type: BookingActivityType;
  description: string;
  timestamp: string;
  performedBy: string;
};

export const bookingActivities: BookingActivity[] = [
  {
    id: "ACT-001",
    bookingId: "NS-1042",
    type: "Booking Created",
    description: "Booking created and payment confirmed.",
    timestamp: "2026-10-25T08:00:00+05:30",
    performedBy: "System",
  },
  {
    id: "ACT-002",
    bookingId: "NS-1042",
    type: "Status Changed",
    description: "Service marked as In Progress.",
    timestamp: "2026-10-25T09:05:00+05:30",
    performedBy: "Location Manager",
  },
  {
    id: "ACT-003",
    bookingId: "NS-1043",
    type: "Booking Created",
    description: "Booking created and payment confirmed.",
    timestamp: "2026-10-25T08:30:00+05:30",
    performedBy: "System",
  },
  {
    id: "ACT-004",
    bookingId: "NS-1045",
    type: "Status Changed",
    description: "Service marked as Completed.",
    timestamp: "2026-10-25T11:15:00+05:30",
    performedBy: "Location Manager",
  },
  {
    id: "ACT-005",
    bookingId: "NS-1046",
    type: "Payment Updated",
    description: "Payment is currently pending.",
    timestamp: "2026-10-25T08:45:00+05:30",
    performedBy: "System",
  },
];

export type BookingRefund = {
  id: string;
  bookingId: string;
  amount: number;
  status: RefundStatus;
  reason: string;
  requestedAt: string;
  reviewedBy?: string;
  decisionNote?: string;
  reviewedAt?: string;
};

export const bookingRefunds: BookingRefund[] = [
  {
    id: "RF-301",
    bookingId: "NS-1047",
    amount: 499,
    status: "Pending Review",
    reason: "Customer requested cancellation.",
    requestedAt: "2026-10-25T10:00:00+05:30",
  },
];