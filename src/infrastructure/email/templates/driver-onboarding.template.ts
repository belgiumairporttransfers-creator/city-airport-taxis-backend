import { env } from "@/config/env";
import { escapeHtml } from "@/shared/utils/escape-html";

const BRAND = "City Airport Taxis";
const YEAR = new Date().getFullYear();
const PORTAL_URL = env.DRIVER_PORTAL_URL || env.FRONTEND_URL;

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
  <title>${escapeHtml(title)}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(subtitle)}</p>
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

type DriverEmailRecipient = {
  firstName: string;
  email: string;
};

export const getDriverApplicationReceivedTemplate = (
  driver: DriverEmailRecipient,
  applicationNumber: string
) =>
  layout(
    "Application received",
    BRAND,
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">
        Thank you for applying to drive with ${BRAND}. We have received your application
        <strong>${escapeHtml(applicationNumber)}</strong> and our team will review it shortly.
      </p>
      <p class="text muted" style="margin-bottom:0;">
        You can check your application status at any time using your application number.
      </p>
    </div>
    `
  );

export const getDriverApplicationUnderReviewTemplate = (
  driver: DriverEmailRecipient,
  applicationNumber: string
) =>
  layout(
    "Application under review",
    BRAND,
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">
        Your driver application <strong>${escapeHtml(applicationNumber)}</strong> is now under review by our onboarding team.
      </p>
      <p class="text muted" style="margin-bottom:0;">We will notify you once a decision has been made.</p>
    </div>
    `
  );

export const getDriverChangesRequestedTemplate = (
  driver: DriverEmailRecipient,
  applicationNumber: string,
  reviewNotes: string
) =>
  layout(
    "Changes requested",
    BRAND,
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">
        We need additional information for application <strong>${escapeHtml(applicationNumber)}</strong> before we can continue.
      </p>
      <p class="text"><strong>Notes from our team:</strong><br>${escapeHtml(reviewNotes)}</p>
      <p class="text muted" style="margin-bottom:0;">
        Please update your documents and resubmit your application using your application number.
      </p>
    </div>
    `
  );

export const getDriverApplicationResubmittedTemplate = (
  driver: DriverEmailRecipient,
  applicationNumber: string
) =>
  layout(
    "Application resubmitted",
    BRAND,
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">
        We have received your updated documents for application
        <strong>${escapeHtml(applicationNumber)}</strong>. Our team will review your resubmission shortly.
      </p>
      <p class="text muted" style="margin-bottom:0;">
        You can check your application status at any time using your application number.
      </p>
    </div>
    `
  );

export const getDriverApplicationApprovedTemplate = (
  driver: DriverEmailRecipient,
  setupToken: string
) => {
  const link = `${PORTAL_URL}/auth/set-password?token=${setupToken}&email=${encodeURIComponent(driver.email)}`;

  return layout(
    "Application approved",
    BRAND,
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">
        Congratulations! Your driver application has been approved. Set your password to access the driver portal.
      </p>
      <p style="text-align:center; margin-bottom: 24px;">
        <a href="${link}" class="btn">Set password</a>
      </p>
      <p class="text muted" style="margin-bottom:0;">This link expires in 24 hours.<br>${escapeHtml(link)}</p>
    </div>
    `
  );
};

export const getDriverApplicationRejectedTemplate = (
  driver: DriverEmailRecipient,
  applicationNumber: string,
  reviewNotes?: string
) =>
  layout(
    "Application update",
    BRAND,
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">
        Thank you for your interest in driving with ${BRAND}. After reviewing application
        <strong>${escapeHtml(applicationNumber)}</strong>, we are unable to proceed at this time.
      </p>
      ${reviewNotes ? `<p class="text"><strong>Notes:</strong><br>${escapeHtml(reviewNotes)}</p>` : ""}
      <p class="text muted" style="margin-bottom:0;">If you have questions, please contact our support team.</p>
    </div>
    `
  );

export const getDriverSuspendedTemplate = (
  driver: DriverEmailRecipient,
  applicationNumber: string,
  reviewNotes?: string
) =>
  layout(
    "Account suspended",
    BRAND,
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">
        Your driver account associated with application
        <strong>${escapeHtml(applicationNumber)}</strong> has been suspended.
      </p>
      ${reviewNotes ? `<p class="text"><strong>Notes:</strong><br>${escapeHtml(reviewNotes)}</p>` : ""}
      <p class="text muted" style="margin-bottom:0;">Please contact our support team if you have questions.</p>
    </div>
    `
  );
