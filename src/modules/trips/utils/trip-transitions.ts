import { AppError } from "@/shared/errors/AppError";
import { AuditEvents } from "@/shared/audit/audit.events";
import type { BookingStatus, IBooking } from "@/modules/bookings/types/booking.types";
import type { TripTransition, TripTransitionAction } from "../types/trip.types";

const TRANSITIONS: Record<TripTransitionAction, TripTransition> = {
  arrived: {
    nextStatus: "accepted",
    timelineEvent: "DRIVER_ARRIVED",
    auditEvent: AuditEvents.TRIP_DRIVER_ARRIVED,
  },
  "passenger-onboard": {
    nextStatus: "accepted",
    timelineEvent: "PASSENGER_ONBOARD",
    auditEvent: AuditEvents.TRIP_PASSENGER_ONBOARD,
  },
  start: {
    nextStatus: "accepted",
    timelineEvent: "TRIP_STARTED",
    auditEvent: AuditEvents.TRIP_STARTED,
  },
  complete: {
    nextStatus: "complete",
    timelineEvent: "TRIP_COMPLETED",
    auditEvent: AuditEvents.TRIP_COMPLETED,
  },
};

const assertAcceptedStatus = (booking: IBooking, action: TripTransitionAction) => {
  if (booking.status !== "accepted") {
    throw new AppError(
      `Cannot perform "${action}" while booking is in status "${booking.status}"`,
      409
    );
  }
};

const assertTripTimestamps = (booking: IBooking, action: TripTransitionAction) => {
  const trip = booking.trip ?? {};

  if (action === "arrived" && trip.driverArrivedAt) {
    throw new AppError(`Cannot perform "${action}" while booking is in status "${booking.status}"`, 409);
  }

  if (action === "passenger-onboard") {
    if (!trip.driverArrivedAt || trip.passengerBoardedAt) {
      throw new AppError(`Cannot perform "${action}" while booking is in status "${booking.status}"`, 409);
    }
  }

  if (action === "start") {
    if (!trip.passengerBoardedAt || trip.startedAt) {
      throw new AppError(`Cannot perform "${action}" while booking is in status "${booking.status}"`, 409);
    }
  }

  if (action === "complete" && !trip.startedAt) {
    throw new AppError(`Cannot perform "${action}" while booking is in status "${booking.status}"`, 409);
  }
};

export const getTripTransition = (action: TripTransitionAction): TripTransition =>
  TRANSITIONS[action];

export const assertTripTransition = (
  booking: IBooking,
  action: TripTransitionAction
): TripTransition & { nextStatus: BookingStatus } => {
  assertAcceptedStatus(booking, action);
  assertTripTimestamps(booking, action);

  return TRANSITIONS[action];
};
