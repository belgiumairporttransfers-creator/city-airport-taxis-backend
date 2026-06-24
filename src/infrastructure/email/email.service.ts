import nodemailer from "nodemailer";
import { env } from "@/config/env";
import logger from "@/shared/utils/logger";
import {
  getForgotPasswordEmailTemplate,
  getAdminForgotPasswordEmailTemplate,
  getEmailVerificationTemplate,
} from "@/infrastructure/email/templates/user-auth.template";
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

  async pingHealth(): Promise<{
    status: "healthy" | "unhealthy";
    latencyMs?: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      await this.transporter.verify();
      return { status: "healthy", latencyMs: Date.now() - start };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email provider unreachable";
      return { status: "unhealthy", latencyMs: Date.now() - start, error: message };
    }
  }
}

export default new EmailService();
