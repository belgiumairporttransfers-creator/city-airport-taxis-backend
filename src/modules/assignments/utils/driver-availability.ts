import { Types } from "mongoose";
import { User } from "@/infrastructure/database/models/User";
import { AppError } from "@/shared/errors/AppError";
import driverRepository from "@/modules/drivers/repositories/driver.repository";
import assignmentRepository from "@/modules/assignments/repositories/assignment.repository";
import bookingRepository from "@/modules/bookings/repositories/booking.repository";
import type { IBooking } from "@/modules/bookings/types/booking.types";

const DEFAULT_DURATION_MINUTES = 90;

type TimeInterval = {
  start: Date;
  end: Date;
};

const parsePickupDateTime = (pickupDate: string, pickupTime: string): Date | null => {
  const date = pickupDate?.trim();
  const time = pickupTime?.trim();

  if (!date || !time) {
    return null;
  }

  const parsed = new Date(`${date}T${time}`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const buildInterval = (
  pickupDate: string,
  pickupTime: string,
  durationMinutes?: number
): TimeInterval | null => {
  const start = parsePickupDateTime(pickupDate, pickupTime);

  if (!start) {
    return null;
  }

  const duration =
    typeof durationMinutes === "number" && durationMinutes > 0
      ? durationMinutes
      : DEFAULT_DURATION_MINUTES;

  return {
    start,
    end: new Date(start.getTime() + duration * 60_000),
  };
};

const intervalsOverlap = (a: TimeInterval, b: TimeInterval) =>
  a.start < b.end && a.end > b.start;

const getBookingIntervals = (booking: IBooking): TimeInterval[] => {
  const intervals: TimeInterval[] = [];
  const outbound = buildInterval(
    booking.route.pickupDate,
    booking.route.pickupTime,
    booking.route.durationMinutes
  );

  if (outbound) {
    intervals.push(outbound);
  }

  if (
    booking.category === "return-trip" &&
    booking.route.returnDate &&
    booking.route.returnTime
  ) {
    const returnInterval = buildInterval(
      booking.route.returnDate,
      booking.route.returnTime,
      booking.route.durationMinutes
    );

    if (returnInterval) {
      intervals.push(returnInterval);
    }
  }

  return intervals;
};

export const assertDriverAssignable = async (
  driverId: string,
  booking: IBooking,
  excludeBookingId?: string
) => {
  const driver = await driverRepository.findById(driverId);

  if (!driver) {
    throw new AppError("Driver not found", 404);
  }

  if (driver.status !== "approved") {
    throw new AppError("Driver must be approved before assignment", 400);
  }

  if (!driver.userId) {
    throw new AppError("Driver account is not linked to a user", 400);
  }

  const user = await User.findById(driver.userId);

  if (!user) {
    throw new AppError("Driver user account not found", 404);
  }

  if (user.status !== "active") {
    throw new AppError("Driver user account is not active", 400);
  }

  if (user.role !== "driver") {
    throw new AppError("Linked user is not a driver account", 400);
  }

  const candidateIntervals = getBookingIntervals(booking);
  const activeAssignments = await assignmentRepository.findActiveByDriverId(driverId);

  for (const assignment of activeAssignments) {
    if (excludeBookingId && assignment.bookingId.toString() === excludeBookingId) {
      continue;
    }

    const assignedBooking = await bookingRepository.findById(assignment.bookingId.toString());

    if (!assignedBooking) {
      continue;
    }

    const existingIntervals = getBookingIntervals(assignedBooking);

    const hasOverlap = candidateIntervals.some((candidate) =>
      existingIntervals.some((existing) => intervalsOverlap(candidate, existing))
    );

    if (hasOverlap) {
      throw new AppError("Driver already has an overlapping assignment", 409);
    }
  }

  return { driver, driverUserId: driver.userId as Types.ObjectId };
};
