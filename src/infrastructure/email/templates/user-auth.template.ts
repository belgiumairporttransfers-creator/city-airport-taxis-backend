import type { IUser } from "@/modules/auth/types/user.types";
import type { IAdmin } from "@/modules/auth/types/admin.types";
import { env } from "@/config/env";

const BRAND = "City Airport Taxis";
const YEAR = new Date().getFullYear();

const styles = `
  body { background: #f4f4f4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; margin: 0; color: #333; }
  .email-wrapper { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #eee; }
  .header { background: #7D3C1F; padding: 32px 20px; text-align: center; color: #fff; }
  .header h1 { font-size: 22px; margin: 0; font-weight: 700; }
  .header p { opacity: 0.85; font-size: 14px; margin: 8px 0 0; }
  .content { padding: 32px 28px; }
  .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #111; }
  .text { font-size: 15px; line-height: 1.6; color: #555; margin-bottom: 24px; }
  .footer { padding: 28px; text-align: center; background: #fafafa; border-top: 1px solid #eee; }
  .btn { display: inline-block; background: #7D3C1F; color: #fff !important; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 28px; border-radius: 6px; text-transform: uppercase; }
  .muted { font-size: 13px; color: #888; }
  .copy { font-size: 11px; color: #bbb; text-transform: uppercase; letter-spacing: 1px; }
`;

const layout = (title: string, subtitle: string, body: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
    ${body}
    <div class="footer">
      <p class="muted">${BRAND}</p>
      <p class="copy">© ${YEAR} ${BRAND}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const getEmailVerificationTemplate = (user: IUser, verificationToken: string) => {
  const link = `${env.FRONTEND_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

  return layout(
    "Verify your email",
    BRAND,
    `
    <div class="content">
      <p class="greeting">Hi ${user.firstName},</p>
      <p class="text">Please confirm your email to activate your ${BRAND} account.</p>
      <p style="text-align:center; margin-bottom: 24px;">
        <a href="${link}" class="btn">Verify email</a>
      </p>
      <p class="text muted" style="margin-bottom:0;">Link expires in 24 hours.<br>${link}</p>
    </div>
    `
  );
};

export const getForgotPasswordEmailTemplate = (user: IUser, resetToken: string) => {
  const link = `${env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

  return layout(
    "Reset your password",
    BRAND,
    `
    <div class="content">
      <p class="greeting">Hi ${user.firstName},</p>
      <p class="text">
        We received a request to reset your password. If you did not request this, you can ignore this email.
      </p>
      <p style="text-align:center; margin-bottom: 24px;">
        <a href="${link}" class="btn">Reset password</a>
      </p>
      <p class="text muted" style="margin-bottom:0;">Link expires in 1 hour.<br>${link}</p>
    </div>
    `
  );
};

export const getAdminForgotPasswordEmailTemplate = (admin: IAdmin, resetToken: string) => {
  const link = `${env.ADMIN_FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(admin.email)}`;

  return layout(
    "Admin password reset",
    `${BRAND} Admin`,
    `
    <div class="content">
      <p class="greeting">Hi ${admin.firstName},</p>
      <p class="text">Use the link below to reset your admin password. It expires in 1 hour.</p>
      <p style="text-align:center; margin-bottom: 24px;">
        <a href="${link}" class="btn">Reset password</a>
      </p>
      <p class="text muted" style="margin-bottom:0;">${link}</p>
    </div>
    `
  );
};
