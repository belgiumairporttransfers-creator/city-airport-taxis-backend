import { Types } from "mongoose";
import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import logger from "@/shared/utils/logger";
import emailService from "@/infrastructure/email/email.service";
import notificationService from "@/modules/notifications/services/notification.service";
import { Assignment } from "@/infrastructure/database/models/Assignment";
import bookingRepository from "@/modules/bookings/repositories/booking.repository";
import bookingDriverNotificationService from "@/modules/bookings/services/booking-driver-notification.service";
import bookingConfirmationNotificationService from "@/modules/bookings/services/booking-confirmation-notification.service";
import paymentRepository from "@/modules/payments/repositories/payment.repository";
import { appendTimelineEntry } from "@/modules/bookings/utils/booking-timeline";
import {
  assertCanCancel,
  assertCanConfirm,
  assertCanMarkNoShow,
  assertValidPatchStatusTransition,
} from "@/modules/bookings/utils/booking-status.transitions";
import type {
  GetBookingsQuery,
  IBooking,
  UpdateBookingData,
} from "@/modules/bookings/types/booking.types";

class BookingAdminService {
  private logBookingAudit(
    event: (typeof AuditEvents)[keyof typeof AuditEvents],
    bookingId: string,
    adminId: string,
    metadata?: Record<string, unknown>
  ) {
    auditService.log({
      event,
      actorId: adminId,
      actorType: "admin",
      entityType: "booking",
      entityId: bookingId,
      metadata,
    });
  }

