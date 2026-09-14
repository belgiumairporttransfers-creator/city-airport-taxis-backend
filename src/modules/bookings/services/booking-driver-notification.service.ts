import { env } from "@/config/env";
import emailService from "@/infrastructure/email/email.service";
import driverRepository from "@/modules/drivers/repositories/driver.repository";
import settingsService from "@/modules/settings/services/settings.service";
import { calculateDriverEarning } from "@/modules/wallet/utils/driver-earnings";
import logger from "@/shared/utils/logger";
import type { IBooking } from "@/modules/bookings/types/booking.types";

const BATCH_SIZE = Math.max(1, env.NEWSLETTER_BATCH_SIZE);

class BookingDriverNotificationService {
  private async getDriverPricing(booking: IBooking) {
    const commissionPercent = await settingsService.getDriverCommissionPercent();
    const total = Number(booking.pricing?.total ?? 0);
    const driverEarning = calculateDriverEarning(
      total,
      commissionPercent,
      booking.payment?.paymentMethod
    );

    return {
      commissionPercent,
      driverEarning,
      total,
    };
  }

  async scheduleNotifyAllDriversOfConfirmedBooking(booking: IBooking) {
    const { scheduleDriverPoolNotify } = await import(
      "@/modules/bookings/queues/driver-pool-notify.queue"
    );
    await scheduleDriverPoolNotify(booking._id.toString());
  }

  async cancelScheduledDriverPoolNotify(bookingId: string) {
    const { cancelDriverPoolNotify } = await import(
      "@/modules/bookings/queues/driver-pool-notify.queue"
    );
    await cancelDriverPoolNotify(bookingId);
  }

  async notifyAllDriversOfConfirmedBooking(booking: IBooking) {
    const drivers = await driverRepository.findApprovedWithPortalAccess();
    const pricing = await this.getDriverPricing(booking);

    if (!drivers.length) {
      logger.info("No approved drivers to notify for confirmed booking", {
        bookingNumber: booking.bookingNumber,
      });
      return { sent: 0, failed: 0, total: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (let index = 0; index < drivers.length; index += BATCH_SIZE) {
      const batch = drivers.slice(index, index + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((driver) =>
          emailService.sendDriverNewBookingEmail(
            { firstName: driver.firstName, email: driver.email },
            booking,
            {
              commissionPercent: pricing.commissionPercent,
              driverEarning: pricing.driverEarning,
            }
          )
        )
      );

      sent += results.filter(Boolean).length;
      failed += results.filter((result) => !result).length;
    }

    logger.info("Driver new booking emails processed", {
      bookingNumber: booking.bookingNumber,
      sent,
      failed,
      total: drivers.length,
      commissionPercent: pricing.commissionPercent,
      driverEarning: pricing.driverEarning,
    });

    return { sent, failed, total: drivers.length };
  }

  async notifyDriverOfTripEarning(booking: IBooking) {
    if (!booking.currentDriverId) {
      return false;
    }

    const driver = await driverRepository.findById(booking.currentDriverId.toString());

    if (!driver) {
      return false;
    }

    const pricing = await this.getDriverPricing(booking);

    if (pricing.driverEarning <= 0) {
      return false;
    }

    return emailService.sendDriverTripEarningEmail(
      { firstName: driver.firstName, email: driver.email },
      booking.bookingNumber,
      pricing
    );
  }

  async notifyAssignedDriverOfBookingUpdate(booking: IBooking) {
    const driverId =
      booking.currentDriverId?.toString() ?? booking.driver?.driverId?.toString();

    if (!driverId || booking.status !== "accepted") {
      return false;
    }

    const driver = await driverRepository.findById(driverId);

    if (!driver?.email) {
      return false;
    }

    return emailService.sendDriverBookingUpdatedEmail(
      { firstName: driver.firstName, email: driver.email },
      {
        bookingNumber: booking.bookingNumber,
        route: {
          pickupAddress: booking.route.pickupAddress,
          dropoffAddress: booking.route.dropoffAddress?.trim() || undefined,
          pickupDate: booking.route.pickupDate,
          pickupTime: booking.route.pickupTime,
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
          passengers: booking.vehicle.passengers,
        },
        notes: booking.notes,
      }
    );
  }
}

export default new BookingDriverNotificationService();
