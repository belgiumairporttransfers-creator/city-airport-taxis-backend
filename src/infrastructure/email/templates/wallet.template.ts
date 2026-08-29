import { env } from "@/config/env";
import { escapeHtml } from "@/shared/utils/escape-html";

const BRAND = "City Airport Taxis";
const YEAR = new Date().getFullYear();
const DRIVER_PORTAL_URL = env.DRIVER_PORTAL_URL || env.FRONTEND_URL;

const styles = `
  body { background: #f4f4f4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; margin: 0; color: #333; }
  .email-wrapper { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #eee; }
  .header { background: #7D3C1F; padding: 32px 20px; text-align: center; color: #fff; }
  .header h1 { font-size: 22px; margin: 0; font-weight: 700; }
  .content { padding: 32px 28px; }
  .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #111; }
  .text { font-size: 15px; line-height: 1.6; color: #555; margin-bottom: 24px; }
  .footer { padding: 28px; text-align: center; background: #fafafa; border-top: 1px solid #eee; }
  .highlight { font-size: 18px; font-weight: 700; color: #7D3C1F; }
  .cta { display:inline-block;background:#7D3C1F;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600; }
`;

const layout = (title: string, body: string) => `
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
    <div class="header"><h1>${escapeHtml(title)}</h1></div>
    ${body}
    <div class="footer"><p>&copy; ${YEAR} ${BRAND}</p></div>
  </div>
</body>
</html>
`;

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }).format(amount);

const walletUrl = `${DRIVER_PORTAL_URL}/wallet`;

export const getDriverPayoutRequestedTemplate = (
  driver: { firstName: string },
  details: { amount: number; note?: string }
) =>
  layout(
    "Payout Request Received",
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">
        We received your payout request for
        <span class="highlight">${escapeHtml(formatAmount(details.amount))}</span>.
      </p>
      ${
        details.note
          ? `<p class="text">Your note: ${escapeHtml(details.note)}</p>`
          : ""
      }
      <p class="text">
        An admin will review it shortly. You will get another email when it is approved or rejected.
      </p>
      <p class="text">
        <a href="${walletUrl}" class="cta">View Wallet</a>
      </p>
    </div>
    `
  );

export const getDriverPayoutApprovedTemplate = (
  driver: { firstName: string },
  details: { amount: number }
) =>
  layout(
    "Payout Approved",
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">
        Your payout of
        <span class="highlight">${escapeHtml(formatAmount(details.amount))}</span>
        has been approved.
      </p>
      <p class="text">
        The amount has been deducted from your available wallet balance. Check your wallet for the latest totals.
      </p>
      <p class="text">
        <a href="${walletUrl}" class="cta">View Wallet</a>
      </p>
    </div>
    `
  );

export const getDriverPayoutRejectedTemplate = (
  driver: { firstName: string },
  details: { amount: number; adminNotes?: string }
) =>
  layout(
    "Payout Rejected",
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">
        Your payout request for
        <span class="highlight">${escapeHtml(formatAmount(details.amount))}</span>
        was rejected.
      </p>
      ${
        details.adminNotes
          ? `<p class="text">Admin note: ${escapeHtml(details.adminNotes)}</p>`
          : ""
      }
      <p class="text">
        Your wallet balance was not changed. You can submit a new payout request from your wallet.
      </p>
      <p class="text">
        <a href="${walletUrl}" class="cta">View Wallet</a>
      </p>
    </div>
    `
  );
