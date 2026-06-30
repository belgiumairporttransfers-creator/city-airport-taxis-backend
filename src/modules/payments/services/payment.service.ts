import { Types } from "mongoose";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import logger from "@/shared/utils/logger";
import notificationService from "@/modules/notifications/services/notification.service";
import paymentRepository from "@/modules/payments/repositories/payment.repository";
import bookingRepository from "@/modules/bookings/repositories/booking.repository";
import bookingDriverNotificationService from "@/modules/bookings/services/booking-driver-notification.service";
import bookingConfirmationNotificationService from "@/modules/bookings/services/booking-confirmation-notification.service";
import { appendTimelineEntry } from "@/modules/bookings/utils/booking-timeline";
import mollieClient from "@/modules/payments/utils/mollie.client";
import {
  resolveMollieApiKey,
  resolveMollieApiKeyForPayment,
} from "@/modules/payments/utils/mollie-api-key";
import settingsService from "@/modules/settings/services/settings.service";
import {
  extractCardLastDigits,
  toProviderResponseRecord,
} from "@/modules/payments/utils/mollie.helpers";
import type { PaymentStatus } from "@/modules/payments/types/payment.types";
import type { IBooking } from "@/modules/bookings/types/booking.types";

type MollieWebhookResult = {
  handled: boolean;
  skipped?: boolean;
  reason?: string;
};

class PaymentService {
  private logPaymentAudit(
    event: (typeof AuditEvents)[keyof typeof AuditEvents],
    paymentId: string,
    metadata?: Record<string, unknown>
  ) {
    auditService.log({
      event,
      actorType: "system",
      entityType: "payment",
      entityId: paymentId,
      metadata,
    });
  }

  async createPayment(data: Parameters<typeof paymentRepository.create>[0]) {
    const payment = await paymentRepository.create(data);

    this.logPaymentAudit(AuditEvents.PAYMENT_CREATED, payment._id.toString(), {
      bookingId: data.bookingId,
      status: data.status,
      amount: data.amount,
    });

    return payment;
  }

  async rollbackFailedCheckout(bookingId: string, paymentId: string, reason: string) {
    const booking = await bookingRepository.findById(bookingId);

    await paymentRepository.updateById(paymentId, {
      status: "failed",
    });

    if (!booking) {
      logger.warn("Checkout rollback: booking not found", { bookingId, paymentId, reason });
      return;
    }

    const timeline = appendTimelineEntry(booking.timeline ?? [], "BOOKING_CANCELLED", {
      reason,
      source: "checkout_creation_failed",
    });

    await bookingRepository.updateById(bookingId, {
      status: "cancelled",
      payment: {
        ...booking.payment,
        paymentStatus: "failed",
        paymentId: new Types.ObjectId(paymentId),
      },
      timeline,
    });

    this.logPaymentAudit(AuditEvents.PAYMENT_FAILED, paymentId, {
      bookingId,
      bookingNumber: booking.bookingNumber,
      reason,
    });

    auditService.log({
      event: AuditEvents.BOOKING_UPDATED,
      actorType: "system",
      entityType: "booking",
      entityId: bookingId,
      metadata: {
        bookingNumber: booking.bookingNumber,
        status: "cancelled",
        reason,
      },
    });
  }

