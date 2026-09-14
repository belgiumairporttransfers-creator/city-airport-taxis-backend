import { Types } from "mongoose";
import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import logger from "@/shared/utils/logger";
import emailService from "@/infrastructure/email/email.service";
import notificationService from "@/modules/notifications/services/notification.service";
import assignmentRepository from "@/modules/assignments/repositories/assignment.repository";
import bookingRepository from "@/modules/bookings/repositories/booking.repository";
import bookingDriverNotificationService from "@/modules/bookings/services/booking-driver-notification.service";
import driverRepository from "@/modules/drivers/repositories/driver.repository";
import settingsService from "@/modules/settings/services/settings.service";
import { calculateDriverEarning } from "@/modules/wallet/utils/driver-earnings";
import tripStatusNotificationService from "@/modules/trips/services/trip-status-notification.service";
import { generateAssignmentNumber } from "@/modules/assignments/utils/assignment-number";
import { assertDriverAssignable } from "@/modules/assignments/utils/driver-availability";
import {
  syncBookingOnAccept,
  syncBookingOnAssign,
  syncBookingOnReassign,
  syncBookingOnRelease,
} from "@/modules/assignments/utils/booking-sync";
import type {
  CreateAssignmentData,
  GetAssignmentsQuery,
  GetDriverAssignmentsQuery,
  IAssignment,
  RejectAssignmentData,
} from "@/modules/assignments/types/assignment.types";

class AssignmentService {
  private logAssignmentAudit(
    event: (typeof AuditEvents)[keyof typeof AuditEvents],
    assignmentId: string,
    actorId: string,
    actorType: "admin" | "driver" | "system",
    metadata?: Record<string, unknown>
  ) {
    auditService.log({
      event,
      actorId,
      actorType,
      entityType: "assignment",
      entityId: assignmentId,
      metadata,
    });
  }

  private async getAssignmentOrThrow(id: string) {
    const assignment = await assignmentRepository.findById(id);

    if (!assignment) {
      throw new AppError("Assignment not found", 404);
    }

    return assignment;
  }

  private async getBookingForAssignment(bookingId: string) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    if (booking.status !== "confirmed") {
      throw new AppError("Only confirmed bookings can be assigned", 400);
    }

    const active = await assignmentRepository.findActiveByBookingId(bookingId);

    if (active) {
      throw new AppError("Booking already has an active assignment", 409);
    }

