import type { IBooking } from "@/modules/bookings/types/booking.types";
import { toDriverPricing } from "@/modules/wallet/utils/driver-earnings";

type BookingLike = IBooking | (Record<string, unknown> & { _id: unknown });

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

const toRecord = (booking: BookingLike): Record<string, unknown> => {
  if (
    typeof booking === "object" &&
    booking !== null &&
    typeof (booking as IBooking).toObject === "function"
  ) {
    return (booking as IBooking).toObject() as Record<string, unknown>;
  }

  return booking as Record<string, unknown>;
};

export interface BookingResponse {
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
    handLuggage: number;
    smallCheckedCase: number;
    largeCheckedCase: number;
    image?: string;
  };
  flight: {
    required: boolean;
    flightNumber?: string;
    terminal?: string;
  };
  pricing: {
    vehicleFare: number;
    airportPickupFee: number;
    total: number;
  };
  payment: {
    paymentMethod: string;
    paymentStatus: string;
    paymentId?: string;
  };
  driver: {
    driverId?: string;
    assignedAt?: string;
    acceptedAt?: string;
  };
  timeline: Array<{
    event: string;
    at: string;
    metadata?: Record<string, unknown>;
  }>;
  notes?: string;
  adminNotes: Array<{
    id: string;
    adminId: string;
    message: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBookingDetailResponse extends BookingResponse {
  paymentRecord?: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    transactionId?: string;
    providerPaymentId?: string;
    cardLastDigits?: string;
    paidAt?: string;
    createdAt: string;
  };
}

export interface CreateBookingResponse {
  bookingId: string;
  checkoutUrl?: string;
  amount: number;
}

export interface DriverOpenBookingDetailResponse {
  id: string;
  bookingNumber: string;
  status: string;
  category: string;
  customer: BookingResponse["customer"];
  route: BookingResponse["route"];
  vehicle: BookingResponse["vehicle"];
  flight: BookingResponse["flight"];
  pricing: {
    driverEarning: number;
  };
  notes?: string;
  canAccept: boolean;
  assignmentId?: string;
  unavailableMessage?: string;
}

export interface DriverBookingResponse extends Omit<BookingResponse, "pricing" | "payment" | "adminNotes"> {
  pricing: {
    driverEarning: number;
  };
}

export const toDriverBookingResponse = (
  booking: BookingLike,
  commissionPercent: number
): DriverBookingResponse => {
  const dto = toBookingResponse(booking);

  return {
    id: dto.id,
    bookingNumber: dto.bookingNumber,
    status: dto.status,
    category: dto.category,
    customer: dto.customer,
    route: dto.route,
    vehicle: dto.vehicle,
    flight: dto.flight,
    pricing: toDriverPricing(dto.pricing.total, commissionPercent),
    driver: dto.driver,
    timeline: dto.timeline,
    notes: dto.notes,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
};

export const toDriverOpenBookingDetailResponse = (
  booking: BookingLike,
  canAccept: boolean,
  commissionPercent: number,
  assignmentId?: string,
  unavailableMessage?: string
): DriverOpenBookingDetailResponse => {
  const dto = toBookingResponse(booking);

  return {
    id: dto.id,
    bookingNumber: dto.bookingNumber,
    status: dto.status,
    category: dto.category,
    customer: dto.customer,
    route: dto.route,
    vehicle: dto.vehicle,
    flight: dto.flight,
    pricing: toDriverPricing(dto.pricing.total, commissionPercent),
    notes: dto.notes,
    canAccept,
    assignmentId,
    unavailableMessage,
  };
};

export const toBookingResponse = (booking: BookingLike): BookingResponse => {
  const record = toRecord(booking);
  const customer = record.customer as Record<string, unknown>;
  const route = record.route as Record<string, unknown>;
  const vehicle = record.vehicle as Record<string, unknown>;
  const flight = record.flight as Record<string, unknown>;
  const pricing = record.pricing as Record<string, unknown>;
  const payment = record.payment as Record<string, unknown>;
  const driver = (record.driver as Record<string, unknown>) ?? {};
  const timeline = Array.isArray(record.timeline) ? record.timeline : [];
  const adminNotes = Array.isArray(record.adminNotes) ? record.adminNotes : [];

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
      handLuggage: Number(vehicle.handLuggage ?? 0),
      smallCheckedCase: Number(vehicle.smallCheckedCase ?? 0),
      largeCheckedCase: Number(vehicle.largeCheckedCase ?? 0),
      image: vehicle.image as string | undefined,
    },
    flight: {
      required: Boolean(flight.required),
      flightNumber: flight.flightNumber as string | undefined,
      terminal: flight.terminal as string | undefined,
    },
    pricing: {
      vehicleFare: Number(pricing.vehicleFare ?? 0),
      airportPickupFee: Number(pricing.airportPickupFee ?? 0),
      total: Number(pricing.total ?? 0),
    },
    payment: {
      paymentMethod: payment.paymentMethod as string,
      paymentStatus: payment.paymentStatus as string,
      paymentId: toIdString(payment.paymentId),
    },
    driver: {
      driverId: toIdString(driver.driverId),
      assignedAt: toIsoString(driver.assignedAt),
      acceptedAt: toIsoString(driver.acceptedAt),
    },
    timeline: timeline.map((entry) => {
      const item = entry as Record<string, unknown>;
      return {
        event: item.event as string,
        at: toIsoString(item.at) ?? "",
        metadata: item.metadata as Record<string, unknown> | undefined,
      };
    }),
    notes: record.notes as string | undefined,
    adminNotes: adminNotes.map((note) => {
      const item = note as Record<string, unknown>;
      return {
        id: toIdString(item._id) ?? "",
        adminId: toIdString(item.adminId) ?? "",
        message: item.message as string,
        createdAt: toIsoString(item.createdAt) ?? "",
      };
    }),
    createdAt: toIsoString(record.createdAt) ?? "",
    updatedAt: toIsoString(record.updatedAt) ?? "",
  };
};

