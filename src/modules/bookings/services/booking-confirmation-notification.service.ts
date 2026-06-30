import { Admin } from "@/infrastructure/database/models/Admin";
import { env } from "@/config/env";
import emailService from "@/infrastructure/email/email.service";
import { toBookingEmailDetails } from "@/infrastructure/email/utils/booking-email-details";
import logger from "@/shared/utils/logger";
import type { IBooking } from "@/modules/bookings/types/booking.types";

class BookingConfirmationNotificationService {
  private async getAdminRecipients() {
    const admins = await Admin.find().select("email firstName").lean();

    if (admins.length > 0) {
      return admins.map((admin) => ({
        email: admin.email,
        firstName: admin.firstName || "Admin",
      }));
    }

    return [
      {
        email: env.DEFAULT_ADMIN_EMAIL,
        firstName: "Admin",
      },
    ];
  }

  async notifyBookingConfirmed(booking: IBooking) {
    const details = toBookingEmailDetails(booking);

    try {
      await emailService.sendBookingConfirmedEmail(
        {
          firstName: booking.customer.firstName,
          email: booking.customer.email,
        },
        details
      );
    } catch (error) {
      logger.error("Failed to send booking confirmed email to customer", { error });
    }

    try {
      const admins = await this.getAdminRecipients();

      await Promise.all(
        admins.map((admin) =>
          emailService.sendAdminBookingConfirmedEmail(admin, details)
        )
      );
    } catch (error) {
      logger.error("Failed to send booking confirmed email to admins", { error });
    }
  }
}

export default new BookingConfirmationNotificationService();
