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
  assertCanMarkComplete,
  assertCanMarkNoShow,
} from "@/modules/bookings/utils/booking-status.transitions";
import { toBookingEmailDetails } from "@/infrastructure/email/utils/booking-email-details";
import walletService from "@/modules/wallet/services/wallet.service";
import tripStatusNotificationService from "@/modules/trips/services/trip-status-notification.service";
import { getTripPhase } from "@/modules/trips/utils/trip-phase";
import driverRepository from "@/modules/drivers/repositories/driver.repository";
import type {
  GetBookingsQuery,
  IBooking,
  UpdateBookingData,
} from "@/modules/bookings/types/booking.types";

const CUSTOMER_VISIBLE_UPDATE_KEYS: Array<keyof UpdateBookingData> = [
  "pickupDate",
  "pickupTime",
  "returnDate",
  "returnTime",
  "pickupAddress",
  "dropoffAddress",
  "notes",
  "flightNumber",
  "terminal",
  "passengers",
  "luggage",
  "handLuggage",
  "smallCheckedCase",
  "largeCheckedCase",
  "customerFirstName",
  "customerLastName",
  "customerPhone",
  "customerEmail",
];

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

    if (data.returnDate !== undefined) {
      updates["route.returnDate"] = data.returnDate || null;
    }

    if (data.returnTime !== undefined) {
      updates["route.returnTime"] = data.returnTime || null;
    }

    if (data.pickupAddress !== undefined) {
      updates["route.pickupAddress"] = data.pickupAddress.trim();
    }

    if (data.dropoffAddress !== undefined) {
      updates["route.dropoffAddress"] = data.dropoffAddress.trim();
    }

    if (data.notes !== undefined) {
      updates.notes = data.notes;
    }

    if (data.flightNumber !== undefined) {
      updates["flight.flightNumber"] = data.flightNumber || undefined;
    }

    if (data.terminal !== undefined) {
      updates["flight.terminal"] = data.terminal || undefined;
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

    if (data.customerFirstName !== undefined) {
      updates["customer.firstName"] = data.customerFirstName.trim();
    }

    if (data.customerLastName !== undefined) {
      updates["customer.lastName"] = data.customerLastName.trim();
    }

    if (data.customerPhone !== undefined) {
      updates["customer.phone"] = data.customerPhone.trim();
    }

    if (data.customerEmail !== undefined) {
      updates["customer.email"] = data.customerEmail.trim().toLowerCase();
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

    let markedCompleted = false;
    let markedPayOnboardPaid = false;
    let newStatusAction: string | null = null;

    if (data.status !== undefined) {
      const targetStatus = data.status;
      const currentTripPhase = getTripPhase({
        status: booking.status,
        trip: booking.trip,
      });

      if (targetStatus === "confirmed") {
        if (booking.status !== "confirmed" || currentTripPhase) {
          updates.status = "confirmed";
          updates.trip = {};
          statusChanged = true;
          newStatusAction = "confirmed";
          timeline = appendTimelineEntry(timeline, "BOOKING_CONFIRMED", { adminId });
        }
      } else if (targetStatus === "driver_arrived" || targetStatus === "arrived") {
        if (currentTripPhase !== "driver_arrived") {
          const now = new Date();
          const currentTrip = this.toPlainSubdocument(booking.trip ?? {});
          updates.status = "accepted";
          updates.trip = {
            ...currentTrip,
            driverArrivedAt: currentTrip.driverArrivedAt ?? now,
            passengerBoardedAt: undefined,
            startedAt: undefined,
            completedAt: undefined,
          };
          statusChanged = true;
          newStatusAction = "arrived";
          timeline = appendTimelineEntry(timeline, "DRIVER_ARRIVED", { adminId });
        }
      } else if (targetStatus === "passenger_onboard" || targetStatus === "pax_onboard") {
        if (currentTripPhase !== "passenger_onboard") {
          const now = new Date();
          const currentTrip = this.toPlainSubdocument(booking.trip ?? {});
          updates.status = "accepted";
          updates.trip = {
            ...currentTrip,
            driverArrivedAt: currentTrip.driverArrivedAt ?? now,
            passengerBoardedAt: currentTrip.passengerBoardedAt ?? now,
            startedAt: undefined,
            completedAt: undefined,
          };
          statusChanged = true;
          newStatusAction = "passenger_onboard";
          timeline = appendTimelineEntry(timeline, "PASSENGER_ONBOARD", { adminId });
        }
      } else if (targetStatus === "complete" || targetStatus === "completed") {
        if (booking.status !== "complete") {
          const now = new Date();
          const currentTrip = this.toPlainSubdocument(booking.trip ?? {});
          const plainPayment = this.toPlainSubdocument(booking.payment);
          updates.status = "complete";
          updates.assignmentStatus = "completed";
          updates.trip = {
            ...currentTrip,
            completedAt: currentTrip.completedAt ?? now,
            actualDropoffTime: currentTrip.actualDropoffTime ?? now,
          };
          if (
            plainPayment.paymentMethod === "pay_onboard" &&
            plainPayment.paymentStatus === "pending"
          ) {
            updates["payment.paymentStatus"] = "paid";
            markedPayOnboardPaid = true;
          }
          statusChanged = true;
          markedCompleted = true;
          newStatusAction = "complete";
          timeline = appendTimelineEntry(timeline, "TRIP_COMPLETED", { adminId });
        }
      } else if (targetStatus === "cancelled") {
        if (booking.status !== "cancelled") {
          updates.status = "cancelled";
          updates.assignmentStatus = "cancelled";
          statusChanged = true;
          newStatusAction = "cancelled";
          timeline = appendTimelineEntry(timeline, "BOOKING_CANCELLED", { adminId });
        }
      } else if (targetStatus === "pending") {
        if (booking.status !== "pending") {
          updates.status = "pending";
          updates.trip = {};
          statusChanged = true;
          newStatusAction = "pending";
        }
      }
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
      data.returnDate !== undefined ||
      data.returnTime !== undefined ||
      data.pickupAddress !== undefined ||
      data.dropoffAddress !== undefined ||
      data.notes !== undefined ||
      data.flightNumber !== undefined ||
      data.terminal !== undefined ||
      data.passengers !== undefined ||
      data.luggage !== undefined ||
      data.handLuggage !== undefined ||
      data.smallCheckedCase !== undefined ||
      data.largeCheckedCase !== undefined ||
      data.customerFirstName !== undefined ||
      data.customerLastName !== undefined ||
      data.customerPhone !== undefined ||
      data.customerEmail !== undefined ||
      data.paymentStatus !== undefined ||
      statusChanged ||
      Boolean(data.adminNote?.trim());

    if (!hasFieldUpdates) {
      throw new AppError("No valid fields provided for update", 400);
    }

    const customerVisibleChanges = CUSTOMER_VISIBLE_UPDATE_KEYS.filter(
      (key) => data[key] !== undefined
    );

    if (!newStatusAction) {
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

    if (markedCompleted) {
      const now = new Date();
      if (booking.currentAssignmentId) {
        await Assignment.findByIdAndUpdate(booking.currentAssignmentId, {
          status: "completed",
          completedAt: now,
        });
      }

      if (markedPayOnboardPaid) {
        const payment = await this.getPaymentForBooking(booking);
        if (payment && payment.status === "pending") {
          await paymentRepository.updateById(payment._id.toString(), {
            status: "paid",
            paidAt: now,
          });
        }
      }

      if (updated.currentDriverId) {
        try {
          const driver = await driverRepository.findById(updated.currentDriverId.toString());
          if (driver?.userId) {
            await walletService.creditTripEarning(updated, driver.userId.toString());
            await bookingDriverNotificationService.notifyDriverOfTripEarning(updated);
          }
        } catch (err) {
          logger.error("Failed to credit driver wallet on updated complete booking", {
            error: err,
            bookingId,
          });
        }
      }
    }

    if (statusChanged && newStatusAction === "confirmed") {
      await this.sendBookingConfirmedEmail(updated);
      await this.notifyDriversOfConfirmedBooking(updated);
    } else if (statusChanged && newStatusAction === "cancelled") {
      await bookingDriverNotificationService.cancelScheduledDriverPoolNotify(bookingId);
    } else if (customerVisibleChanges.length > 0) {
      await this.sendBookingUpdatedEmail(updated);
      await this.notifyAssignedDriverOfBookingUpdate(updated);
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

    await bookingDriverNotificationService.cancelScheduledDriverPoolNotify(bookingId);
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

  async completeBooking(bookingId: string, adminId: string) {
    const booking = await this.getBookingOrThrow(bookingId);
    assertCanMarkComplete(booking.status);

    const now = new Date();
    const plainPayment = this.toPlainSubdocument(booking.payment);
    const plainTrip = this.toPlainSubdocument(booking.trip ?? {});
    let nextPaymentStatus = plainPayment.paymentStatus;
    let markedPayOnboardPaid = false;

    if (
      plainPayment.paymentMethod === "pay_onboard" &&
      plainPayment.paymentStatus === "pending"
    ) {
      nextPaymentStatus = "paid";
      markedPayOnboardPaid = true;
    }

    const timeline = appendTimelineEntry(booking.timeline, "TRIP_COMPLETED", { adminId });

    const updated = await bookingRepository.updateById(bookingId, {
      status: "complete",
      assignmentStatus: "completed",
      trip: {
        ...plainTrip,
        completedAt: now,
        actualDropoffTime: now,
      },
      payment: {
        ...plainPayment,
        paymentStatus: nextPaymentStatus,
      },
      timeline,
    });

    if (!updated) {
      throw new AppError("Failed to complete booking", 500);
    }

    if (booking.currentAssignmentId) {
      await Assignment.findByIdAndUpdate(booking.currentAssignmentId, {
        status: "completed",
        completedAt: now,
      });
    }

    if (markedPayOnboardPaid) {
      const payment = await this.getPaymentForBooking(booking);
      if (payment && payment.status === "pending") {
        await paymentRepository.updateById(payment._id.toString(), {
          status: "paid",
          paidAt: now,
        });
      }
    }

    this.logBookingAudit(AuditEvents.TRIP_COMPLETED, updated._id.toString(), adminId, {
      bookingNumber: updated.bookingNumber,
    });

    if (updated.currentDriverId) {
      try {
        const driver = await driverRepository.findById(updated.currentDriverId.toString());
        if (driver?.userId) {
          await walletService.creditTripEarning(updated, driver.userId.toString());
          await bookingDriverNotificationService.notifyDriverOfTripEarning(updated);
        }
      } catch (error) {
        logger.error("Failed to credit driver wallet on admin complete", { error });
      }
    }

    try {
      await tripStatusNotificationService.notifyTripStatus(updated, "completed");
    } catch (error) {
      logger.error("Failed to send trip completed notifications", { error });
    }

    const refreshedPayment = await this.getPaymentForBooking(updated);
    return { booking: updated, payment: refreshedPayment };
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

    const existingIds = bookings.flatMap((booking) =>
      booking ? [booking._id.toString()] : []
    );

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

  async bulkCompleteBookings(bookingIds: string[], adminId: string) {
    const uniqueIds = [...new Set(bookingIds)];
    let completedCount = 0;

    for (const id of uniqueIds) {
      try {
        await this.completeBooking(id, adminId);
        completedCount++;
      } catch {
        // Skip bookings that cannot be completed (wrong status, not found, etc.)
      }
    }

    if (completedCount === 0) {
      throw new AppError("No bookings could be marked as complete", 400);
    }

    return { completedCount };
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
    const customer = this.toPlainSubdocument(booking.customer);
    const payment = this.toPlainSubdocument(booking.payment);

    const hasRoutePatch =
      updates["route.pickupDate"] !== undefined ||
      updates["route.pickupTime"] !== undefined ||
      updates["route.returnDate"] !== undefined ||
      updates["route.returnTime"] !== undefined ||
      updates["route.pickupAddress"] !== undefined ||
      updates["route.dropoffAddress"] !== undefined;

    if (hasRoutePatch) {
      flattened.route = {
        ...route,
        ...(updates["route.pickupDate"] !== undefined
          ? { pickupDate: updates["route.pickupDate"] }
          : {}),
        ...(updates["route.pickupTime"] !== undefined
          ? { pickupTime: updates["route.pickupTime"] }
          : {}),
        ...(updates["route.returnDate"] !== undefined
          ? { returnDate: updates["route.returnDate"] || undefined }
          : {}),
        ...(updates["route.returnTime"] !== undefined
          ? { returnTime: updates["route.returnTime"] || undefined }
          : {}),
        ...(updates["route.pickupAddress"] !== undefined
          ? { pickupAddress: updates["route.pickupAddress"] }
          : {}),
        ...(updates["route.dropoffAddress"] !== undefined
          ? { dropoffAddress: updates["route.dropoffAddress"] }
          : {}),
      };
      delete flattened["route.pickupDate"];
      delete flattened["route.pickupTime"];
      delete flattened["route.returnDate"];
      delete flattened["route.returnTime"];
      delete flattened["route.pickupAddress"];
      delete flattened["route.dropoffAddress"];
    }

    if (updates["flight.flightNumber"] !== undefined || updates["flight.terminal"] !== undefined) {
      flattened.flight = {
        ...flight,
        ...(updates["flight.flightNumber"] !== undefined
          ? { flightNumber: updates["flight.flightNumber"] }
          : {}),
        ...(updates["flight.terminal"] !== undefined
          ? { terminal: updates["flight.terminal"] }
          : {}),
      };
      delete flattened["flight.flightNumber"];
      delete flattened["flight.terminal"];
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

    const customerPatch: Record<string, unknown> = {};
    for (const key of ["firstName", "lastName", "phone", "email"] as const) {
      const updateKey = `customer.${key}`;
      if (updates[updateKey] !== undefined) {
        customerPatch[key] = updates[updateKey];
        delete flattened[updateKey];
      }
    }

    if (Object.keys(customerPatch).length > 0) {
      flattened.customer = { ...customer, ...customerPatch };
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

  private async sendBookingUpdatedEmail(booking: IBooking) {
    try {
      await emailService.sendBookingUpdatedEmail(
        {
          firstName: booking.customer.firstName,
          email: booking.customer.email,
        },
        toBookingEmailDetails(booking)
      );
    } catch (error) {
      logger.error("Failed to send booking updated email", { error });
    }
  }

  private async notifyDriversOfConfirmedBooking(booking: IBooking) {
    try {
      await bookingDriverNotificationService.scheduleNotifyAllDriversOfConfirmedBooking(booking);
    } catch (error) {
      logger.error("Failed to schedule driver new booking emails", { error });
    }
  }

  private async notifyAssignedDriverOfBookingUpdate(booking: IBooking) {
    try {
      await bookingDriverNotificationService.notifyAssignedDriverOfBookingUpdate(booking);
    } catch (error) {
      logger.error("Failed to send driver booking updated email", { error });
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
