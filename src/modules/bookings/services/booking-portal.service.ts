import { Types } from "mongoose";
import { Admin } from "@/infrastructure/database/models/Admin";
import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import logger from "@/shared/utils/logger";
import notificationService from "@/modules/notifications/services/notification.service";
import assignmentRepository from "@/modules/assignments/repositories/assignment.repository";
import { generateAssignmentNumber } from "@/modules/assignments/utils/assignment-number";
import { assertDriverAssignable } from "@/modules/assignments/utils/driver-availability";
import {
  syncBookingOnAccept,
  syncBookingOnAssign,
} from "@/modules/assignments/utils/booking-sync";
import bookingRepository from "@/modules/bookings/repositories/booking.repository";
import driverRepository from "@/modules/drivers/repositories/driver.repository";
import type { IAssignment } from "@/modules/assignments/types/assignment.types";
import type { GetDriverBookingsQuery, IBooking } from "@/modules/bookings/types/booking.types";

export const BOOKING_ALREADY_ACCEPTED_MESSAGE =
  "This booking has already been accepted by another driver.";

class BookingPortalService {
  private async getSystemAdminId() {
    const admin = await Admin.findOne().sort({ createdAt: 1 }).select("_id");

    if (!admin) {
      throw new AppError("System admin is not configured", 500);
    }

    return admin._id;
  }

  private async getApprovedDriverForUser(driverUserId: string) {
    const driver = await driverRepository.findByUserId(driverUserId);

    if (!driver || driver.status !== "approved") {
      throw new AppError("Approved driver profile not found", 403);
    }

    if (!driver.userId) {
      throw new AppError("Driver account is not linked to a user", 400);
    }

    return driver;
  }

