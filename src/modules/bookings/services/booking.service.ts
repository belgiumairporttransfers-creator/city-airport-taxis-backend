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
    },
    leg: "outbound" | "return" | "single" = "single"
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
    const now = new Date();

    const isReturnLeg = leg === "return";
    const isOutboundLeg = leg === "outbound";
    const isAirportPickup = isReturnLeg ? false : payload.step3.isAirportPickup;

    const pickupAddress = isReturnLeg
      ? (payload.step1.deliveryAddress ?? "").trim()
      : payload.step1.pickupAddress.trim();
    const dropoffAddress = isReturnLeg
      ? payload.step1.pickupAddress.trim()
      : (payload.step1.deliveryAddress ?? "").trim();
    const pickupDate = isReturnLeg
      ? payload.step1.returnDate!
      : payload.step1.pickupDate;
    const pickupTime = isReturnLeg
      ? payload.step1.returnTime!
      : payload.step1.pickupTime;

    const totalVehicleFare = payload.pricing.breakdown?.totalVehicleFare ?? payload.pricing.total;
    const airportPickupPrice = payload.pricing.breakdown?.airportPickupPrice ?? 0;

    let vehicleFare: number;
    let airportPickupFee: number;
    let total: number;

    if (isOutboundLeg) {
      vehicleFare = Math.round((totalVehicleFare / 2) * 100) / 100;
      airportPickupFee = airportPickupPrice;
      total = Math.round((vehicleFare + airportPickupFee) * 100) / 100;
    } else if (isReturnLeg) {
      const outboundVehicleFare = Math.round((totalVehicleFare / 2) * 100) / 100;
      vehicleFare = Math.round((totalVehicleFare - outboundVehicleFare) * 100) / 100;
      airportPickupFee = 0;
      const outboundTotal = Math.round((outboundVehicleFare + airportPickupPrice) * 100) / 100;
      total = Math.round((payload.pricing.total - outboundTotal) * 100) / 100;
    } else {
      vehicleFare = totalVehicleFare;
      airportPickupFee = airportPickupPrice;
      total = payload.pricing.total;
    }

    return {
      status: options.status,
      category: payload.category,
      tripLeg: isOutboundLeg ? ("outbound" as const) : isReturnLeg ? ("return" as const) : undefined,
      customer: {
        firstName: payload.step3.firstName.trim(),
        lastName: payload.step3.lastName.trim(),
        phone: payload.step3.phone.trim(),
        email: payload.step3.email.trim().toLowerCase(),
      },
      route: {
        pickupAddress,
        dropoffAddress,
        pickupDate,
        pickupTime,
        returnDate: isOutboundLeg
          ? payload.step1.returnDate
          : !isReturnLeg && payload.category === "return-trip"
            ? payload.step1.returnDate
            : undefined,
        returnTime: isOutboundLeg
          ? payload.step1.returnTime
          : !isReturnLeg && payload.category === "return-trip"
            ? payload.step1.returnTime
            : undefined,
        distance,
        durationMinutes,
        estimatedArrival: isReturnLeg ? undefined : (payload.routeData?.estTime ?? undefined),
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
        vehicleFare,
        airportPickupFee,
        total,
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
      await bookingDriverNotificationService.scheduleNotifyAllDriversOfConfirmedBooking(booking);
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
    const isReturnTrip =
      payload.category === "return-trip" &&
      Boolean(payload.step1.returnDate && payload.step1.returnTime);

    if (isReturnTrip) {
      const outboundBooking = await bookingRepository.create(
        this.buildBookingCreateData(
          payload,
          category,
          {
            status: "pending",
            paymentMethod: "mollie",
            paymentStatus: "pending",
          },
          "outbound"
        )
      );

      const returnBooking = await bookingRepository.create({
        ...this.buildBookingCreateData(
          payload,
          category,
          {
            status: "pending",
            paymentMethod: "mollie",
            paymentStatus: "pending",
          },
          "return"
        ),
        relatedBookingId: outboundBooking._id,
        relatedBookingNumber: outboundBooking.bookingNumber,
      });

      const savedOutbound =
        (await bookingRepository.updateById(outboundBooking._id.toString(), {
          relatedBookingId: returnBooking._id,
          relatedBookingNumber: returnBooking.bookingNumber,
        })) ?? outboundBooking;

      const payment = await paymentService.createPayment({
        bookingId: savedOutbound._id.toString(),
        status: "pending",
        amount: payload.pricing.total,
        currency: "EUR",
        paymentMethod: "mollie",
      });

      await bookingRepository.updateById(savedOutbound._id.toString(), {
        "payment.paymentId": payment._id,
      });
      await bookingRepository.updateById(returnBooking._id.toString(), {
        "payment.paymentId": payment._id,
      });

      const bookingId = savedOutbound._id.toString();
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
            description: `Booking-${savedOutbound.bookingNumber}`,
            redirectUrl,
            ...(webhookUrl ? { webhookUrl } : {}),
            metadata: {
              bookingId,
              returnBookingId: returnBooking._id.toString(),
              paymentId,
              bookingNumber: savedOutbound.bookingNumber,
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
        await bookingRepository.updateById(returnBooking._id.toString(), {
          status: "cancelled",
        });

        if (error instanceof AppError) {
          throw error;
        }

        throw new AppError("Failed to create payment checkout session", 502);
      }

      const checkoutUrl = molliePayment._links?.checkout?.href;

      if (!checkoutUrl) {
        await paymentService.rollbackFailedCheckout(bookingId, paymentId, "checkout_url_missing");
        await bookingRepository.updateById(returnBooking._id.toString(), {
          status: "cancelled",
        });
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
          bookingNumber: savedOutbound.bookingNumber,
          paymentMethod: "mollie",
          status: "pending",
          paymentMode,
        },
      });

      auditService.log({
        event: AuditEvents.BOOKING_CREATED,
        actorType: "system",
        entityType: "booking",
        entityId: returnBooking._id.toString(),
        metadata: {
          bookingNumber: returnBooking.bookingNumber,
          paymentMethod: "mollie",
          status: "pending",
          paymentMode,
        },
      });

      return { booking: savedOutbound, checkoutUrl };
    }

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
    const isReturnTrip =
      payload.category === "return-trip" &&
      Boolean(payload.step1.returnDate && payload.step1.returnTime);

    if (isReturnTrip) {
      const outboundBooking = await bookingRepository.create(
        this.buildBookingCreateData(
          payload,
          category,
          {
            status: "confirmed",
            paymentMethod: "pay_onboard",
            paymentStatus: "pending",
          },
          "outbound"
        )
      );

      const returnBooking = await bookingRepository.create({
        ...this.buildBookingCreateData(
          payload,
          category,
          {
            status: "confirmed",
            paymentMethod: "pay_onboard",
            paymentStatus: "pending",
          },
          "return"
        ),
        relatedBookingId: outboundBooking._id,
        relatedBookingNumber: outboundBooking.bookingNumber,
      });

      const savedOutbound =
        (await bookingRepository.updateById(outboundBooking._id.toString(), {
          relatedBookingId: returnBooking._id,
          relatedBookingNumber: returnBooking.bookingNumber,
        })) ?? outboundBooking;

      const paymentOutbound = await paymentService.createPayment({
        bookingId: savedOutbound._id.toString(),
        status: "pending",
        amount: savedOutbound.pricing.total,
        currency: "EUR",
        paymentMethod: "pay_onboard",
        providerResponse: { method: "pay_onboard" },
      });

      const paymentReturn = await paymentService.createPayment({
        bookingId: returnBooking._id.toString(),
        status: "pending",
        amount: returnBooking.pricing.total,
        currency: "EUR",
        paymentMethod: "pay_onboard",
        providerResponse: { method: "pay_onboard" },
      });

      await bookingRepository.updateById(savedOutbound._id.toString(), {
        "payment.paymentId": paymentOutbound._id,
      });
      await bookingRepository.updateById(returnBooking._id.toString(), {
        "payment.paymentId": paymentReturn._id,
      });

      auditService.log({
        event: AuditEvents.BOOKING_CREATED,
        actorType: "system",
        entityType: "booking",
        entityId: savedOutbound._id.toString(),
        metadata: {
          bookingNumber: savedOutbound.bookingNumber,
          paymentMethod: "pay_onboard",
          status: "confirmed",
          paymentId: paymentOutbound._id.toString(),
        },
      });

      auditService.log({
        event: AuditEvents.BOOKING_CREATED,
        actorType: "system",
        entityType: "booking",
        entityId: returnBooking._id.toString(),
        metadata: {
          bookingNumber: returnBooking.bookingNumber,
          paymentMethod: "pay_onboard",
          status: "confirmed",
          paymentId: paymentReturn._id.toString(),
        },
      });

      auditService.log({
        event: AuditEvents.BOOKING_CONFIRMED,
        actorType: "system",
        entityType: "booking",
        entityId: savedOutbound._id.toString(),
        metadata: {
          bookingNumber: savedOutbound.bookingNumber,
          paymentMethod: "pay_onboard",
        },
      });

      auditService.log({
        event: AuditEvents.BOOKING_CONFIRMED,
        actorType: "system",
        entityType: "booking",
        entityId: returnBooking._id.toString(),
        metadata: {
          bookingNumber: returnBooking.bookingNumber,
          paymentMethod: "pay_onboard",
        },
      });

      await this.notifyOnboardBookingConfirmed(savedOutbound);
      await this.notifyOnboardBookingConfirmed(returnBooking);

      return { booking: savedOutbound };
    }

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