export const toAdminBookingDetailResponse = (
  booking: BookingLike,
  payment?: Record<string, unknown> | null
): AdminBookingDetailResponse => {
  const dto = toBookingResponse(booking);

  if (!payment) {
    return dto;
  }

  return {
    ...dto,
    paymentRecord: {
      id: toIdString(payment._id) ?? "",
      status: payment.status as string,
      amount: Number(payment.amount ?? 0),
      currency: (payment.currency as string) ?? "EUR",
      transactionId: payment.transactionId as string | undefined,
      providerPaymentId: payment.providerPaymentId as string | undefined,
      cardLastDigits: payment.cardLastDigits as string | undefined,
      paidAt: toIsoString(payment.paidAt),
      createdAt: toIsoString(payment.createdAt) ?? "",
    },
  };
};

export const toCreateBookingResponse = (
  booking: BookingLike,
  options?: { checkoutUrl?: string }
): CreateBookingResponse => {
  const dto = toBookingResponse(booking);

  return {
    bookingId: dto.id,
    checkoutUrl: options?.checkoutUrl,
    amount: Number(dto.pricing?.total ?? 0),
  };
};

/** Maps booking to legacy payment-success page shape. */
export const toPublicBookingStatusResponse = (
  booking: BookingLike,
  options?: { vehicleImage?: string }
) => {
  const dto = toBookingResponse(booking);
  const vehicleImage = options?.vehicleImage ?? dto.vehicle.image;

  return {
    bookingNumber: dto.bookingNumber,
    _id: dto.id,
    category: dto.category,
    status: dto.status,
    amount: dto.pricing.total,
    paymentStatus: dto.payment.paymentStatus,
    paymentMethod: dto.payment.paymentMethod,
    passengerDetails: dto.customer,
    tripDetails: {
      pickupAddress: dto.route.pickupAddress,
      deliveryAddress: dto.route.dropoffAddress,
      pickupDate: dto.route.pickupDate,
      pickupTime: dto.route.pickupTime,
      distance: dto.route.distance,
      durationMinutes: dto.route.durationMinutes,
      estTime: dto.route.estimatedArrival,
      airportPickup: dto.route.airportPickup,
      flightNumber: dto.flight.flightNumber,
      notes: dto.notes,
      stops: [],
    },
    vehicle: {
      name: dto.vehicle.categoryName,
      passengers: dto.vehicle.passengers,
      suitcases: dto.vehicle.luggage,
      image: vehicleImage,
      carType: dto.vehicle.categoryName,
    },
    pricingBreakdown: {
      vehicleFare: dto.pricing.vehicleFare,
      airportPickupFee: dto.pricing.airportPickupFee,
      total: dto.pricing.total,
      subtotal: dto.pricing.vehicleFare,
      extras: {
        airportPickup: {
          total: dto.pricing.airportPickupFee,
        },
      },
    },
  };
};