  private async getBookingOrThrow(bookingId: string) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    return booking;
  }

  private getAssignedDriverId(booking: IBooking) {
    return (
      booking.currentDriverId?.toString() ?? booking.driver?.driverId?.toString()
    );
  }

  private assertDriverCanViewBooking(booking: IBooking) {
    if (["confirmed", "accepted", "complete"].includes(booking.status)) {
      return;
    }

    throw new AppError("Booking is not available", 400);
  }

  private resolveBookingAvailability(
    booking: IBooking,
    driverId: string,
    activeAssignment: IAssignment | null
  ) {
    const assignedDriverId = this.getAssignedDriverId(booking);
    const isOwnBooking = assignedDriverId === driverId;

    if (booking.status === "confirmed") {
      if (activeAssignment && activeAssignment.driverId.toString() !== driverId) {
        return {
          canAccept: false,
          unavailableMessage: BOOKING_ALREADY_ACCEPTED_MESSAGE,
        };
      }

      if (assignedDriverId && !isOwnBooking) {
        return {
          canAccept: false,
          unavailableMessage: BOOKING_ALREADY_ACCEPTED_MESSAGE,
        };
      }

      return {
        canAccept: !activeAssignment,
        unavailableMessage: undefined,
      };
    }

    if ((booking.status === "accepted" || booking.status === "complete") && !isOwnBooking) {
      return {
        canAccept: false,
        unavailableMessage: BOOKING_ALREADY_ACCEPTED_MESSAGE,
      };
    }

    return {
      canAccept: false,
      unavailableMessage: undefined,
    };
  }

  private async getActiveAssignmentForBooking(bookingId: string) {
    return assignmentRepository.findActiveByBookingId(bookingId);
  }

  async getDriverBookings(driverUserId: string, query: GetDriverBookingsQuery) {
    const driver = await this.getApprovedDriverForUser(driverUserId);
    const scopedQuery: GetDriverBookingsQuery = {
      ...query,
      scope: query.scope ?? "accepted",
    };
    const result = await bookingRepository.findDriverBookings(
      driver._id.toString(),
      scopedQuery
    );

    return {
      items: result.data,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    };
  }

  async getDriverBookingDetail(bookingId: string, driverUserId: string) {
    const driver = await this.getApprovedDriverForUser(driverUserId);
    const booking = await this.getBookingOrThrow(bookingId);

    this.assertDriverCanViewBooking(booking);

    const activeAssignment = (await this.getActiveAssignmentForBooking(bookingId)) ?? null;
    const availability = this.resolveBookingAvailability(
      booking,
      driver._id.toString(),
      activeAssignment
    );

    return {
      booking,
      canAccept: availability.canAccept,
      assignmentId: activeAssignment?._id.toString(),
      unavailableMessage: availability.unavailableMessage,
    };
  }

  async acceptOpenBooking(bookingId: string, driverUserId: string) {
    const driver = await this.getApprovedDriverForUser(driverUserId);
    const booking = await this.getBookingOrThrow(bookingId);

    if (booking.status === "accepted") {
      if (booking.driver?.driverId?.toString() === driver._id.toString()) {
        const assignment = await this.getActiveAssignmentForBooking(bookingId);
        return { booking, assignment };
      }

      throw new AppError(BOOKING_ALREADY_ACCEPTED_MESSAGE, 409);
    }

    if (booking.status !== "confirmed") {
      throw new AppError("Only confirmed bookings can be accepted", 400);
    }

    const existingAssignment = await this.getActiveAssignmentForBooking(bookingId);

    if (existingAssignment) {
      if (existingAssignment.driverId.toString() === driver._id.toString()) {
        return { booking, assignment: existingAssignment };
      }

      throw new AppError(BOOKING_ALREADY_ACCEPTED_MESSAGE, 409);
    }

    const claimed = await bookingRepository.claimConfirmedBookingForDriver(
      bookingId,
      driver._id.toString()
    );

    if (!claimed) {
      throw new AppError(BOOKING_ALREADY_ACCEPTED_MESSAGE, 409);
    }

    await assertDriverAssignable(driver._id.toString(), claimed);

    const assignedBy = await this.getSystemAdminId();
    const assignmentNumber = await generateAssignmentNumber();
    const now = new Date();

    const assignment = await assignmentRepository.create({
      assignmentNumber,
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      driverId: driver._id,
      driverUserId: new Types.ObjectId(driverUserId),
      assignedBy,
      status: "accepted",
      assignedAt: now,
      acceptedAt: now,
      expiresAt: now,
      chatConversationId: null,
      callSessionId: null,
    });

    const activeAfterCreate = await this.getActiveAssignmentForBooking(bookingId);

    if (
      activeAfterCreate &&
      activeAfterCreate._id.toString() !== assignment._id.toString()
    ) {
      await assignmentRepository.updateById(assignment._id.toString(), { status: "cancelled" });
      await bookingRepository.releaseDriverClaim(bookingId);
      throw new AppError(BOOKING_ALREADY_ACCEPTED_MESSAGE, 409);
    }

    const freshBooking = await bookingRepository.findById(bookingId);

    if (!freshBooking || freshBooking.status !== "confirmed") {
      await assignmentRepository.updateById(assignment._id.toString(), { status: "cancelled" });
      await bookingRepository.releaseDriverClaim(bookingId);
      throw new AppError(BOOKING_ALREADY_ACCEPTED_MESSAGE, 409);
    }

    await syncBookingOnAssign(freshBooking, assignment, driver._id);
    const afterAssign = await bookingRepository.findById(bookingId);

    if (!afterAssign) {
      throw new AppError("Booking not found after assignment", 500);
    }

    await syncBookingOnAccept(afterAssign, assignment);

    const updatedBooking = await bookingRepository.findById(bookingId);

    auditService.log({
      event: AuditEvents.ASSIGNMENT_ACCEPTED,
      actorId: driverUserId,
      actorType: "driver",
      entityType: "assignment",
      entityId: assignment._id.toString(),
      metadata: {
        bookingNumber: booking.bookingNumber,
        assignmentNumber,
        source: "driver_pool",
      },
    });

    try {
      await notificationService.notifyAdmins({
        title: "Driver Accepted Booking",
        message: `Driver accepted booking ${booking.bookingNumber} from the open pool.`,
        type: "assignment.accepted",
        severity: "success",
        entityType: "booking",
        entityId: booking._id.toString(),
        actionUrl: `/bookings/${booking._id.toString()}`,
      });
    } catch (error) {
      logger.error("Failed to create driver pool accept admin notification", { error });
    }

    return {
      booking: updatedBooking ?? afterAssign,
      assignment: assignment as IAssignment,
    };
  }
}

export default new BookingPortalService();
