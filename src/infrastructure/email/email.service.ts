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
