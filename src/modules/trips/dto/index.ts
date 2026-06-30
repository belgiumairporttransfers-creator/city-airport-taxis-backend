import type { IAssignment } from "@/modules/assignments/types/assignment.types";
import { toAssignmentResponse } from "@/modules/assignments/dto";
import type { IBooking } from "@/modules/bookings/types/booking.types";
import type { IDriver } from "@/modules/drivers/types/driver.types";
import { getTripPhase } from "../utils/trip-phase";

type BookingLike = IBooking | (Record<string, unknown> & { _id: unknown });
type AssignmentLike = IAssignment | (Record<string, unknown> & { _id: unknown });
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

const toRecord = (value: BookingLike | AssignmentLike | DriverLike): Record<string, unknown> => {
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toObject?: () => Record<string, unknown> }).toObject === "function"
  ) {
    return (value as { toObject: () => Record<string, unknown> }).toObject();
  }

  return value as Record<string, unknown>;
};

export interface TripSummaryResponse {
  id: string;
  bookingNumber: string;
  status: string;
  category: string;
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
  trip: {
    startedAt?: string;
    completedAt?: string;
    driverArrivedAt?: string;
    passengerBoardedAt?: string;
    actualPickupTime?: string;
    actualDropoffTime?: string;
  };
  assignmentStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverTripDetailResponse {
  booking: {
    id: string;
    bookingNumber: string;
    status: string;
    category: string;
    notes?: string;
  };
  customer: TripSummaryResponse["customer"];
  flight: {
    required: boolean;
    flightNumber?: string;
    terminal?: string;
  };
  route: TripSummaryResponse["route"];
  vehicle: TripSummaryResponse["vehicle"] & {
    handLuggage: number;
    smallCheckedCase: number;
    largeCheckedCase: number;
  };
  notes?: string;
  assignment: ReturnType<typeof toAssignmentResponse>;
  timeline: Array<{
    event: string;
    at: string;
    metadata?: Record<string, unknown>;
  }>;
  trip: TripSummaryResponse["trip"];
}

export interface AdminTripDetailResponse {
  booking: {
    id: string;
    bookingNumber: string;
    status: string;
    category: string;
    notes?: string;
    trip: TripSummaryResponse["trip"];
  };
  customer: TripSummaryResponse["customer"];
  route: TripSummaryResponse["route"];
  vehicle: TripSummaryResponse["vehicle"];
  flight: DriverTripDetailResponse["flight"];
  assignment: ReturnType<typeof toAssignmentResponse>;
  driver: {
    id: string;
    applicationNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    carType: string;
    licensePlate: string;
    status: string;
  };
  timeline: DriverTripDetailResponse["timeline"];
}

const mapTrip = (trip: Record<string, unknown> | undefined) => ({
  startedAt: toIsoString(trip?.startedAt),
  completedAt: toIsoString(trip?.completedAt),
  driverArrivedAt: toIsoString(trip?.driverArrivedAt),
  passengerBoardedAt: toIsoString(trip?.passengerBoardedAt),
  actualPickupTime: toIsoString(trip?.actualPickupTime),
  actualDropoffTime: toIsoString(trip?.actualDropoffTime),
});

const mapTimeline = (timeline: unknown) => {
  if (!Array.isArray(timeline)) return [];

  return timeline.map((entry) => {
    const item = entry as Record<string, unknown>;
    return {
      event: item.event as string,
      at: toIsoString(item.at) ?? "",
      metadata: item.metadata as Record<string, unknown> | undefined,
    };
  });
};

export const toTripSummaryResponse = (booking: BookingLike): TripSummaryResponse => {
  const record = toRecord(booking);
  const customer = record.customer as Record<string, unknown>;
  const route = record.route as Record<string, unknown>;
  const vehicle = record.vehicle as Record<string, unknown>;
  const trip = (record.trip as Record<string, unknown>) ?? {};
  const tripPhase = getTripPhase({
    status: record.status as IBooking["status"],
    trip: trip as IBooking["trip"],
  });

  return {
    id: toIdString(record._id) ?? "",
    bookingNumber: record.bookingNumber as string,
    status: tripPhase ?? (record.status as string),
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
    trip: mapTrip(trip),
    assignmentStatus: record.assignmentStatus as string | undefined,
    createdAt: toIsoString(record.createdAt) ?? "",
    updatedAt: toIsoString(record.updatedAt) ?? "",
  };
};

export const toDriverTripDetailResponse = (
  booking: BookingLike,
  assignment: AssignmentLike
): DriverTripDetailResponse => {
  const record = toRecord(booking);
  const summary = toTripSummaryResponse(booking);
  const flight = record.flight as Record<string, unknown>;
  const vehicle = record.vehicle as Record<string, unknown>;

  return {
    booking: {
      id: summary.id,
      bookingNumber: summary.bookingNumber,
      status: summary.status,
      category: summary.category,
      notes: record.notes as string | undefined,
    },
    customer: summary.customer,
    flight: {
      required: Boolean(flight.required),
      flightNumber: flight.flightNumber as string | undefined,
      terminal: flight.terminal as string | undefined,
    },
    route: summary.route,
    vehicle: {
      ...summary.vehicle,
      handLuggage: Number(vehicle.handLuggage ?? 0),
      smallCheckedCase: Number(vehicle.smallCheckedCase ?? 0),
      largeCheckedCase: Number(vehicle.largeCheckedCase ?? 0),
    },
    notes: record.notes as string | undefined,
    assignment: toAssignmentResponse(assignment),
    timeline: mapTimeline(record.timeline),
    trip: summary.trip,
  };
};

export const toAdminTripDetailResponse = (
  booking: BookingLike,
  assignment: AssignmentLike,
  driver: DriverLike
): AdminTripDetailResponse => {
  const record = toRecord(booking);
  const driverRecord = toRecord(driver);
  const summary = toTripSummaryResponse(booking);
  const flight = record.flight as Record<string, unknown>;

  return {
    booking: {
      id: summary.id,
      bookingNumber: summary.bookingNumber,
      status: summary.status,
      category: summary.category,
      notes: record.notes as string | undefined,
      trip: summary.trip,
    },
    customer: summary.customer,
    route: summary.route,
    vehicle: summary.vehicle,
    flight: {
      required: Boolean(flight.required),
      flightNumber: flight.flightNumber as string | undefined,
      terminal: flight.terminal as string | undefined,
    },
    assignment: toAssignmentResponse(assignment),
    driver: {
      id: toIdString(driverRecord._id) ?? "",
      applicationNumber: driverRecord.applicationNumber as string,
      firstName: driverRecord.firstName as string,
      lastName: driverRecord.lastName as string,
      email: driverRecord.email as string,
      phone: driverRecord.phone as string,
      carType: driverRecord.carType as string,
      licensePlate: driverRecord.licensePlate as string,
      status: driverRecord.status as string,
    },
    timeline: mapTimeline(record.timeline),
  };
};

const IN_PROGRESS_TRIP_STATUSES = [
  "driver_accepted",
  "driver_arrived",
  "passenger_onboard",
  "trip_started",
] as const;

export const toDriverTripListResponse = (bookings: BookingLike[]) => {
  const today = new Date().toISOString().slice(0, 10);
  const summaries = bookings.map((booking) => toTripSummaryResponse(booking));

  const isInProgress = (status: string) =>
    IN_PROGRESS_TRIP_STATUSES.includes(status as (typeof IN_PROGRESS_TRIP_STATUSES)[number]);

  return {
    today: summaries.filter(
      (item) => item.route.pickupDate === today && isInProgress(item.status)
    ),
    upcoming: summaries.filter(
      (item) => item.route.pickupDate > today && isInProgress(item.status)
    ),
    active: summaries.filter((item) => isInProgress(item.status)),
    completed: summaries.filter((item) => item.status === "completed"),
  };
};
