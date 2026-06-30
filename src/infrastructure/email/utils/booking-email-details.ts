import type { IBooking } from "@/modules/bookings/types/booking.types";

export type BookingEmailDetails = {
  id: string;
  bookingNumber: string;
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
    categoryName: string;
    passengers: number;
    luggage: number;
    handLuggage: number;
    smallCheckedCase: number;
    largeCheckedCase: number;
  };
  flight?: {
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
  };
  notes?: string;
  currency: string;
};

const categoryLabels: Record<string, string> = {
  "one-way": "One way",
  hourly: "Hourly",
  "return-trip": "Return trip",
};

const formatCategory = (category: string) => categoryLabels[category] ?? category;

export const toBookingEmailDetails = (
  booking: IBooking,
  currency = "EUR"
): BookingEmailDetails => ({
  id: booking._id.toString(),
  bookingNumber: booking.bookingNumber,
  category: formatCategory(booking.category),
  customer: {
    firstName: booking.customer.firstName,
    lastName: booking.customer.lastName,
    phone: booking.customer.phone,
    email: booking.customer.email,
  },
  route: {
    pickupAddress: booking.route.pickupAddress,
    dropoffAddress: booking.route.dropoffAddress,
    pickupDate: booking.route.pickupDate,
    pickupTime: booking.route.pickupTime,
    distance: booking.route.distance,
    durationMinutes: booking.route.durationMinutes,
    estimatedArrival: booking.route.estimatedArrival,
    airportPickup: booking.route.airportPickup,
  },
  vehicle: {
    categoryName: booking.vehicle.categoryName,
    passengers: booking.vehicle.passengers,
    luggage: booking.vehicle.luggage,
    handLuggage: booking.vehicle.handLuggage,
    smallCheckedCase: booking.vehicle.smallCheckedCase,
    largeCheckedCase: booking.vehicle.largeCheckedCase,
  },
  flight:
    booking.flight.required || booking.flight.flightNumber
      ? {
          flightNumber: booking.flight.flightNumber,
          terminal: booking.flight.terminal,
        }
      : undefined,
  pricing: {
    vehicleFare: booking.pricing.vehicleFare,
    airportPickupFee: booking.pricing.airportPickupFee,
    total: booking.pricing.total,
  },
  payment: {
    paymentMethod: booking.payment.paymentMethod,
    paymentStatus: booking.payment.paymentStatus,
  },
  notes: booking.notes,
  currency,
});
