import nodemailer from "nodemailer";
import { env } from "@/config/env";
import logger from "@/shared/utils/logger";
import {
  getForgotPasswordEmailTemplate,
  getAdminForgotPasswordEmailTemplate,
  getEmailVerificationTemplate,
} from "@/infrastructure/email/templates/user-auth.template";
import {
  getDriverApplicationApprovedTemplate,
  getDriverApplicationReceivedTemplate,
  getDriverApplicationRejectedTemplate,
  getDriverApplicationResubmittedTemplate,
  getDriverApplicationUnderReviewTemplate,
  getDriverChangesRequestedTemplate,
  getDriverSuspendedTemplate,
} from "@/infrastructure/email/templates/driver-onboarding.template";
import {
  getBookingConfirmedTemplate,
  getAdminBookingConfirmedTemplate,
  getBookingReceivedTemplate,
  getBookingCancelledTemplate,
  getTripCompletedTemplate,
} from "@/infrastructure/email/templates/booking.template";
import type { BookingEmailDetails } from "@/infrastructure/email/utils/booking-email-details";
import {
  getAssignmentCancelledTemplate,
  getDriverAssignedTemplate,
  getDriverNewBookingAvailableTemplate,
  getDriverTripEarningTemplate,
} from "@/infrastructure/email/templates/assignment.template";
import type { IBooking } from "@/modules/bookings/types/booking.types";
import { SendEmailOptions } from "@/modules/auth/types/email.types";
import type { IUser } from "@/modules/auth/types/user.types";
import type { IAdmin } from "@/modules/auth/types/admin.types";

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_PORT === 465,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
      pool: true,
      maxConnections: 5,
    });
  }

  async sendEmail(options: SendEmailOptions) {
    const { to, subject, html, from, replyTo, attachments } = options;
    try {
      await this.transporter.sendMail({
        from: from ?? env.EMAIL_FROM,
        to,
        subject,
        html,
        replyTo,
        attachments,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Email error [${to}]:`, message);
      return false;
    }
  }

  async sendForgotPasswordEmail(user: IUser, resetToken: string) {
    await this.sendEmail({
      to: user.email,
      subject: "Reset Your Password - City Airport Taxis",
      html: getForgotPasswordEmailTemplate(user, resetToken),
    });
  }

  async sendAdminForgotPasswordEmail(admin: IAdmin, resetToken: string) {
    await this.sendEmail({
      to: admin.email,
      subject: "Reset Your Admin Password - City Airport Taxis",
      html: getAdminForgotPasswordEmailTemplate(admin, resetToken),
    });
  }

  async sendEmailVerification(user: IUser, verificationToken: string) {
    await this.sendEmail({
      to: user.email,
      subject: "Verify Your Email - City Airport Taxis",
      html: getEmailVerificationTemplate(user, verificationToken),
    });
  }

  async sendDriverApplicationReceivedEmail(
    driver: { firstName: string; email: string },
    applicationNumber: string
  ) {
    await this.sendEmail({
      to: driver.email,
      subject: "Driver Application Received - City Airport Taxis",
      html: getDriverApplicationReceivedTemplate(driver, applicationNumber),
    });
  }

  async sendDriverApplicationUnderReviewEmail(
    driver: { firstName: string; email: string },
    applicationNumber: string
  ) {
    await this.sendEmail({
      to: driver.email,
      subject: "Driver Application Under Review - City Airport Taxis",
      html: getDriverApplicationUnderReviewTemplate(driver, applicationNumber),
    });
  }

  async sendDriverChangesRequestedEmail(
    driver: { firstName: string; email: string },
    applicationNumber: string,
    reviewNotes: string
  ) {
    await this.sendEmail({
      to: driver.email,
      subject: "Action Required on Your Driver Application - City Airport Taxis",
      html: getDriverChangesRequestedTemplate(driver, applicationNumber, reviewNotes),
    });
  }

  async sendDriverApplicationApprovedEmail(
    driver: { firstName: string; email: string },
    setupToken: string
  ) {
    await this.sendEmail({
      to: driver.email,
      subject: "Driver Application Approved - City Airport Taxis",
      html: getDriverApplicationApprovedTemplate(driver, setupToken),
    });
  }

  async sendDriverApplicationRejectedEmail(
    driver: { firstName: string; email: string },
    applicationNumber: string,
    reviewNotes?: string
  ) {
    await this.sendEmail({
      to: driver.email,
      subject: "Driver Application Update - City Airport Taxis",
      html: getDriverApplicationRejectedTemplate(driver, applicationNumber, reviewNotes),
    });
  }

  async sendDriverApplicationResubmittedEmail(
    driver: { firstName: string; email: string },
    applicationNumber: string
  ) {
    await this.sendEmail({
      to: driver.email,
      subject: "Driver Application Resubmitted - City Airport Taxis",
      html: getDriverApplicationResubmittedTemplate(driver, applicationNumber),
    });
  }

  async sendDriverSuspendedEmail(
    driver: { firstName: string; email: string; applicationNumber: string },
    reviewNotes?: string
  ) {
    await this.sendEmail({
      to: driver.email,
      subject: "Driver Account Suspended - City Airport Taxis",
      html: getDriverSuspendedTemplate(driver, driver.applicationNumber, reviewNotes),
    });
  }

  async sendBookingConfirmedEmail(
    customer: { firstName: string; email: string },
    booking: BookingEmailDetails
  ) {
    await this.sendEmail({
      to: customer.email,
      subject: `Booking Confirmed - ${booking.bookingNumber}`,
      html: getBookingConfirmedTemplate(customer, booking),
    });
  }

  async sendAdminBookingConfirmedEmail(
    admin: { firstName: string; email: string },
    booking: BookingEmailDetails
  ) {
    return this.sendEmail({
      to: admin.email,
      subject: `New Paid Booking - ${booking.bookingNumber}`,
      html: getAdminBookingConfirmedTemplate(admin, booking),
    });
  }

  async sendBookingReceivedEmail(
    customer: { firstName: string; email: string },
    bookingNumber: string,
    total: number,
    currency: string
  ) {
    await this.sendEmail({
      to: customer.email,
      subject: "Booking Received - City Airport Taxis",
      html: getBookingReceivedTemplate(customer, bookingNumber, total, currency),
    });
  }

  async sendBookingCancelledEmail(
    customer: { firstName: string; email: string },
    bookingNumber: string
  ) {
    await this.sendEmail({
      to: customer.email,
      subject: "Booking Cancelled - City Airport Taxis",
      html: getBookingCancelledTemplate(customer, bookingNumber),
    });
  }

  async sendDriverNewBookingEmail(
    driver: { firstName: string; email: string },
    booking: IBooking,
    pricing: {
      commissionPercent: number;
      driverEarning: number;
    }
  ) {
    return this.sendEmail({
      to: driver.email,
      subject: `New Booking Available - ${booking.bookingNumber}`,
      html: getDriverNewBookingAvailableTemplate(driver, {
        id: booking._id.toString(),
        bookingNumber: booking.bookingNumber,
        route: {
          pickupAddress: booking.route.pickupAddress,
          dropoffAddress: booking.route.dropoffAddress,
          pickupDate: booking.route.pickupDate,
          pickupTime: booking.route.pickupTime,
        },
        vehicle: {
          categoryName: booking.vehicle.categoryName,
        },
        pricing: {
          driverEarning: pricing.driverEarning,
        },
      }),
    });
  }

  async sendDriverTripEarningEmail(
    driver: { firstName: string; email: string },
    bookingNumber: string,
    pricing: {
      total: number;
      driverEarning: number;
    }
  ) {
    return this.sendEmail({
      to: driver.email,
      subject: `Earning Added - ${bookingNumber}`,
      html: getDriverTripEarningTemplate(driver, bookingNumber, pricing),
    });
  }

  async sendDriverAssignedEmail(
    driver: { firstName: string; email: string },
    bookingNumber: string,
    assignmentNumber: string
  ) {
    await this.sendEmail({
      to: driver.email,
      subject: "New Trip Assigned - City Airport Taxis",
      html: getDriverAssignedTemplate(driver, bookingNumber, assignmentNumber),
    });
  }

  async sendAssignmentCancelledEmail(
    driver: { firstName: string; email: string },
    bookingNumber: string,
    assignmentNumber: string
  ) {
    await this.sendEmail({
      to: driver.email,
      subject: "Assignment Cancelled - City Airport Taxis",
      html: getAssignmentCancelledTemplate(driver, bookingNumber, assignmentNumber),
    });
  }

  async sendTripCompletedEmail(
    customer: { firstName: string; email: string },
    bookingNumber: string
  ) {
    await this.sendEmail({
      to: customer.email,
      subject: "Trip Completed - City Airport Taxis",
      html: getTripCompletedTemplate(customer, bookingNumber),
    });
  }

  async pingHealth() {
    const start = Date.now();
    try {
      await this.transporter.verify();
      return { status: "healthy" as const, latencyMs: Date.now() - start };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email provider unreachable";
      return { status: "unhealthy" as const, latencyMs: Date.now() - start, error: message };
    }
  }
}

export default new EmailService();
