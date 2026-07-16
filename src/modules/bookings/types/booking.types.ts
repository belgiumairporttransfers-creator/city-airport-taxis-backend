import type { Document, Types } from "mongoose";
import type { BookingTripCategory } from "@/modules/vehicle-pricing/types/vehicle-pricing.types";

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "accepted",
  "complete",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type BookingLifecycleStatus = BookingStatus;

export const BOOKING_PAYMENT_METHOD = "mollie" as const;
export const BOOKING_PAYMENT_METHODS = [BOOKING_PAYMENT_METHOD] as const;
export type BookingPaymentMethod = typeof BOOKING_PAYMENT_METHOD;

export const BOOKING_TIMELINE_EVENTS = [
  "BOOKING_CREATED",
  "PAYMENT_RECEIVED",
  "BOOKING_CONFIRMED",
  "BOOKING_UPDATED",
  "BOOKING_CANCELLED",
  "BOOKING_MARKED_NO_SHOW",
  "DRIVER_ASSIGNED",
  "DRIVER_ACCEPTED",
  "DRIVER_REJECTED",
  "ASSIGNMENT_EXPIRED",
  "DRIVER_REASSIGNED",
  "DRIVER_ARRIVED",
  "PASSENGER_ONBOARD",
  "TRIP_STARTED",
  "TRIP_COMPLETED",
] as const;
export type BookingTimelineEvent = (typeof BOOKING_TIMELINE_EVENTS)[number];

export interface BookingCustomer {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export interface BookingRoute {
  pickupAddress: string;
  dropoffAddress: string;
  pickupDate: string;
  pickupTime: string;
  distance: number;
  durationMinutes?: number;
  estimatedArrival?: string;
  airportPickup: boolean;
}

export interface BookingVehicle {
  categoryId: Types.ObjectId;
  categoryName: string;
  passengers: number;
  luggage: number;
  handLuggage: number;
  smallCheckedCase: number;
  largeCheckedCase: number;
  image?: string;
}

export interface BookingFlight {
  required: boolean;
  flightNumber?: string;
  terminal?: string;
}

export interface BookingPricing {
  vehicleFare: number;
  airportPickupFee: number;
  total: number;
}

export interface BookingPaymentInfo {
  paymentMethod: BookingPaymentMethod;
  paymentStatus: string;
  paymentId?: Types.ObjectId;
}

export interface BookingDriver {
  driverId?: Types.ObjectId;
  assignedAt?: Date;
  acceptedAt?: Date;
}

export interface BookingTrip {
  startedAt?: Date;
  completedAt?: Date;
  driverArrivedAt?: Date;
  passengerBoardedAt?: Date;
  actualPickupTime?: Date;
  actualDropoffTime?: Date;
}

export interface BookingTimelineEntry {
  event: BookingTimelineEvent | string;
  at: Date;
  metadata?: Record<string, unknown>;
}

export interface BookingAdminNote {
  adminId: Types.ObjectId;
  message: string;
  createdAt: Date;
}

export interface IBooking extends Document {
  bookingNumber: string;
  status: BookingStatus;
  category: BookingTripCategory;
  customer: BookingCustomer;
  route: BookingRoute;
  vehicle: BookingVehicle;
  flight: BookingFlight;
  pricing: BookingPricing;
  payment: BookingPaymentInfo;
  driver: BookingDriver;
  trip: BookingTrip;
  timeline: BookingTimelineEntry[];
  notes?: string;
  adminNotes: BookingAdminNote[];
  currentAssignmentId?: Types.ObjectId;
  currentDriverId?: Types.ObjectId;
  assignmentStatus?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingPayload {
  category: BookingTripCategory;
  step1: {
    pickupAddress: string;
    deliveryAddress?: string;
    pickupDate: string;
    pickupTime: string;
    passengers: number;
    returnDate?: string;
    returnTime?: string;
  };
  routeData?: {
    distance?: number;
    durationMinutes?: number;
    estTime?: string;
    isAirportSelected?: boolean;
    duration?: number | { duration: number };
  } | null;
  step2: {
    categoryId: string;
    category: {
      name: string;
      image?: string;
      vehicles?: string[];
    };
    priceBreakdown: {
      totalPrice: number;
    };
    passengers: number;
    luggage: number;
  };
  step3: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    isAirportPickup: boolean;
    flightNumber?: string;
    notes?: string;
    handLuggage: number;
    smallCheckedCase: number;
    largeCheckedCase: number;
  };
  pricing: {
    total: number;
    breakdown?: {
      totalVehicleFare?: number;
      airportPickupPrice?: number;
    };
  };
}

export interface GetBookingsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: BookingStatus;
  paymentStatus?: string;
  paymentMethod?: BookingPaymentMethod;
  bookingDate?: string;
  pickupDate?: string;
  vehicleCategory?: string;
  sort?: string;
}

export const DRIVER_BOOKING_SCOPES = ["accepted", "completed", "all"] as const;
export type DriverBookingScope = (typeof DRIVER_BOOKING_SCOPES)[number];

export interface GetDriverBookingsQuery {
  page?: number;
  limit?: number;
  search?: string;
  scope?: DriverBookingScope;
  sort?: string;
}

export interface UpdateBookingData {
  pickupDate?: string;
  pickupTime?: string;
  notes?: string;
  flightNumber?: string;
  passengers?: number;
  luggage?: number;
  handLuggage?: number;
  smallCheckedCase?: number;
  largeCheckedCase?: number;
  paymentStatus?: string;
  status?: BookingLifecycleStatus;
  adminNote?: string;
}

export interface CreateBookingResult {
  booking: IBooking;
  checkoutUrl?: string;
}

export type CreateBookingData = {
  status: BookingStatus;
  category: BookingTripCategory;
  customer: BookingCustomer;
  route: BookingRoute;
  vehicle: BookingVehicle;
  flight: BookingFlight;
  pricing: BookingPricing;
  payment: BookingPaymentInfo;
  driver: BookingDriver;
  timeline: BookingTimelineEntry[];
  notes?: string;
};