    return booking;
  }

  private async notifyAdmins(
    title: string,
    message: string,
    type: string,
    assignment: IAssignment,
    severity: "info" | "success" | "warning" | "error" = "info"
  ) {
    try {
      await notificationService.notifyAdmins({
        title,
        message,
        type,
        severity,
        entityType: "booking",
        entityId: assignment.bookingId.toString(),
        actionUrl: `/bookings/${assignment.bookingNumber}`,
      });
    } catch (error) {
      logger.error("Failed to create assignment admin notification", { error });
    }
  }

  private async notifyDriverNewAssignment(assignment: IAssignment, autoAccepted = false) {
    try {
      await notificationService.notifyDriver(assignment.driverUserId.toString(), {
        title: autoAccepted ? "Trip Assigned" : "New Trip Assigned",
        message: autoAccepted
          ? `You have been assigned booking ${assignment.bookingNumber}. The trip is ready for execution.`
          : `You have been assigned booking ${assignment.bookingNumber}. Please accept or reject.`,
        type: "assignment.created",
        severity: "info",
        entityType: "booking",
        entityId: assignment.bookingId.toString(),
        actionUrl: `/assignments/${assignment._id.toString()}`,
      });
    } catch (error) {
      logger.error("Failed to notify driver about assignment", { error });
    }
  }

  private async finalizeAdminAssignmentAsAccepted(
    assignment: IAssignment,
    bookingId: string
  ) {
    const acceptedAt = new Date();
    const updated = await assignmentRepository.updateById(assignment._id.toString(), {
      status: "accepted",
      acceptedAt,
    });

    if (!updated) {
      throw new AppError("Failed to auto-accept assignment", 500);
    }

    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new AppError("Linked booking not found", 404);
    }

    await syncBookingOnAccept(booking, updated);

    try {
      await notificationService.notifyAdmins({
        title: "Driver Assignment Accepted",
        message: `Assignment ${updated.assignmentNumber} for booking ${updated.bookingNumber} was auto-accepted.`,
        type: "assignment.accepted",
        severity: "success",
        entityType: "booking",
        entityId: updated.bookingId.toString(),
        actionUrl: `/bookings/${updated.bookingId.toString()}`,
      });
    } catch (error) {
      logger.error("Failed to notify admins about auto-accepted assignment", { error });
    }

    const acceptedBooking = await bookingRepository.findById(bookingId);
    if (acceptedBooking) {
      try {
        await tripStatusNotificationService.notifyTripStatus(acceptedBooking, "accepted");
      } catch (error) {
        logger.error("Failed to send trip accepted notifications", { error });
      }
    }

    return updated;
  }

  private async sendDriverAssignedEmail(assignment: IAssignment) {
    try {
      const driver = await driverRepository.findById(assignment.driverId.toString());

      if (!driver) {
        return;
      }

      const booking = await bookingRepository.findById(assignment.bookingId.toString());
      const commissionPercent = await settingsService.getDriverCommissionPercent();
      const driverEarning = booking
        ? calculateDriverEarning(
            Number(booking.pricing?.total ?? 0),
            commissionPercent,
            booking.payment?.paymentMethod
          )
        : undefined;

      await emailService.sendDriverAssignedEmail(
        { firstName: driver.firstName, email: driver.email },
        {
          assignmentId: assignment._id.toString(),
          assignmentNumber: assignment.assignmentNumber,
          bookingNumber: assignment.bookingNumber,
          ...(booking
            ? {
                category: booking.category,
                route: {
                  pickupAddress: booking.route.pickupAddress,
                  dropoffAddress: booking.route.dropoffAddress?.trim() || undefined,
                  pickupDate: booking.route.pickupDate,
                  pickupTime: booking.route.pickupTime,
                  durationMinutes: booking.route.durationMinutes,
                  airportPickup: booking.route.airportPickup,
                },
                flight:
                  booking.route.airportPickup ||
                  booking.flight?.flightNumber ||
                  booking.flight?.terminal
                    ? {
                        flightNumber: booking.flight?.flightNumber?.trim() || undefined,
                        terminal: booking.flight?.terminal?.trim() || undefined,
                      }
                    : undefined,
                vehicle: {
                  categoryName: booking.vehicle.categoryName,
                },
                ...(driverEarning !== undefined
                  ? { pricing: { driverEarning } }
                  : {}),
              }
            : {}),
        }
      );
    } catch (error) {
      logger.error("Failed to send driver assigned email", { error });
    }
  }

  private async sendAssignmentCancelledEmail(assignment: IAssignment) {
    try {
      const driver = await driverRepository.findById(assignment.driverId.toString());

      if (!driver) {
        return;
      }

      await emailService.sendAssignmentCancelledEmail(
        { firstName: driver.firstName, email: driver.email },
        assignment.bookingNumber,
        assignment.assignmentNumber
      );
    } catch (error) {
      logger.error("Failed to send assignment cancelled email", { error });
    }
  }

  async getAssignments(query: GetAssignmentsQuery) {
    const result = await assignmentRepository.findWithPagination(query);

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

  async getAssignmentDetail(id: string) {
    const assignment = await this.getAssignmentOrThrow(id);
    const [booking, driver, history] = await Promise.all([
      bookingRepository.findById(assignment.bookingId.toString()),
      driverRepository.findById(assignment.driverId.toString()),
      assignmentRepository.findByBookingId(assignment.bookingId.toString()),
    ]);

    if (!booking) {
      throw new AppError("Linked booking not found", 404);
    }

    if (!driver) {
      throw new AppError("Linked driver not found", 404);
    }

    return { assignment, booking, driver, history };
  }

  async createAssignment(data: CreateAssignmentData, adminId: string) {
    const booking = await this.getBookingForAssignment(data.bookingId);
    const { driver, driverUserId } = await assertDriverAssignable(data.driverId, booking);

    const assignmentNumber = await generateAssignmentNumber();
    const assignedAt = new Date();

    const assignment = await assignmentRepository.create({
      assignmentNumber,
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      driverId: driver._id,
      driverUserId,
      assignedBy: new Types.ObjectId(adminId),
      status: "pending",
      assignedAt,
      adminNotes: data.adminNotes?.trim() || undefined,
      chatConversationId: null,
      callSessionId: null,
    });

    await syncBookingOnAssign(booking, assignment, driver);

    await bookingDriverNotificationService.cancelScheduledDriverPoolNotify(
      booking._id.toString()
    );

    this.logAssignmentAudit(
      AuditEvents.ASSIGNMENT_CREATED,
      assignment._id.toString(),
      adminId,
      "admin",
      {
        bookingNumber: booking.bookingNumber,
        driverId: driver._id.toString(),
        assignmentNumber,
      }
    );

    const accepted = await this.finalizeAdminAssignmentAsAccepted(
      assignment,
      booking._id.toString()
    );

    this.logAssignmentAudit(
      AuditEvents.ASSIGNMENT_ACCEPTED,
      accepted._id.toString(),
      adminId,
      "admin",
      {
        bookingNumber: booking.bookingNumber,
        autoAccepted: true,
      }
    );

    await this.notifyDriverNewAssignment(accepted, true);
    await this.sendDriverAssignedEmail(accepted);

    return accepted;
  }

  async cancelAssignment(id: string, adminId: string) {
    const assignment = await this.getAssignmentOrThrow(id);

    if (!["pending", "accepted"].includes(assignment.status)) {
      throw new AppError(`Assignment cannot be cancelled from status "${assignment.status}"`, 400);
    }

    const booking = await bookingRepository.findById(assignment.bookingId.toString());

    if (!booking) {
      throw new AppError("Linked booking not found", 404);
    }

    const updated = await assignmentRepository.updateById(id, {
      status: "cancelled",
    });

    if (!updated) {
      throw new AppError("Failed to cancel assignment", 500);
    }

    await syncBookingOnRelease(booking, "ASSIGNMENT_CANCELLED", {
      assignmentId: id,
      reason: "cancelled_by_admin",
    });

    this.logAssignmentAudit(AuditEvents.ASSIGNMENT_CANCELLED, id, adminId, "admin", {
      bookingNumber: assignment.bookingNumber,
    });

    await this.sendAssignmentCancelledEmail(updated);

    return updated;
  }

  async reassignAssignment(id: string, data: CreateAssignmentData, adminId: string) {
    const existing = await this.getAssignmentOrThrow(id);

    if (!["pending", "accepted", "rejected", "expired"].includes(existing.status)) {
      throw new AppError(`Assignment cannot be reassigned from status "${existing.status}"`, 400);
    }

    if (existing.bookingId.toString() !== data.bookingId) {
      throw new AppError("Reassignment must target the same booking", 400);
    }

    const booking = await bookingRepository.findById(data.bookingId);

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    if (!["confirmed", "accepted"].includes(booking.status)) {
      throw new AppError("Booking is not eligible for reassignment", 400);
    }

    const otherActive = await assignmentRepository.findActiveByBookingId(data.bookingId);

    if (otherActive && otherActive._id.toString() !== id) {
      throw new AppError("Booking already has another active assignment", 409);
    }

    await assignmentRepository.updateById(id, { status: "cancelled" });

    const { driver, driverUserId } = await assertDriverAssignable(
      data.driverId,
      booking,
      data.bookingId
    );

    const assignmentNumber = await generateAssignmentNumber();
    const assignedAt = new Date();

    const assignment = await assignmentRepository.create({
      assignmentNumber,
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      driverId: driver._id,
      driverUserId,
      assignedBy: new Types.ObjectId(adminId),
      status: "pending",
      assignedAt,
      adminNotes: data.adminNotes?.trim() || undefined,
      chatConversationId: null,
      callSessionId: null,
    });

    await syncBookingOnReassign(booking, assignment, driver);

    this.logAssignmentAudit(AuditEvents.ASSIGNMENT_REASSIGNED, assignment._id.toString(), adminId, "admin", {
      previousAssignmentId: id,
      bookingNumber: booking.bookingNumber,
      driverId: driver._id.toString(),
    });

    const accepted = await this.finalizeAdminAssignmentAsAccepted(
      assignment,
      booking._id.toString()
    );

    this.logAssignmentAudit(
      AuditEvents.ASSIGNMENT_ACCEPTED,
      accepted._id.toString(),
      adminId,
      "admin",
      {
        bookingNumber: booking.bookingNumber,
        autoAccepted: true,
        reassigned: true,
      }
    );

    await this.notifyDriverNewAssignment(accepted, true);
    await this.sendDriverAssignedEmail(accepted);

    return accepted;
  }

  async getDriverAssignments(driverUserId: string, query: GetDriverAssignmentsQuery) {
    const result = await assignmentRepository.findDriverAssignments(driverUserId, query);

    if (query.scope === "today") {
      const today = new Date().toISOString().slice(0, 10);
      const filtered = [];

      for (const item of result.data) {
        const booking = await bookingRepository.findById(
          (item as { bookingId: { toString(): string } }).bookingId.toString()
        );

        if (booking?.route.pickupDate === today) {
          filtered.push(item);
        }
      }

      return {
        items: filtered,
        page: result.page,
        limit: result.limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / result.limit) || 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    }

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

  async getDriverAssignmentDetail(id: string, driverUserId: string) {
    const assignment = await this.getAssignmentOrThrow(id);

    if (assignment.driverUserId.toString() !== driverUserId) {
      throw new AppError("You do not have access to this assignment", 403);
    }

    const booking = await bookingRepository.findById(assignment.bookingId.toString());

    if (!booking) {
      throw new AppError("Linked booking not found", 404);
    }

    return { assignment, booking };
  }

  async acceptAssignment(id: string, driverUserId: string) {
    const assignment = await this.getAssignmentOrThrow(id);

    if (assignment.driverUserId.toString() !== driverUserId) {
      throw new AppError("You do not have access to this assignment", 403);
    }

    if (assignment.status !== "pending") {
      throw new AppError(`Assignment cannot be accepted from status "${assignment.status}"`, 400);
    }

    const acceptedAt = new Date();
    const updated = await assignmentRepository.updateById(id, {
      status: "accepted",
      acceptedAt,
    });

    if (!updated) {
      throw new AppError("Failed to accept assignment", 500);
    }

    const booking = await bookingRepository.findById(assignment.bookingId.toString());

    if (!booking) {
      throw new AppError("Linked booking not found", 404);
    }

    await syncBookingOnAccept(booking, updated);

    this.logAssignmentAudit(AuditEvents.ASSIGNMENT_ACCEPTED, id, driverUserId, "driver", {
      bookingNumber: assignment.bookingNumber,
    });

    await notificationService.notifyAdmins({
      title: "Driver Accepted Assignment",
      message: `Driver accepted assignment ${assignment.assignmentNumber} for booking ${assignment.bookingNumber}.`,
      type: "assignment.accepted",
      severity: "success",
      entityType: "booking",
      entityId: assignment.bookingId.toString(),
      actionUrl: `/bookings/${assignment.bookingId.toString()}`,
    });

    const acceptedBooking = await bookingRepository.findById(assignment.bookingId.toString());
    if (acceptedBooking) {
      await tripStatusNotificationService.notifyTripStatus(acceptedBooking, "accepted");
    }

    return updated;
  }

  async rejectAssignment(id: string, driverUserId: string, data: RejectAssignmentData) {
    const assignment = await this.getAssignmentOrThrow(id);

    if (assignment.driverUserId.toString() !== driverUserId) {
      throw new AppError("You do not have access to this assignment", 403);
    }

    if (assignment.status !== "pending") {
      throw new AppError(`Assignment cannot be rejected from status "${assignment.status}"`, 400);
    }

    const rejectedAt = new Date();
    const updated = await assignmentRepository.updateById(id, {
      status: "rejected",
      rejectedAt,
      rejectReason: data.reason.trim(),
    });

    if (!updated) {
      throw new AppError("Failed to reject assignment", 500);
    }

    const booking = await bookingRepository.findById(assignment.bookingId.toString());

    if (!booking) {
      throw new AppError("Linked booking not found", 404);
    }

    await syncBookingOnRelease(booking, "DRIVER_REJECTED", {
      assignmentId: id,
      reason: data.reason.trim(),
    });

    this.logAssignmentAudit(AuditEvents.ASSIGNMENT_REJECTED, id, driverUserId, "driver", {
      bookingNumber: assignment.bookingNumber,
      reason: data.reason.trim(),
    });

    await this.notifyAdmins(
      "Driver Rejected Assignment",
      `Driver rejected assignment ${assignment.assignmentNumber}: ${data.reason.trim()}`,
      "assignment.rejected",
      assignment,
      "warning"
    );

    return updated;
  }

  async expirePendingAssignments() {
    const expiredAssignments = await assignmentRepository.findExpiredPending(new Date());
    let expiredCount = 0;

    for (const assignment of expiredAssignments) {
      const updated = await assignmentRepository.updateById(assignment._id.toString(), {
        status: "expired",
        expiredAt: new Date(),
      });

      if (!updated) {
        continue;
      }

      const booking = await bookingRepository.findById(assignment.bookingId.toString());

      if (booking) {
        await syncBookingOnRelease(booking, "ASSIGNMENT_EXPIRED", {
          assignmentId: assignment._id.toString(),
        });
      }

      this.logAssignmentAudit(
        AuditEvents.ASSIGNMENT_EXPIRED,
        assignment._id.toString(),
        "system",
        "system",
        { bookingNumber: assignment.bookingNumber }
      );

      await this.notifyAdmins(
        "Assignment Expired",
        `Assignment ${assignment.assignmentNumber} expired without driver response.`,
        "assignment.expired",
        assignment,
        "warning"
      );

      expiredCount += 1;
    }

    return expiredCount;
  }
}

export default new AssignmentService();
