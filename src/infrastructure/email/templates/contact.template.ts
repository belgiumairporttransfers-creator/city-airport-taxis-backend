import { escapeHtml } from "@/shared/utils/escape-html";
import type { SubmitContactData } from "@/modules/contact/types/contact.types";

const BRAND = "City Airport Taxis";
const YEAR = new Date().getFullYear();

const layout = (title: string, body: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;padding:20px;margin:0;color:#333;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
    <div style="background:#111;padding:28px 20px;text-align:center;color:#fff;">
      <h1 style="font-size:22px;margin:0;font-weight:700;">${escapeHtml(title)}</h1>
    </div>
    ${body}
    <div style="padding:24px;text-align:center;background:#fafafa;border-top:1px solid #eee;">
      <p style="font-size:13px;color:#888;margin:0;">${BRAND}</p>
      <p style="font-size:11px;color:#bbb;text-transform:uppercase;letter-spacing:1px;margin:8px 0 0;">© ${YEAR} ${BRAND}</p>
    </div>
  </div>
</body>
</html>
`;

export const getContactFormAdminTemplate = (contact: SubmitContactData) => {
  const fullName = `${contact.firstName} ${contact.lastName}`.trim();

  return layout(
    "New Contact Form Submission",
    `
    <div style="padding:28px;">
      <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 20px;">
        You received a new message from the contact form.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#888;width:120px;">Name</td><td style="padding:8px 0;color:#111;font-weight:600;">${escapeHtml(fullName)}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Email</td><td style="padding:8px 0;color:#111;">${escapeHtml(contact.email)}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Phone</td><td style="padding:8px 0;color:#111;">${escapeHtml(contact.phone)}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Subject</td><td style="padding:8px 0;color:#111;">${escapeHtml(contact.subject)}</td></tr>
      </table>
      <div style="margin-top:20px;padding:16px;background:#f8f8f8;border-radius:8px;">
        <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Message</p>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#333;white-space:pre-wrap;">${escapeHtml(contact.message)}</p>
      </div>
    </div>
    `
  );
};

export const getContactFormConfirmationTemplate = (contact: {
  firstName: string;
}) =>
  layout(
    "Message Received",
    `
    <div style="padding:28px;">
      <p style="font-size:16px;font-weight:600;color:#111;margin:0 0 12px;">Hi ${escapeHtml(contact.firstName)},</p>
      <p style="font-size:15px;line-height:1.6;color:#555;margin:0;">
        Thank you for contacting ${BRAND}. We have received your message and our team will get back to you shortly.
      </p>
    </div>
    `
  );
