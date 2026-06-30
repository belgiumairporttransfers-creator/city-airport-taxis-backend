import type { IAssignment } from "@/modules/assignments/types/assignment.types";
import type { IBooking } from "@/modules/bookings/types/booking.types";
import type { IDriver } from "@/modules/drivers/types/driver.types";
import { toDriverPricing } from "@/modules/wallet/utils/driver-earnings";

type AssignmentLike = IAssignment | (Record<string, unknown> & { _id: unknown });
type BookingLike = IBooking | (Record<string, unknown> & { _id: unknown });
type DriverLike = IDriver | (Record<string, unknown> & { _id: unknown });

const toIdString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value);
  }
  return undefined;
};

const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
};

const toRecord = (value: AssignmentLike | BookingLike | DriverLike): Record<string, unknown> => {
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toObject?: () => Record<string, unknown> }).toObject === "function"
  ) {
    return (value as { toObject: () => Record<string, unknown> }).toObject();
  }

  return value as Record<string, unknown>;
};

export interface AssignmentResponse {
  id: string;
  assignmentNumber: string;
  bookingId: string;
  bookingNumber: string;
  driverId: string;
  driverUserId: string;
  assignedBy: string;
  status: string;
  assignedAt: string;
  acceptedAt?: string;
  rejectedAt?: string;
  expiredAt?: string;
  completedAt?: string;
  rejectReason?: string;
  adminNotes?: string;
  expiresAt?: string;
  chatConversationId?: string | null;
  callSessionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverAssignmentDetailResponse extends AssignmentResponse {
  customer: BookingResponse["customer"];
  route: BookingResponse["route"];
  vehicle: BookingResponse["vehicle"];
  flight: BookingResponse["flight"];
  notes?: string;
  pricing: {
    driverEarning: number;
  };
}

export interface AssignmentDetailResponse extends AssignmentResponse {
  booking: BookingSummaryResponse;
  driver: DriverSummaryResponse;
  history: AssignmentResponse[];
}

interface BookingResponse {
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  route: {
    pickupAddress: string;
    dropoffAddress: string;
    pickupDate: string;
    pickupTime: string;
    distance: number;
    durationMinutes?: number;
    estimatedArrival?: string;
    airportPickup: boolean;
  };
  vehicle: {
    categoryId: string;
    categoryName: string;
    passengers: number;
    luggage: number;
  };
  flight: {
    required: boolean;
    flightNumber?: string;
    terminal?: string;
  };
}

interface BookingSummaryResponse {
  id: string;
  bookingNumber: string;
  status: string;
  category: string;
  customer: BookingResponse["customer"];
  route: BookingResponse["route"];
  vehicle: BookingResponse["vehicle"];
  flight: BookingResponse["flight"];
  pricing: {
    total: number;
  };
  notes?: string;
}

interface DriverSummaryResponse {
  id: string;
  applicationNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  carType: string;
  licensePlate: string;
  status: string;
}

const mapBookingSummary = (booking: BookingLike): BookingSummaryResponse => {
  const record = toRecord(booking);
  const customer = record.customer as Record<string, unknown>;
  const route = record.route as Record<string, unknown>;
  const vehicle = record.vehicle as Record<string, unknown>;
  const flight = record.flight as Record<string, unknown>;
  const pricing = record.pricing as Record<string, unknown>;

  return {
    id: toIdString(record._id) ?? "",
    bookingNumber: record.bookingNumber as string,
    status: record.status as string,
    category: record.category as string,
    customer: {
      firstName: customer.firstName as string,
      lastName: customer.lastName as string,
      phone: customer.phone as string,
      email: customer.email as string,
    },
    route: {
      pickupAddress: route.pickupAddress as string,
      dropoffAddress: route.dropoffAddress as string,
      pickupDate: route.pickupDate as string,
      pickupTime: route.pickupTime as string,
      distance: Number(route.distance ?? 0),
      durationMinutes: route.durationMinutes as number | undefined,
      estimatedArrival: route.estimatedArrival as string | undefined,
      airportPickup: Boolean(route.airportPickup),
    },
    vehicle: {
      categoryId: toIdString(vehicle.categoryId) ?? "",
      categoryName: vehicle.categoryName as string,
      passengers: Number(vehicle.passengers ?? 0),
      luggage: Number(vehicle.luggage ?? 0),
    },
    flight: {
      required: Boolean(flight.required),
      flightNumber: flight.flightNumber as string | undefined,
      terminal: flight.terminal as string | undefined,
    },
    pricing: {
      total: Number(pricing.total ?? 0),
    },
    notes: record.notes as string | undefined,
  };
};

const mapDriverSummary = (driver: DriverLike): DriverSummaryResponse => {
  const record = toRecord(driver);

  return {
    id: toIdString(record._id) ?? "",
    applicationNumber: record.applicationNumber as string,
    firstName: record.firstName as string,
    lastName: record.lastName as string,
    email: record.email as string,
    phone: record.phone as string,
    carType: record.carType as string,
    licensePlate: record.licensePlate as string,
    status: record.status as string,
  };
};

export const toAssignmentResponse = (assignment: AssignmentLike): AssignmentResponse => {
  const record = toRecord(assignment);

  return {
    id: toIdString(record._id) ?? "",
    assignmentNumber: record.assignmentNumber as string,
    bookingId: toIdString(record.bookingId) ?? "",
    bookingNumber: record.bookingNumber as string,
    driverId: toIdString(record.driverId) ?? "",
    driverUserId: toIdString(record.driverUserId) ?? "",
    assignedBy: toIdString(record.assignedBy) ?? "",
    status: record.status as string,
    assignedAt: toIsoString(record.assignedAt) ?? "",
    acceptedAt: toIsoString(record.acceptedAt),
    rejectedAt: toIsoString(record.rejectedAt),
    expiredAt: toIsoString(record.expiredAt),
    completedAt: toIsoString(record.completedAt),
    rejectReason: record.rejectReason as string | undefined,
    adminNotes: record.adminNotes as string | undefined,
    expiresAt: toIsoString(record.expiresAt),
    chatConversationId: toIdString(record.chatConversationId) ?? null,
    callSessionId: toIdString(record.callSessionId) ?? null,
    createdAt: toIsoString(record.createdAt) ?? "",
    updatedAt: toIsoString(record.updatedAt) ?? "",
  };
};

export const toAssignmentDetailResponse = (
  assignment: AssignmentLike,
  booking: BookingLike,
  driver: DriverLike,
  history: AssignmentLike[]
): AssignmentDetailResponse => ({
  ...toAssignmentResponse(assignment),
  booking: mapBookingSummary(booking),
  driver: mapDriverSummary(driver),
  history: history.map((item) => toAssignmentResponse(item)),
});

export const toDriverAssignmentDetailResponse = (
  assignment: AssignmentLike,
  booking: BookingLike,
  commissionPercent: number
): DriverAssignmentDetailResponse => {
  const summary = mapBookingSummary(booking);

  return {
    ...toAssignmentResponse(assignment),
    customer: summary.customer,
    route: summary.route,
    vehicle: summary.vehicle,
    flight: summary.flight,
    notes: summary.notes,
    pricing: toDriverPricing(summary.pricing.total, commissionPercent),
  };
};
