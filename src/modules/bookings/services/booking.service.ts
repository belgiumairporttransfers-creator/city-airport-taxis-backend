import { Types } from "mongoose";
import { env } from "@/config/env";
import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import bookingRepository from "@/modules/bookings/repositories/booking.repository";
import vehicleCategoryRepository from "@/modules/vehicle-categories/repositories/vehicle-category.repository";
import paymentService from "@/modules/payments/services/payment.service";
import paymentRepository from "@/modules/payments/repositories/payment.repository";
import settingsService from "@/modules/settings/services/settings.service";
import mollieClient from "@/modules/payments/utils/mollie.client";
import { resolveMollieApiKey } from "@/modules/payments/utils/mollie-api-key";
import { toProviderResponseRecord } from "@/modules/payments/utils/mollie.helpers";
import { buildMollieWebhookUrl } from "@/modules/payments/utils/mollie-webhook-url";
import bookingConfirmationNotificationService from "@/modules/bookings/services/booking-confirmation-notification.service";
import bookingDriverNotificationService from "@/modules/bookings/services/booking-driver-notification.service";
import notificationService from "@/modules/notifications/services/notification.service";
import logger from "@/shared/utils/logger";
import type {
  BookingPaymentMethod,
  CreateBookingPayload,
  CreateBookingResult,
  GetBookingsQuery,
  IBooking,
} from "@/modules/bookings/types/booking.types";

class BookingService {
  private buildBookingCreateData(
    payload: CreateBookingPayload,
    category: { image?: string },
    options: {
      status: "pending" | "confirmed";
      paymentMethod: BookingPaymentMethod;
      paymentStatus: string;
    }
  ) {
    const isHourly = payload.category === "hourly";
    const distance = payload.routeData?.distance ?? 0;
    const selectedDurationHours =
      typeof payload.routeData?.duration === "number"
        ? payload.routeData.duration
        : typeof payload.routeData?.duration === "object" &&
            payload.routeData.duration !== null
          ? Number(payload.routeData.duration.duration)
          : undefined;
    const durationMinutes =
      payload.routeData?.durationMinutes ??
      (isHourly && Number.isFinite(selectedDurationHours) && selectedDurationHours! > 0
        ? selectedDurationHours! * 60
        : undefined);
    const isAirportPickup = payload.step3.isAirportPickup;
    const now = new Date();

    return {
      status: options.status,
      category: payload.category,
      customer: {
        firstName: payload.step3.firstName.trim(),
        lastName: payload.step3.lastName.trim(),
        phone: payload.step3.phone.trim(),
        email: payload.step3.email.trim().toLowerCase(),
      },
      route: {
        pickupAddress: payload.step1.pickupAddress.trim(),
        dropoffAddress: (payload.step1.deliveryAddress ?? "").trim(),
        pickupDate: payload.step1.pickupDate,
        pickupTime: payload.step1.pickupTime,
        returnDate:
          payload.category === "return-trip" ? payload.step1.returnDate : undefined,
        returnTime:
          payload.category === "return-trip" ? payload.step1.returnTime : undefined,
        distance,
        durationMinutes,
        estimatedArrival: payload.routeData?.estTime ?? undefined,
        airportPickup: isAirportPickup,
      },
      vehicle: {
        categoryId: new Types.ObjectId(payload.step2.categoryId),
        categoryName: payload.step2.category.name,
        passengers: payload.step2.passengers,
        luggage: payload.step2.luggage,
        handLuggage: payload.step3.handLuggage,
        smallCheckedCase: payload.step3.smallCheckedCase,
        largeCheckedCase: payload.step3.largeCheckedCase,
        image: payload.step2.category.image?.trim() || category.image || undefined,
      },
      flight: {
        required: isAirportPickup,
        flightNumber: isAirportPickup ? payload.step3.flightNumber?.trim() : undefined,
      },
      pricing: {
        vehicleFare: payload.pricing.breakdown?.totalVehicleFare ?? payload.pricing.total,
        airportPickupFee: payload.pricing.breakdown?.airportPickupPrice ?? 0,
        total: payload.pricing.total,
      },
      payment: {
        paymentMethod: options.paymentMethod,
        paymentStatus: options.paymentStatus,
      },
      driver: {},
      timeline: [
        {
          event: "BOOKING_CREATED",
          at: now,
        },
        ...(options.status === "confirmed"
          ? [
              {
                event: "BOOKING_CONFIRMED" as const,
                at: now,
              },
            ]
          : []),
      ],
      notes: payload.step3.notes?.trim() || undefined,
    };
  }

  private async notifyOnboardBookingConfirmed(booking: IBooking) {
    try {
      await bookingConfirmationNotificationService.notifyBookingConfirmed(booking);
    } catch (error) {
      logger.error("Failed to send onboard booking confirmation emails", { error });
    }

    try {
      await notificationService.notifyAdmins({
        title: "New Booking",
        message: `Pay onboard booking ${booking.bookingNumber} confirmed.`,
        type: "booking.created",
        severity: "success",
        entityType: "booking",
        entityId: booking._id.toString(),
        actionUrl: `/bookings/${booking._id.toString()}`,
      });
    } catch (error) {
      logger.error("Failed to create onboard booking admin notification", { error });
    }

    try {
      await bookingDriverNotificationService.notifyAllDriversOfConfirmedBooking(booking);
    } catch (error) {
      logger.error("Failed to send driver emails for onboard booking", { error });
    }
  }

