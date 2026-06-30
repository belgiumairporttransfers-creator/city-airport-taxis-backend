import { Types } from "mongoose";
import { User } from "@/infrastructure/database/models/User";
import { AppError } from "@/shared/errors/AppError";
import driverRepository from "@/modules/drivers/repositories/driver.repository";
import assignmentRepository from "@/modules/assignments/repositories/assignment.repository";
import bookingRepository from "@/modules/bookings/repositories/booking.repository";
import type { IBooking } from "@/modules/bookings/types/booking.types";

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

  const activeAssignments = await assignmentRepository.findActiveByDriverId(driverId);

  for (const assignment of activeAssignments) {
    if (excludeBookingId && assignment.bookingId.toString() === excludeBookingId) {
      continue;
    }
    const assignedBooking = await bookingRepository.findById(assignment.bookingId.toString());

    if (!assignedBooking) {
      continue;
    }

    if (assignedBooking.route.pickupDate === booking.route.pickupDate) {
      throw new AppError("Driver already has an active assignment on the same pickup date", 409);
    }
  }

  // Future: shift validation
  // Future: geo validation

  return { driver, driverUserId: driver.userId as Types.ObjectId };
};
