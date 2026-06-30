import type { IBooking } from "@/modules/bookings/types/booking.types";

export const TRIP_PHASES = [
  "driver_accepted",
  "driver_arrived",
  "passenger_onboard",
  "trip_started",
  "completed",
] as const;

export type TripPhase = (typeof TRIP_PHASES)[number];

type TripLike = Pick<IBooking, "status" | "trip">;

export const getTripPhase = (booking: TripLike): TripPhase | null => {
  if (booking.status === "complete") {
    return "completed";
  }

  if (booking.status !== "accepted") {
    return null;
  }

  const trip = booking.trip ?? {};

  if (trip.startedAt) {
    return "trip_started";
  }

  if (trip.passengerBoardedAt) {
    return "passenger_onboard";
  }

  if (trip.driverArrivedAt) {
    return "driver_arrived";
  }

  return "driver_accepted";
};

export const buildTripPhaseFilter = (phase: TripPhase): Record<string, unknown> => {
  switch (phase) {
    case "completed":
      return { status: "complete" };
    case "driver_accepted":
      return {
        status: "accepted",
        "trip.driverArrivedAt": { $exists: false },
      };
    case "driver_arrived":
      return {
        status: "accepted",
        "trip.driverArrivedAt": { $exists: true },
        "trip.passengerBoardedAt": { $exists: false },
      };
    case "passenger_onboard":
      return {
        status: "accepted",
        "trip.passengerBoardedAt": { $exists: true },
        "trip.startedAt": { $exists: false },
      };
    case "trip_started":
      return {
        status: "accepted",
        "trip.startedAt": { $exists: true },
      };
    default:
      return { status: "accepted" };
  }
};