  async syncBookingPaymentStatus(bookingId: string) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      return;
    }

    if (booking.status === "confirmed" || booking.status === "cancelled") {
      return;
    }

    const payment = await paymentRepository.findByBookingId(bookingId);

    if (!payment) {
      return;
    }

    if (payment.status === "paid") {
      await this.syncBookingAfterPaid(payment._id.toString(), booking);
      return;
    }

    if (!payment.providerPaymentId) {
      return;
    }

    try {
      const settings = await settingsService.getSettings();
      const apiKey = resolveMollieApiKeyForPayment(payment, settings.paymentMode);
      const molliePayment = await mollieClient.getPayment(payment.providerPaymentId, { apiKey });
      const providerResponse = toProviderResponseRecord(molliePayment);
      const cardLastDigits = extractCardLastDigits(molliePayment);

      switch (molliePayment.status) {
        case "paid":
          await this.handlePaidStatus(
            payment._id.toString(),
            payment.providerPaymentId,
            booking,
            providerResponse,
            cardLastDigits
          );
          break;

        case "failed":
          await this.handleFailedStatus(
            payment._id.toString(),
            booking,
            "failed",
            "failed",
            providerResponse
          );
          break;

        case "expired":
          await this.handleFailedStatus(
            payment._id.toString(),
            booking,
            "expired",
            "expired",
            providerResponse
          );
          break;

        case "canceled":
          await this.handleFailedStatus(
            payment._id.toString(),
            booking,
            "cancelled",
            "cancelled",
            providerResponse
          );
          break;

        default:
          await this.syncProviderResponse(payment._id.toString(), providerResponse);
      }
    } catch (error) {
      logger.warn("Failed to sync booking payment from provider", { bookingId, error });
    }
  }

  async handleMollieWebhook(molliePaymentId: string): Promise<MollieWebhookResult> {
    const settings = await settingsService.getSettings();
    const paymentMode = settings.paymentMode;

    let payment = await paymentRepository.findByProviderPaymentId(molliePaymentId);

    const apiKey = payment
      ? resolveMollieApiKeyForPayment(payment, paymentMode)
      : resolveMollieApiKey(paymentMode);

    const molliePayment = await mollieClient.getPayment(molliePaymentId, { apiKey });
    const providerResponse = toProviderResponseRecord(molliePayment);
    const internalPaymentId = molliePayment.metadata?.paymentId;

    if (!payment && internalPaymentId) {
      payment = await paymentRepository.findById(internalPaymentId);
    }

    if (!payment) {
      logger.warn("Mollie webhook ignored: payment not found", {
        molliePaymentId,
        internalPaymentId,
      });
      return { handled: false, reason: "payment_not_found" };
    }

    if (!payment.providerPaymentId) {
      await paymentRepository.updateById(payment._id.toString(), {
        providerPaymentId: molliePaymentId,
      });
    }

    if (payment.status === "paid") {
      await this.syncProviderResponse(payment._id.toString(), providerResponse);

      const booking = await bookingRepository.findById(payment.bookingId.toString());
      if (booking) {
        await this.syncBookingAfterPaid(payment._id.toString(), booking, {
          skipNotifications: true,
        });
      }

      return { handled: true, skipped: true, reason: "already_paid" };
    }

    const booking = await bookingRepository.findById(payment.bookingId.toString());

    if (!booking) {
      logger.error("Mollie webhook ignored: booking not found", {
        molliePaymentId,
        paymentId: payment._id.toString(),
        bookingId: payment.bookingId.toString(),
      });
      return { handled: false, reason: "booking_not_found" };
    }

    const cardLastDigits = extractCardLastDigits(molliePayment);

    switch (molliePayment.status) {
      case "paid":
        return this.handlePaidStatus(
          payment._id.toString(),
          molliePaymentId,
          booking,
          providerResponse,
          cardLastDigits
        );

      case "authorized":
      case "open":
      case "pending":
        await this.syncProviderResponse(payment._id.toString(), providerResponse);
        return { handled: true };

      case "failed":
        return this.handleFailedStatus(
          payment._id.toString(),
          booking,
          "failed",
          "failed",
          providerResponse
        );

      case "expired":
        return this.handleFailedStatus(
          payment._id.toString(),
          booking,
          "expired",
          "expired",
          providerResponse
        );

      case "canceled":
        return this.handleFailedStatus(
          payment._id.toString(),
          booking,
          "cancelled",
          "cancelled",
          providerResponse
        );

      default:
        logger.warn("Mollie webhook received unsupported status", {
          molliePaymentId,
          providerStatus: molliePayment.status,
        });
        await this.syncProviderResponse(payment._id.toString(), providerResponse);
        return { handled: true, reason: "unsupported_status" };
    }
  }

  private toPlainSubdocument<T extends object>(value: T): T {
    if (typeof (value as { toObject?: () => T }).toObject === "function") {
      return (value as { toObject: () => T }).toObject();
    }

    return { ...value };
  }

  private async syncBookingAfterPaid(
    paymentId: string,
    booking: IBooking,
    options?: { skipNotifications?: boolean }
  ) {
    const paymentInfo = this.toPlainSubdocument(booking.payment);
    const needsSync =
      booking.status === "pending" || paymentInfo.paymentStatus !== "paid";

    if (!needsSync) {
      return booking;
    }

    const timeline = appendTimelineEntry(booking.timeline ?? [], "PAYMENT_RECEIVED", {
      paymentId,
    });

    const updatedBooking = await bookingRepository.updateById(booking._id.toString(), {
      status: "confirmed",
      payment: {
        ...paymentInfo,
        paymentStatus: "paid",
        paymentId: new Types.ObjectId(paymentId),
      },
      timeline,
    });

    auditService.log({
      event: AuditEvents.BOOKING_UPDATED,
      actorType: "system",
      entityType: "booking",
      entityId: booking._id.toString(),
      metadata: {
        bookingNumber: booking.bookingNumber,
        status: "confirmed",
        reason: "payment_paid",
      },
    });

    if (!options?.skipNotifications) {
      await this.sendBookingConfirmedNotifications(updatedBooking ?? booking);
    }

    return updatedBooking ?? booking;
  }

  private async syncProviderResponse(
    paymentId: string,
    providerResponse: Record<string, unknown>
  ) {
    await paymentRepository.updateById(paymentId, { providerResponse });
  }

  private async handlePaidStatus(
    paymentId: string,
    providerPaymentId: string,
    booking: IBooking,
    providerResponse: Record<string, unknown>,
    cardLastDigits?: string
  ): Promise<MollieWebhookResult> {
    const paidAt = new Date();
    const payment = await paymentRepository.updateByIdIfNotPaid(paymentId, {
      status: "paid",
      paidAt,
      providerPaymentId,
      providerResponse,
      ...(cardLastDigits ? { cardLastDigits } : {}),
    });

    if (!payment) {
      await this.syncBookingAfterPaid(paymentId, booking, { skipNotifications: true });
      return { handled: true, skipped: true, reason: "already_paid" };
    }

    await this.syncBookingAfterPaid(paymentId, booking);

    this.logPaymentAudit(AuditEvents.PAYMENT_PAID, paymentId, {
      bookingId: booking._id.toString(),
      bookingNumber: booking.bookingNumber,
    });

    return { handled: true };
  }

  private async handleFailedStatus(
    paymentId: string,
    booking: IBooking,
    paymentStatus: PaymentStatus,
    bookingPaymentStatus: PaymentStatus,
    providerResponse: Record<string, unknown>
  ): Promise<MollieWebhookResult> {
    await paymentRepository.updateById(paymentId, {
      status: paymentStatus,
      providerResponse,
    });

    const paymentInfo = this.toPlainSubdocument(booking.payment);

    await bookingRepository.updateById(booking._id.toString(), {
      status: "cancelled",
      payment: {
        ...paymentInfo,
        paymentStatus: bookingPaymentStatus,
        paymentId: new Types.ObjectId(paymentId),
      },
    });

    this.logPaymentAudit(AuditEvents.PAYMENT_FAILED, paymentId, {
      bookingId: booking._id.toString(),
      bookingNumber: booking.bookingNumber,
      status: paymentStatus,
    });

    auditService.log({
      event: AuditEvents.BOOKING_UPDATED,
      actorType: "system",
      entityType: "booking",
      entityId: booking._id.toString(),
      metadata: {
        bookingNumber: booking.bookingNumber,
        status: "cancelled",
        reason: paymentStatus,
      },
    });

    return { handled: true };
  }

  private async sendBookingConfirmedNotifications(booking: IBooking) {
    try {
      await bookingConfirmationNotificationService.notifyBookingConfirmed(booking);
    } catch (error) {
      logger.error("Failed to send booking confirmation emails", { error });
    }

    try {
      await notificationService.notifyAdmins({
        title: "New Booking",
        message: `Payment received for booking ${booking.bookingNumber}.`,
        type: "booking.created",
        severity: "success",
        entityType: "booking",
        entityId: booking._id.toString(),
        actionUrl: `/bookings/${booking._id.toString()}`,
      });
    } catch (error) {
      logger.error("Failed to create booking admin notification", { error });
    }

    try {
      await bookingDriverNotificationService.notifyAllDriversOfConfirmedBooking(booking);
    } catch (error) {
      logger.error("Failed to send driver new booking emails", { error });
    }
  }
}

export default new PaymentService();
