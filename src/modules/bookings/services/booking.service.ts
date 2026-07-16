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
import type {
  CreateBookingPayload,
  CreateBookingResult,
  GetBookingsQuery,
  IBooking,
} from "@/modules/bookings/types/booking.types";

class BookingService {
  async createBooking(payload: CreateBookingPayload): Promise<CreateBookingResult> {
    const category = await vehicleCategoryRepository.findById(payload.step2.categoryId);

    if (!category) {
      throw new AppError("Vehicle category not found", 404);
    }

    if (category.status !== "active") {
      throw new AppError("Vehicle category is not active", 400);
    }

    const settings = await settingsService.getSettings();
    const mollieApiKey = resolveMollieApiKey(settings.paymentMode);

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

    const booking = await bookingRepository.create({
      status: "pending",
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
        paymentMethod: "mollie",
        paymentStatus: "pending",
      },
      driver: {},
      timeline: [
        {
          event: "BOOKING_CREATED",
          at: new Date(),
        },
      ],
      notes: payload.step3.notes?.trim() || undefined,
    });

    const payment = await paymentService.createPayment({
      bookingId: booking._id.toString(),
      status: "pending",
      amount: payload.pricing.total,
      currency: "EUR",
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
        paymentMode: settings.paymentMode,
      },
    });

    return { booking: saved, checkoutUrl };
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