  private async getBookingOrThrow(bookingId: string) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    return booking;
  }

  private async getPaymentForBooking(booking: IBooking) {
    if (booking.payment.paymentId) {
      return paymentRepository.findById(booking.payment.paymentId.toString());
    }

    return paymentRepository.findByBookingId(booking._id.toString());
  }

  async getBookings(query: GetBookingsQuery) {
    const result = await bookingRepository.findWithPagination(query);

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

  async getBookingDetail(bookingId: string) {
    const booking = await this.getBookingOrThrow(bookingId);
    const payment = await this.getPaymentForBooking(booking);

    return { booking, payment };
  }

  async updateBooking(bookingId: string, data: UpdateBookingData, adminId: string) {
    const booking = await this.getBookingOrThrow(bookingId);
    const updates: Record<string, unknown> = {};
    let timeline = [...booking.timeline];
    let statusChanged = false;

    if (data.pickupDate !== undefined) {
      updates["route.pickupDate"] = data.pickupDate;
    }

    if (data.pickupTime !== undefined) {
      updates["route.pickupTime"] = data.pickupTime;
    }

    if (data.notes !== undefined) {
      updates.notes = data.notes;
    }

    if (data.flightNumber !== undefined) {
      updates["flight.flightNumber"] = data.flightNumber;
    }

    if (data.passengers !== undefined) {
      updates["vehicle.passengers"] = data.passengers;
    }

    if (data.luggage !== undefined) {
      updates["vehicle.luggage"] = data.luggage;
    }

    if (data.handLuggage !== undefined) {
      updates["vehicle.handLuggage"] = data.handLuggage;
    }

    if (data.smallCheckedCase !== undefined) {
      updates["vehicle.smallCheckedCase"] = data.smallCheckedCase;
    }

    if (data.largeCheckedCase !== undefined) {
      updates["vehicle.largeCheckedCase"] = data.largeCheckedCase;
    }

    if (data.paymentStatus !== undefined) {
      updates["payment.paymentStatus"] = data.paymentStatus;

      const payment = await this.getPaymentForBooking(booking);
      if (payment) {
        await paymentRepository.updateById(payment._id.toString(), {
          status: data.paymentStatus,
        });
      }
    }

    if (data.status !== undefined && data.status !== booking.status) {
      assertValidPatchStatusTransition(booking.status, data.status);
      updates.status = data.status;
      statusChanged = true;
    }

    if (data.adminNote?.trim()) {
      const adminNotes = [
        ...(booking.adminNotes ?? []),
        {
          adminId: new Types.ObjectId(adminId),
          message: data.adminNote.trim(),
          createdAt: new Date(),
        },
      ];
      updates.adminNotes = adminNotes;
    }

    const hasFieldUpdates =
      data.pickupDate !== undefined ||
      data.pickupTime !== undefined ||
      data.notes !== undefined ||
      data.flightNumber !== undefined ||
      data.passengers !== undefined ||
      data.luggage !== undefined ||
      data.handLuggage !== undefined ||
      data.smallCheckedCase !== undefined ||
      data.largeCheckedCase !== undefined ||
      data.paymentStatus !== undefined ||
      statusChanged ||
      Boolean(data.adminNote?.trim());

    if (!hasFieldUpdates) {
      throw new AppError("No valid fields provided for update", 400);
    }

    if (statusChanged && data.status === "confirmed") {
      timeline = appendTimelineEntry(timeline, "BOOKING_CONFIRMED", { adminId });
    } else if (statusChanged && data.status === "cancelled") {
      timeline = appendTimelineEntry(timeline, "BOOKING_CANCELLED", { adminId });
    } else {
      timeline = appendTimelineEntry(timeline, "BOOKING_UPDATED", {
        adminId,
        fields: Object.keys(data).filter((key) => key !== "adminNote"),
      });
    }

    updates.timeline = timeline;

    const updated = await bookingRepository.updateById(bookingId, {
      ...this.flattenNestedUpdates(booking, updates),
    });

    if (!updated) {
      throw new AppError("Failed to update booking", 500);
    }

    this.logBookingAudit(AuditEvents.BOOKING_UPDATED, updated._id.toString(), adminId, {
      bookingNumber: updated.bookingNumber,
      changes: Object.keys(data).filter((key) => key !== "adminNote"),
    });

    if (statusChanged && data.status === "confirmed") {
      await this.sendBookingConfirmedEmail(updated);
      await this.notifyDriversOfConfirmedBooking(updated);
    }

    const payment = await this.getPaymentForBooking(updated);
    return { booking: updated, payment };
  }

  async confirmBooking(bookingId: string, adminId: string) {
    const booking = await this.getBookingOrThrow(bookingId);
    assertCanConfirm(booking.status);

    const timeline = appendTimelineEntry(booking.timeline, "BOOKING_CONFIRMED", { adminId });

    const payment = await this.getPaymentForBooking(booking);
    const paymentInfo = this.toPlainSubdocument(booking.payment);
    const nextPaymentStatus =
      payment?.status === "pending" || paymentInfo.paymentStatus === "pending"
        ? "paid"
        : paymentInfo.paymentStatus;

    const updated = await bookingRepository.updateById(bookingId, {
      status: "confirmed",
      timeline,
      payment: {
        ...paymentInfo,
        paymentStatus: nextPaymentStatus,
      },
    });

    if (!updated) {
      throw new AppError("Failed to confirm booking", 500);
    }

    if (payment && payment.status === "pending") {
      await paymentRepository.updateById(payment._id.toString(), {
        status: "paid",
        paidAt: new Date(),
      });
    }

    this.logBookingAudit(AuditEvents.BOOKING_CONFIRMED, updated._id.toString(), adminId, {
      bookingNumber: updated.bookingNumber,
    });

    await this.sendBookingConfirmedEmail(updated);
    await this.notifyDriversOfConfirmedBooking(updated);

    const refreshedPayment = await this.getPaymentForBooking(updated);
    return { booking: updated, payment: refreshedPayment };
  }

  async cancelBooking(bookingId: string, adminId: string, reason?: string) {
    const booking = await this.getBookingOrThrow(bookingId);
    assertCanCancel(booking.status);

    const timeline = appendTimelineEntry(booking.timeline, "BOOKING_CANCELLED", {
      adminId,
      ...(reason ? { reason } : {}),
    });

    const updated = await bookingRepository.updateById(bookingId, {
      status: "cancelled",
      timeline,
    });

    if (!updated) {
      throw new AppError("Failed to cancel booking", 500);
    }

    this.logBookingAudit(AuditEvents.BOOKING_CANCELLED, updated._id.toString(), adminId, {
      bookingNumber: updated.bookingNumber,
      ...(reason ? { reason } : {}),
    });

    await this.sendBookingCancelledEmail(updated);
    await this.notifyAdminsAboutCancellation(updated);

    const payment = await this.getPaymentForBooking(updated);
    return { booking: updated, payment };
  }

  async markNoShow(bookingId: string, adminId: string) {
    const booking = await this.getBookingOrThrow(bookingId);
    assertCanMarkNoShow(booking.status);

    const timeline = appendTimelineEntry(booking.timeline, "BOOKING_MARKED_NO_SHOW", { adminId });

    const updated = await bookingRepository.updateById(bookingId, {
      status: "cancelled",
      timeline,
    });

    if (!updated) {
      throw new AppError("Failed to mark booking as no-show", 500);
    }

    this.logBookingAudit(AuditEvents.BOOKING_NO_SHOW, updated._id.toString(), adminId, {
      bookingNumber: updated.bookingNumber,
    });

    const payment = await this.getPaymentForBooking(updated);
    return { booking: updated, payment };
  }

  async deleteBooking(bookingId: string, adminId: string) {
    const booking = await this.getBookingOrThrow(bookingId);

    await paymentRepository.deleteByBookingIds([bookingId]);
    await Assignment.deleteMany({ bookingId: new Types.ObjectId(bookingId) });

    const deleted = await bookingRepository.deleteById(bookingId);
    if (!deleted) {
      throw new AppError("Failed to delete booking", 500);
    }

    this.logBookingAudit(AuditEvents.BOOKING_CANCELLED, bookingId, adminId, {
      bookingNumber: booking.bookingNumber,
      deleted: true,
    });

    return deleted;
  }

  async bulkDeleteBookings(bookingIds: string[], adminId: string) {
    const uniqueIds = [...new Set(bookingIds)];

    const bookings = await Promise.all(
      uniqueIds.map((id) => bookingRepository.findById(id))
    );

    const existingIds = bookings
      .filter((booking): booking is IBooking => Boolean(booking))
      .map((booking) => booking._id.toString());

    if (existingIds.length === 0) {
      throw new AppError("No bookings found to delete", 404);
    }

    await paymentRepository.deleteByBookingIds(existingIds);
    await Assignment.deleteMany({
      bookingId: { $in: existingIds.map((id) => new Types.ObjectId(id)) },
    });

    const result = await bookingRepository.deleteManyByIds(existingIds);

    for (const booking of bookings) {
      if (!booking) continue;
      this.logBookingAudit(AuditEvents.BOOKING_CANCELLED, booking._id.toString(), adminId, {
        bookingNumber: booking.bookingNumber,
        deleted: true,
      });
    }

    return { deletedCount: result.deletedCount ?? 0 };
  }

  private toPlainSubdocument<T extends object>(value: T): T {
    if (typeof (value as { toObject?: () => T }).toObject === "function") {
      return (value as { toObject: () => T }).toObject();
    }

    return { ...value };
  }

  private flattenNestedUpdates(booking: IBooking, updates: Record<string, unknown>) {
    const flattened: Record<string, unknown> = { ...updates };
    const route = this.toPlainSubdocument(booking.route);
    const flight = this.toPlainSubdocument(booking.flight);
    const vehicle = this.toPlainSubdocument(booking.vehicle);
    const payment = this.toPlainSubdocument(booking.payment);

    if (updates["route.pickupDate"] !== undefined || updates["route.pickupTime"] !== undefined) {
      flattened.route = {
        ...route,
        ...(updates["route.pickupDate"] !== undefined
          ? { pickupDate: updates["route.pickupDate"] }
          : {}),
        ...(updates["route.pickupTime"] !== undefined
          ? { pickupTime: updates["route.pickupTime"] }
          : {}),
      };
      delete flattened["route.pickupDate"];
      delete flattened["route.pickupTime"];
    }

    if (updates["flight.flightNumber"] !== undefined) {
      flattened.flight = {
        ...flight,
        flightNumber: updates["flight.flightNumber"],
      };
      delete flattened["flight.flightNumber"];
    }

    const vehiclePatch: Record<string, unknown> = {};
    for (const key of [
      "passengers",
      "luggage",
      "handLuggage",
      "smallCheckedCase",
      "largeCheckedCase",
    ] as const) {
      const updateKey = `vehicle.${key}`;
      if (updates[updateKey] !== undefined) {
        vehiclePatch[key] = updates[updateKey];
        delete flattened[updateKey];
      }
    }

    if (Object.keys(vehiclePatch).length > 0) {
      flattened.vehicle = { ...vehicle, ...vehiclePatch };
    }

    if (updates["payment.paymentStatus"] !== undefined) {
      flattened.payment = {
        ...payment,
        paymentStatus: updates["payment.paymentStatus"],
      };
      delete flattened["payment.paymentStatus"];
    }

    return flattened;
  }

  private async sendBookingConfirmedEmail(booking: IBooking) {
    try {
      await bookingConfirmationNotificationService.notifyBookingConfirmed(booking);
    } catch (error) {
      logger.error("Failed to send booking confirmed emails", { error });
    }
  }

  private async notifyDriversOfConfirmedBooking(booking: IBooking) {
    try {
      await bookingDriverNotificationService.notifyAllDriversOfConfirmedBooking(booking);
    } catch (error) {
      logger.error("Failed to send driver new booking emails", { error });
    }
  }

  private async sendBookingCancelledEmail(booking: IBooking) {
    try {
      await emailService.sendBookingCancelledEmail(
        {
          firstName: booking.customer.firstName,
          email: booking.customer.email,
        },
        booking.bookingNumber
      );
    } catch (error) {
      logger.error("Failed to send booking cancelled email", { error });
    }
  }

  private async notifyAdminsAboutCancellation(booking: IBooking) {
    try {
      await notificationService.notifyAdmins({
        title: "Booking Cancelled",
        message: `Booking ${booking.bookingNumber} has been cancelled.`,
        type: "booking.cancelled",
        severity: "warning",
        entityType: "booking",
        entityId: booking._id.toString(),
        actionUrl: `/bookings/${booking._id.toString()}`,
      });
    } catch (error) {
      logger.error("Failed to create booking cancellation notification", { error });
    }
  }
}

export default new BookingAdminService();
