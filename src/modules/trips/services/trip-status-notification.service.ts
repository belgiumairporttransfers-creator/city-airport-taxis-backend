import { env } from "@/config/env";
import emailService from "@/infrastructure/email/email.service";
import { toBookingEmailDetails } from "@/infrastructure/email/utils/booking-email-details";
import type { TripStatusEmailStep } from "@/infrastructure/email/templates/booking.template";
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

  async notifyTripStatus(booking: IBooking, step: TripStatusEmailStep) {
    const details = toBookingEmailDetails(booking);

    try {
      if (step === "completed") {
        await emailService.sendTripCompletedEmail(
          {
            firstName: booking.customer.firstName,
            email: booking.customer.email,
          },
          details
        );
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
      logger.error("Failed to send trip status email to customer", {
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
