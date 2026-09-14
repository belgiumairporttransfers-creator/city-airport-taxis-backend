import { env } from "@/config/env";
import emailService from "@/infrastructure/email/email.service";
import { toBookingEmailDetails } from "@/infrastructure/email/utils/booking-email-details";
import type { TripStatusEmailStep } from "@/infrastructure/email/templates/booking.template";
import driverRepository from "@/modules/drivers/repositories/driver.repository";
import logger from "@/shared/utils/logger";
import type { IBooking } from "@/modules/bookings/types/booking.types";

class TripStatusNotificationService {
  private getAdminRecipients() {
    return [
      {
        email: env.DEFAULT_ADMIN_EMAIL,
        firstName: "Admin",
      },
    ];
  }

  private getAssignedDriverId(booking: IBooking) {
    return booking.currentDriverId?.toString() ?? booking.driver?.driverId?.toString();
  }

  async notifyTripStatus(booking: IBooking, step: TripStatusEmailStep) {
    const details = toBookingEmailDetails(booking);

    try {
      if (step === "completed") {
        await emailService.sendTripCompletedEmail(
          {
            firstName: booking.customer.firstName,
            email: booking.customer.email,
          },
          details,
          { includeReviewCta: true }
        );

        const driverId = this.getAssignedDriverId(booking);
        if (driverId) {
          const driver = await driverRepository.findById(driverId);
          if (driver?.email) {
            await emailService.sendTripCompletedEmail(
              {
                firstName: driver.firstName,
                email: driver.email,
              },
              details,
              { includeReviewCta: false }
            );
          }
        }
      } else {
        await emailService.sendCustomerTripStatusEmail(
          {
            firstName: booking.customer.firstName,
            email: booking.customer.email,
          },
          details,
          step
        );
      }
    } catch (error) {
      logger.error("Failed to send trip status email to customer/driver", {
        bookingNumber: booking.bookingNumber,
        step,
        error,
      });
    }

    try {
      const admins = this.getAdminRecipients();

      await Promise.all(
        admins.map((admin) => emailService.sendAdminTripStatusEmail(admin, details, step))
      );
    } catch (error) {
      logger.error("Failed to send trip status email to admins", {
        bookingNumber: booking.bookingNumber,
        step,
        error,
      });
    }
  }
}

export default new TripStatusNotificationService();
