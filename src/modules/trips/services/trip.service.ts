import auditService from "@/shared/audit/audit.service";
import { AppError } from "@/shared/errors/AppError";
import logger from "@/shared/utils/logger";
import emailService from "@/infrastructure/email/email.service";
import notificationService from "@/modules/notifications/services/notification.service";
import bookingDriverNotificationService from "@/modules/bookings/services/booking-driver-notification.service";
import walletService from "@/modules/wallet/services/wallet.service";
import assignmentRepository from "@/modules/assignments/repositories/assignment.repository";
import driverRepository from "@/modules/drivers/repositories/driver.repository";
import { appendTimelineEntry } from "@/modules/bookings/utils/booking-timeline";
import type { IBooking } from "@/modules/bookings/types/booking.types";
import tripRepository from "../repositories/trip.repository";
import { assertTripTransition } from "../utils/trip-transitions";
import type { GetAdminTripsQuery, TripTransitionAction } from "../types/trip.types";

class TripService {
  private async getDriverOrThrow(driverUserId: string) {
    const application = await driverRepository.findByUserId(driverUserId);

    if (!application) {
      throw new AppError("Driver application not found", 404);
    }

    if (application.status !== "approved") {
      throw new AppError("Driver account is not approved", 403);
    }

    return application;
  }

  private async getDriverTripBooking(bookingRef: string, driverUserId: string) {
    const application = await this.getDriverOrThrow(driverUserId);
    const booking = await tripRepository.findByBookingRef(bookingRef);

    if (!booking) {
      throw new AppError("Trip not found", 404);
    }

    if (!booking.currentDriverId || booking.currentDriverId.toString() !== application._id.toString()) {
      throw new AppError("You do not have access to this trip", 403);
    }

    if (booking.status !== "accepted" && booking.status !== "complete") {
      throw new AppError("Booking is not in trip execution", 400);
    }

    return { booking, application };
  }

  private async getAssignmentForBooking(booking: IBooking) {
    if (!booking.currentAssignmentId) {
      throw new AppError("No active assignment for this trip", 404);
    }

    const assignment = await assignmentRepository.findById(
      booking.currentAssignmentId.toString()
    );

    if (!assignment) {
      throw new AppError("Assignment not found", 404);
    }

    return assignment;
  }

  private logTripAudit(
    auditEvent: string,
    booking: IBooking,
    actorId: string,
    metadata?: Record<string, unknown>
  ) {
    auditService.log({
      event: auditEvent as Parameters<typeof auditService.log>[0]["event"],
      actorId,
      actorType: "driver",
      entityType: "booking",
      entityId: booking._id.toString(),
      metadata: {
        bookingNumber: booking.bookingNumber,
        ...metadata,
      },
    });
  }

  private async notifyAdmins(
    title: string,
    message: string,
    type: string,
    booking: IBooking,
    severity: "info" | "success" | "warning" | "error" = "info"
  ) {
    try {
      await notificationService.notifyAdmins({
        title,
        message,
        type,
        entityType: "booking",
        entityId: booking._id.toString(),
        severity,
        actionUrl: `/bookings/${booking._id.toString()}`,
      });
    } catch (error) {
      logger.error("Failed to notify admins about trip event", error);
    }
  }

  private toPlainBooking(booking: IBooking) {
    if (typeof booking.toObject === "function") {
      return booking.toObject() as IBooking;
    }

    return booking;
  }

  async getDriverTrips(driverUserId: string) {
    const application = await this.getDriverOrThrow(driverUserId);
    const bookings = await tripRepository.findDriverTrips(application._id.toString());

    return bookings;
  }

  async getDriverTripDetail(bookingRef: string, driverUserId: string) {
    const { booking } = await this.getDriverTripBooking(bookingRef, driverUserId);
    const assignment = await this.getAssignmentForBooking(booking);

    return { booking, assignment };
  }

  async getAdminTrips(query: GetAdminTripsQuery) {
    const result = await tripRepository.findWithPagination(query);

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

  async getAdminTripDetail(bookingNumber: string) {
    const booking = await tripRepository.findByBookingNumber(bookingNumber);

    if (!booking) {
      throw new AppError("Trip not found", 404);
    }

    if (booking.status !== "accepted" && booking.status !== "complete") {
      throw new AppError(
        `Booking is not in trip execution (current status: ${booking.status})`,
        404
      );
    }

    const assignment = await this.getAssignmentForBooking(booking);

    if (!booking.currentDriverId) {
      throw new AppError("No driver assigned to this trip", 404);
    }

    const driver = await driverRepository.findById(booking.currentDriverId.toString());

    if (!driver) {
      throw new AppError("Driver not found", 404);
    }

    return { booking, assignment, driver };
  }

  private async applyTripTransition(
    bookingRef: string,
    driverUserId: string,
    action: TripTransitionAction
  ) {
    const { booking } = await this.getDriverTripBooking(bookingRef, driverUserId);
    const transition = assertTripTransition(booking, action);
    const plain = this.toPlainBooking(booking);
    const now = new Date();
    const trip = { ...(plain.trip ?? {}) };

    if (action === "arrived") {
      trip.driverArrivedAt = now;
    }

    if (action === "passenger-onboard") {
      trip.passengerBoardedAt = now;
      trip.actualPickupTime = now;
    }

    if (action === "start") {
      trip.startedAt = now;
    }

    if (action === "complete") {
      trip.completedAt = now;
      trip.actualDropoffTime = now;
    }

    const updated = await tripRepository.updateById(booking._id.toString(), {
      status: transition.nextStatus,
      trip,
      timeline: appendTimelineEntry(plain.timeline ?? [], transition.timelineEvent, {
        driverUserId,
      }),
      ...(action === "complete" ? { assignmentStatus: "completed" } : {}),
    });

    if (!updated) {
      throw new AppError("Failed to update trip", 500);
    }

    this.logTripAudit(transition.auditEvent, updated, driverUserId, { action });

    if (action === "arrived") {
      await this.notifyAdmins(
        "Driver Arrived",
        `Driver arrived for booking ${updated.bookingNumber}.`,
        "trip.driver_arrived",
        updated,
        "info"
      );
    }

    if (action === "passenger-onboard") {
      await this.notifyAdmins(
        "Passenger Onboard",
        `Passenger boarded for booking ${updated.bookingNumber}.`,
        "trip.passenger_onboard",
        updated,
        "info"
      );
    }

    if (action === "complete") {
      const assignment = await this.getAssignmentForBooking(updated);
      await assignmentRepository.updateById(assignment._id.toString(), {
        status: "completed",
        completedAt: now,
      });

      await this.notifyAdmins(
        "Trip Completed",
        `Trip completed for booking ${updated.bookingNumber}.`,
        "trip.completed",
        updated,
        "success"
      );

      await emailService.sendTripCompletedEmail(updated.customer, updated.bookingNumber);
      await walletService.creditTripEarning(updated, driverUserId);
      await bookingDriverNotificationService.notifyDriverOfTripEarning(updated);
    }

    return updated;
  }

  markArrived(bookingRef: string, driverUserId: string) {
    return this.applyTripTransition(bookingRef, driverUserId, "arrived");
  }

  markPassengerOnboard(bookingRef: string, driverUserId: string) {
    return this.applyTripTransition(bookingRef, driverUserId, "passenger-onboard");
  }

  startTrip(bookingRef: string, driverUserId: string) {
    return this.applyTripTransition(bookingRef, driverUserId, "start");
  }

  completeTrip(bookingRef: string, driverUserId: string) {
    return this.applyTripTransition(bookingRef, driverUserId, "complete");
  }
}

export default new TripService();