  private async createMollieBooking(
    payload: CreateBookingPayload,
    category: { image?: string },
    paymentMode: "test" | "live"
  ): Promise<CreateBookingResult> {
    const mollieApiKey = resolveMollieApiKey(paymentMode);
    const booking = await bookingRepository.create(
      this.buildBookingCreateData(payload, category, {
        status: "pending",
        paymentMethod: "mollie",
        paymentStatus: "pending",
      })
    );

    const payment = await paymentService.createPayment({
      bookingId: booking._id.toString(),
      status: "pending",
      amount: payload.pricing.total,
      currency: "EUR",
      paymentMethod: "mollie",
    });

    const saved = await bookingRepository.updateById(booking._id.toString(), {
      "payment.paymentId": payment._id,
    });

    if (!saved) {
      throw new AppError("Unable to create booking. Please try again.", 500);
    }

    const bookingId = saved._id.toString();
    const paymentId = payment._id.toString();
    const redirectUrl = `${env.FRONTEND_URL}/book-ride/payment-success?bookingId=${encodeURIComponent(bookingId)}`;
    const webhookUrl = buildMollieWebhookUrl();

    let molliePayment;

    try {
      molliePayment = await mollieClient.createPayment(
        {
          amount: {
            value: payload.pricing.total.toFixed(2),
            currency: "EUR",
          },
          description: `Booking-${saved.bookingNumber}`,
          redirectUrl,
          ...(webhookUrl ? { webhookUrl } : {}),
          metadata: {
            bookingId,
            paymentId,
            bookingNumber: saved.bookingNumber,
          },
        },
        { apiKey: mollieApiKey }
      );
    } catch (error) {
      await paymentService.rollbackFailedCheckout(
        bookingId,
        paymentId,
        error instanceof AppError ? error.message : "mollie_create_failed"
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to create payment checkout session", 502);
    }

    const checkoutUrl = molliePayment._links?.checkout?.href;

    if (!checkoutUrl) {
      await paymentService.rollbackFailedCheckout(bookingId, paymentId, "checkout_url_missing");
      throw new AppError("Failed to create payment checkout session", 502);
    }

    await paymentRepository.updateById(paymentId, {
      providerPaymentId: molliePayment.id,
      providerResponse: toProviderResponseRecord(molliePayment),
    });

    auditService.log({
      event: AuditEvents.BOOKING_CREATED,
      actorType: "system",
      entityType: "booking",
      entityId: bookingId,
      metadata: {
        bookingNumber: saved.bookingNumber,
        paymentMethod: "mollie",
        status: "pending",
        paymentMode,
      },
    });

    return { booking: saved, checkoutUrl };
  }

  private async createPayOnboardBooking(
    payload: CreateBookingPayload,
    category: { image?: string }
  ): Promise<CreateBookingResult> {
    const booking = await bookingRepository.create(
      this.buildBookingCreateData(payload, category, {
        status: "confirmed",
        paymentMethod: "pay_onboard",
        paymentStatus: "pending",
      })
    );

    const payment = await paymentService.createPayment({
      bookingId: booking._id.toString(),
      status: "pending",
      amount: payload.pricing.total,
      currency: "EUR",
      paymentMethod: "pay_onboard",
      providerResponse: { method: "pay_onboard" },
    });

    const saved = await bookingRepository.updateById(booking._id.toString(), {
      "payment.paymentId": payment._id,
    });

    if (!saved) {
      throw new AppError("Unable to create booking. Please try again.", 500);
    }

    auditService.log({
      event: AuditEvents.BOOKING_CREATED,
      actorType: "system",
      entityType: "booking",
      entityId: saved._id.toString(),
      metadata: {
        bookingNumber: saved.bookingNumber,
        paymentMethod: "pay_onboard",
        status: "confirmed",
        paymentId: payment._id.toString(),
      },
    });

    auditService.log({
      event: AuditEvents.BOOKING_CONFIRMED,
      actorType: "system",
      entityType: "booking",
      entityId: saved._id.toString(),
      metadata: {
        bookingNumber: saved.bookingNumber,
        paymentMethod: "pay_onboard",
      },
    });

    await this.notifyOnboardBookingConfirmed(saved);

    return { booking: saved };
  }

  async createBooking(payload: CreateBookingPayload): Promise<CreateBookingResult> {
    const category = await vehicleCategoryRepository.findById(payload.step2.categoryId);

    if (!category) {
      throw new AppError("Vehicle category not found", 404);
    }

    if (category.status !== "active") {
      throw new AppError("Vehicle category is not active", 400);
    }

    const settings = await settingsService.getSettings();
    const paymentMethod = payload.step3.paymentMethod ?? "mollie";

    if (paymentMethod === "pay_onboard") {
      return this.createPayOnboardBooking(payload, category);
    }

    return this.createMollieBooking(payload, category, settings.paymentMode);
  }

  async getBooking(id: string) {
    const booking = await bookingRepository.findById(id);

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    return booking;
  }

  async resolveVehicleImage(booking: IBooking) {
    if (booking.vehicle.image) {
      return booking.vehicle.image;
    }

    const category = await vehicleCategoryRepository.findById(
      booking.vehicle.categoryId.toString()
    );

    return category?.image ?? undefined;
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
}

export default new BookingService();
