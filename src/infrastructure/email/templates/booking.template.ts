import { env } from "@/config/env";
import { escapeHtml } from "@/shared/utils/escape-html";
import type { BookingEmailDetails } from "@/infrastructure/email/utils/booking-email-details";
import { amountInWordsEur } from "@/infrastructure/email/utils/amount-in-words";

const BRAND = "City Airport Taxis";
const COMPANY_ADDRESS = "Brussels Airport, 1930 Zaventem, Belgium";
const COMPANY_VAT = "TVA BE 0791.634.024";
const COMPANY_EMAIL = "info@cityairporttaxis.be";
const COMPANY_PHONE = "+32 2 520 75 26";
const YEAR = new Date().getFullYear();
const SITE_URL = env.FRONTEND_URL;
const ADMIN_URL = env.ADMIN_FRONTEND_URL;
const LOGO_URL =
  "https://www.city-airport-taxis.be/_next/image?url=%2Fassets%2Flogo%2Flogo-white-1.png&w=256&q=75";
const REVIEW_URL =
  process.env.TRUSTPILOT_REVIEW_URL ||
  "https://www.trustpilot.com/review/cityairporttaxis.be";

const styles = `
  body { background: #f4f4f4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; margin: 0; color: #333; }
  .email-wrapper { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #eee; }
  .header { background: #7D3C1F; padding: 32px 20px; text-align: center; color: #fff; }
  .header h1 { font-size: 22px; margin: 0; font-weight: 700; }
  .header p { opacity: 0.85; font-size: 14px; margin: 8px 0 0; }
  .content { padding: 32px 28px; }
  .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #111; }
  .text { font-size: 15px; line-height: 1.6; color: #555; margin-bottom: 24px; }
  .footer { padding: 28px; text-align: center; background: #fafafa; border-top: 1px solid #eee; }
  .muted { font-size: 13px; color: #888; }
  .copy { font-size: 11px; color: #bbb; text-transform: uppercase; letter-spacing: 1px; }
  .highlight { font-size: 18px; font-weight: 700; color: #7D3C1F; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #7D3C1F; margin: 0 0 12px; }
  .details-card { border: 1px solid #eee; border-radius: 10px; overflow: hidden; margin-bottom: 20px; }
  .details-row { display: flex; border-bottom: 1px solid #f0f0f0; }
  .details-row:last-child { border-bottom: 0; }
  .details-label { width: 38%; padding: 12px 14px; background: #fafafa; font-size: 13px; font-weight: 600; color: #666; }
  .details-value { width: 62%; padding: 12px 14px; font-size: 14px; color: #222; }
  .total-row { background: #fdf8f5; }
  .total-row .details-value { font-size: 16px; font-weight: 700; color: #7D3C1F; }
  .cta { display: inline-block; background: #7D3C1F; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
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
      <p class="copy">&copy; ${YEAR} ${BRAND}</p>
    </div>
  </div>
</body>
</html>
`;

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);

const formatDurationLabel = (durationMinutes: number) => {
  if (durationMinutes >= 60 && durationMinutes % 60 === 0) {
    const hours = durationMinutes / 60;
    return `${hours} Hour${hours > 1 ? "s" : ""}`;
  }

  if (durationMinutes >= 60) {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return `${hours} h ${minutes} min`;
  }

  return `${durationMinutes} min`;
};

const detailRow = (label: string, value: string, options?: { total?: boolean }) => `
  <div class="details-row${options?.total ? " total-row" : ""}">
    <div class="details-label">${escapeHtml(label)}</div>
    <div class="details-value">${value}</div>
  </div>
`;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mollie: "Online (Card)",
  pay_onboard: "Pay onboard",
  ideal: "iDEAL",
  creditcard: "Card",
  paypal: "PayPal",
  bancontact: "Bancontact",
};

const formatPaymentMethodLabel = (method: string) =>
  PAYMENT_METHOD_LABELS[method] ?? method;

export const isUnpaidOrPayOnboard = (booking: BookingEmailDetails) =>
  booking.payment.paymentMethod === "pay_onboard" || booking.payment.paymentStatus !== "paid";

const buildBookingDetailsSection = (booking: BookingEmailDetails) => {
  const luggageParts = [
  booking.vehicle.luggage > 0 ? `${booking.vehicle.luggage} checked` : null,
  booking.vehicle.handLuggage > 0 ? `${booking.vehicle.handLuggage} hand` : null,
  booking.vehicle.smallCheckedCase > 0 ? `${booking.vehicle.smallCheckedCase} small case` : null,
  booking.vehicle.largeCheckedCase > 0 ? `${booking.vehicle.largeCheckedCase} large case` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const isPaid = booking.payment.paymentStatus === "paid";
  const totalLabel = isPaid ? "Total paid" : "Total due";

  const rows = [
    detailRow("Booking number", `<span class="highlight">${escapeHtml(booking.bookingNumber)}</span>`),
    detailRow("Trip type", escapeHtml(booking.category)),
    detailRow("Customer", escapeHtml(`${booking.customer.firstName} ${booking.customer.lastName}`)),
    detailRow("Phone", escapeHtml(booking.customer.phone)),
    detailRow("Email", escapeHtml(booking.customer.email)),
    detailRow("Pickup date", escapeHtml(booking.route.pickupDate)),
    detailRow("Pickup time", escapeHtml(booking.route.pickupTime)),
    detailRow("Pickup address", escapeHtml(booking.route.pickupAddress)),
  ];

  if (booking.route.dropoffAddress) {
    rows.push(detailRow("Dropoff address", escapeHtml(booking.route.dropoffAddress)));
  }

  if (typeof booking.route.distance === "number" && booking.route.distance > 0) {
    rows.push(detailRow("Distance", `${escapeHtml(String(booking.route.distance))} km`));
  }

  if (booking.route.durationMinutes) {
    rows.push(
      detailRow("Duration", escapeHtml(formatDurationLabel(booking.route.durationMinutes)))
    );
  }

  if (booking.route.estimatedArrival) {
    rows.push(detailRow("Estimated arrival", escapeHtml(booking.route.estimatedArrival)));
  }

  if (booking.route.airportPickup || booking.flight?.flightNumber) {
    rows.push(detailRow("Airport pickup", "Yes"));
  }

  if (booking.flight?.flightNumber) {
    rows.push(detailRow("Flight number", escapeHtml(booking.flight.flightNumber)));
  }

  if (booking.flight?.terminal) {
    rows.push(detailRow("Terminal", escapeHtml(booking.flight.terminal)));
  }

  rows.push(
    detailRow("Vehicle", escapeHtml(booking.vehicle.categoryName)),
    detailRow("Passengers", escapeHtml(String(booking.vehicle.passengers)))
  );

  if (luggageParts) {
    rows.push(detailRow("Luggage", escapeHtml(luggageParts)));
  }

  rows.push(
    detailRow("Vehicle fare", escapeHtml(formatAmount(booking.pricing.vehicleFare, booking.currency)))
  );

  if (booking.pricing.airportPickupFee > 0) {
    rows.push(
      detailRow(
        "Airport pickup fee",
        escapeHtml(formatAmount(booking.pricing.airportPickupFee, booking.currency))
      )
    );
  }

  rows.push(
    detailRow(totalLabel, escapeHtml(formatAmount(booking.pricing.total, booking.currency)), {
      total: true,
    }),
    detailRow("Payment method", escapeHtml(formatPaymentMethodLabel(booking.payment.paymentMethod))),
    detailRow("Payment status", escapeHtml(booking.payment.paymentStatus))
  );

  if (booking.notes) {
    rows.push(detailRow("Customer notes", escapeHtml(booking.notes)));
  }

  return `
    <p class="section-title">Booking details</p>
    <div class="details-card">
      ${rows.join("")}
    </div>
  `;
};

export const getBookingConfirmedTemplate = (
  customer: { firstName: string },
  booking: BookingEmailDetails
) => {
  const unpaidOrPayOnboard = isUnpaidOrPayOnboard(booking);

  return layout(
    "Booking Confirmed",
    unpaidOrPayOnboard ? "Your journey is confirmed" : "Your journey is confirmed and paid",
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(customer.firstName)},</p>
      <p class="text">
        ${
          unpaidOrPayOnboard
            ? `Thank you for booking with ${BRAND}. Your booking is confirmed. Payment is due onboard / pay later.`
            : `Thank you for booking with ${BRAND}. Your payment was received and your booking is confirmed.`
        }
      </p>
      ${buildBookingDetailsSection(booking)}
      <p class="text">
        We will share driver details closer to your pickup time.
      </p>
      <p class="text muted">
        Manage your booking at <a href="${SITE_URL}">${escapeHtml(SITE_URL)}</a>
      </p>
    </div>
    `
  );
};

export const getAdminBookingConfirmedTemplate = (
  admin: { firstName: string },
  booking: BookingEmailDetails
) => {
  const adminBookingUrl = `${ADMIN_URL}/bookings/${booking.id}`;
  const unpaidOrPayOnboard = isUnpaidOrPayOnboard(booking);

  return layout(
    unpaidOrPayOnboard ? "New Booking (Pay onboard)" : "New Paid Booking",
    unpaidOrPayOnboard
      ? `Booking confirmed — payment due onboard`
      : `Payment received for ${booking.bookingNumber}`,
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(admin.firstName)},</p>
      <p class="text">
        ${
          unpaidOrPayOnboard
            ? "A new booking has been confirmed with payment due onboard. Full details are below."
            : "A new booking has been paid and confirmed. Full details are below."
        }
      </p>
      ${buildBookingDetailsSection(booking)}
      <p class="text">
        <a href="${adminBookingUrl}" class="cta">View booking in admin</a>
      </p>
      <p class="text muted">
        Or open: <a href="${adminBookingUrl}">${escapeHtml(adminBookingUrl)}</a>
      </p>
    </div>
    `
  );
};

const formatReceiptDate = (value?: string) => {
  if (!value) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date());
  }

  const parsed = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const formatTripDateLong = (dateValue: string, timeValue: string) => {
  const timePart = (timeValue || "").slice(0, 5);
  const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? new Date(`${dateValue}T${timePart || "12:00"}:00`)
    : new Date(dateValue);

  if (Number.isNaN(isoCandidate.getTime())) {
    return `${dateValue}${timePart ? ` at ${timePart}` : ""}`;
  }

  const datePart = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(isoCandidate);

  return timePart ? `${datePart} at ${timePart}` : datePart;
};

const buildFormalPaymentReceiptHtml = (
  recipient: { firstName: string },
  booking: BookingEmailDetails,
  options?: { includeReviewCta?: boolean }
) => {
  const total = Number(booking.pricing.total ?? 0);
  const isPaid = booking.payment.paymentStatus === "paid";
  const amountReceived = isPaid ? total : 0;
  const balanceDue = isPaid ? 0 : total;
  const amountFormatted = formatAmount(total, booking.currency);
  const receivedFormatted = formatAmount(amountReceived, booking.currency);
  const balanceFormatted = formatAmount(balanceDue, booking.currency);
  const paymentMethod = formatPaymentMethodLabel(booking.payment.paymentMethod);
  const issuedTo = `${booking.customer.firstName} ${booking.customer.lastName}`.trim();
  const receiptDate = formatReceiptDate(booking.route.pickupDate);
  const tripWhen = formatTripDateLong(booking.route.pickupDate, booking.route.pickupTime);
  const flightBits = [
    booking.flight?.flightNumber ? `with ${booking.flight.flightNumber}` : null,
    booking.flight?.terminal ? `(terminal ${booking.flight.terminal})` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const hasFlightDetails =
    booking.route.airportPickup ||
    Boolean(booking.flight?.flightNumber) ||
    Boolean(booking.flight?.terminal);
  const routeLine = booking.route.dropoffAddress
    ? `${booking.route.pickupAddress} to ${booking.route.dropoffAddress}`
    : booking.route.pickupAddress;
  const words = amountInWordsEur(total);
  const includeReviewCta = options?.includeReviewCta !== false;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - ${escapeHtml(booking.bookingNumber)}</title>
</head>
<body style="margin:0;padding:24px 12px;background:#eef0f3;font-family:Helvetica,Arial,sans-serif;color:#222;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #d9dce1;">
    <tr>
      <td style="padding:28px 28px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="top" style="padding-right:16px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:28px;font-weight:700;color:#111;line-height:1.2;padding-right:10px;">Payment Receipt</td>
                  <td style="width:28px;height:10px;background:#e67e22;border-radius:4px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-size:14px;color:#333;line-height:1.6;">
                <strong>Payment Receipt No:</strong> ${escapeHtml(booking.bookingNumber)}<br />
                <strong>Receipt Date:</strong> ${escapeHtml(receiptDate)}
              </p>
            </td>
            <td valign="top" align="right" width="220">
              <table role="presentation" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:4px;">
                <tr>
                  <td style="padding:14px 16px;text-align:center;">
                    <img src="${escapeHtml(LOGO_URL)}" alt="${escapeHtml(BRAND)}" width="180" style="display:block;max-width:180px;height:auto;border:0;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 28px 0;font-size:14px;color:#555;">
        Hi ${escapeHtml(recipient.firstName)}, this is your payment receipt for booking
        <strong>${escapeHtml(booking.bookingNumber)}</strong>.
      </td>
    </tr>
    <tr>
      <td style="padding:20px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="48%" valign="top" style="border:1px solid #d9dce1;padding:14px 16px;background:#fafafa;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6b3fa0;text-transform:uppercase;letter-spacing:0.03em;">Issued by</p>
              <p style="margin:0;font-size:14px;line-height:1.55;color:#222;">
                <strong>${escapeHtml(BRAND.toUpperCase())}</strong><br />
                ${escapeHtml(COMPANY_ADDRESS)}<br />
                VAT Number: ${escapeHtml(COMPANY_VAT)}<br />
                ${escapeHtml(COMPANY_EMAIL)} · ${escapeHtml(COMPANY_PHONE)}
              </p>
            </td>
            <td width="4%" style="font-size:0;line-height:0;">&nbsp;</td>
            <td width="48%" valign="top" style="border:1px solid #d9dce1;padding:14px 16px;background:#fafafa;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6b3fa0;text-transform:uppercase;letter-spacing:0.03em;">Issued to</p>
              <p style="margin:0;font-size:14px;line-height:1.55;color:#222;">
                <strong>${escapeHtml(issuedTo.toUpperCase())}</strong><br />
                ${escapeHtml(booking.customer.email)}<br />
                ${escapeHtml(booking.customer.phone)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 28px 20px;">
        <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#111;">Payment Summary</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d9dce1;border-collapse:collapse;">
          <tr>
            <td style="padding:12px 14px;border-bottom:1px solid #d9dce1;font-size:13px;font-weight:700;color:#444;background:#f7f7f8;">Payment Method</td>
            <td style="padding:12px 14px;border-bottom:1px solid #d9dce1;font-size:13px;font-weight:700;color:#444;background:#f7f7f8;text-align:right;">Amount Received</td>
          </tr>
          <tr>
            <td style="padding:12px 14px;border-bottom:1px solid #eceef1;font-size:14px;color:#222;">${escapeHtml(paymentMethod)}</td>
            <td style="padding:12px 14px;border-bottom:1px solid #eceef1;font-size:14px;color:#222;text-align:right;">${escapeHtml(receivedFormatted)}</td>
          </tr>
          <tr>
            <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#111;">Total</td>
            <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#111;text-align:right;">${escapeHtml(amountFormatted)}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="top" style="padding-right:16px;">
              <p style="margin:0 0 4px;font-size:12px;color:#888;">Total amount (in words)</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#111;">${escapeHtml(words)}</p>
            </td>
            <td valign="top" align="right" style="white-space:nowrap;">
              <p style="margin:0 0 6px;font-size:13px;color:#444;">Total Amount Received: <strong>${escapeHtml(receivedFormatted)}</strong></p>
              <p style="margin:0 0 10px;font-size:13px;color:#444;">Balance Due: <strong>${escapeHtml(balanceFormatted)}</strong></p>
              <p style="margin:0;font-size:18px;font-weight:700;color:#111;border-bottom:3px double #111;display:inline-block;padding-bottom:4px;">
                Total Amount: ${escapeHtml(amountFormatted)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px 12px;font-size:14px;line-height:1.7;color:#222;">
        ${escapeHtml(tripWhen)}${flightBits ? ` ${escapeHtml(flightBits)}` : ""}.<br />
        Route: ${escapeHtml(routeLine)}
      </td>
    </tr>
    ${
      hasFlightDetails
        ? `<tr>
      <td style="padding:0 28px 28px;">
        <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111;">Flight details</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d9dce1;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #eceef1;font-size:13px;color:#666;width:40%;">Airport pickup</td>
            <td style="padding:10px 14px;border-bottom:1px solid #eceef1;font-size:14px;color:#222;">Yes</td>
          </tr>
          ${
            booking.flight?.flightNumber
              ? `<tr>
            <td style="padding:10px 14px;border-bottom:1px solid #eceef1;font-size:13px;color:#666;">Flight number</td>
            <td style="padding:10px 14px;border-bottom:1px solid #eceef1;font-size:14px;color:#222;font-weight:700;">${escapeHtml(booking.flight.flightNumber)}</td>
          </tr>`
              : ""
          }
          ${
            booking.flight?.terminal
              ? `<tr>
            <td style="padding:10px 14px;font-size:13px;color:#666;">Terminal</td>
            <td style="padding:10px 14px;font-size:14px;color:#222;">${escapeHtml(booking.flight.terminal)}</td>
          </tr>`
              : ""
          }
        </table>
      </td>
    </tr>`
        : ""
    }
    ${
      includeReviewCta
        ? `<tr>
      <td style="padding:0 28px 28px;text-align:center;">
        <p style="margin:0 0 14px;font-size:14px;color:#555;">Thank you for choosing ${escapeHtml(BRAND)}. We would love your feedback.</p>
        <a href="${escapeHtml(REVIEW_URL)}" style="display:inline-block;background:#7D3C1F;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Leave a review</a>
      </td>
    </tr>`
        : ""
    }
    <tr>
      <td style="padding:18px 28px;background:#fafafa;border-top:1px solid #eceef1;text-align:center;font-size:12px;color:#888;">
        ${escapeHtml(BRAND)} · <a href="${SITE_URL}" style="color:#7D3C1F;text-decoration:none;">${escapeHtml(SITE_URL)}</a><br />
        &copy; ${YEAR} ${escapeHtml(BRAND)}
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const getPaymentReceiptTemplate = (
  customer: { firstName: string },
  booking: BookingEmailDetails
) => buildFormalPaymentReceiptHtml(customer, booking, { includeReviewCta: false });

export const getBookingReceivedTemplate = (
  customer: { firstName: string },
  bookingNumber: string,
  total: number,
  currency: string
) =>
  layout(
    "Booking Received",
    "Complete payment to confirm",
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(customer.firstName)},</p>
      <p class="text">
        We have received your booking request. Please complete payment to confirm your journey.
      </p>
      <p class="text">
        Reference:<br />
        <span class="highlight">${escapeHtml(bookingNumber)}</span>
      </p>
      <p class="text">
        Amount due: <strong>${escapeHtml(formatAmount(total, currency))}</strong>
      </p>
      <p class="text muted">
        If you have already paid, you will receive a confirmation email shortly.
      </p>
    </div>
    `
  );

export const getBookingCancelledTemplate = (
  customer: { firstName: string },
  bookingNumber: string
) =>
  layout(
    "Booking Cancelled",
    "Your booking has been cancelled",
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(customer.firstName)},</p>
      <p class="text">
        Your booking <span class="highlight">${escapeHtml(bookingNumber)}</span> has been cancelled.
      </p>
      <p class="text">
        If you did not request this cancellation or need assistance, please contact our support team.
      </p>
      <p class="text muted">
        Visit <a href="${SITE_URL}">${escapeHtml(SITE_URL)}</a> to make a new booking.
      </p>
    </div>
    `
  );

export const getBookingUpdatedTemplate = (
  customer: { firstName: string },
  booking: BookingEmailDetails
) =>
  layout(
    "Booking Updated",
    "Your booking details have changed",
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(customer.firstName)},</p>
      <p class="text">
        Your booking <span class="highlight">${escapeHtml(booking.bookingNumber)}</span> has been updated.
        Please review the latest details below.
      </p>
      ${buildBookingDetailsSection(booking)}
      <p class="text muted">
        If anything looks incorrect, contact us or manage your booking at
        <a href="${SITE_URL}">${escapeHtml(SITE_URL)}</a>.
      </p>
    </div>
    `
  );

export const getTripCompletedTemplate = (
  recipient: { firstName: string },
  booking: BookingEmailDetails,
  options?: { includeReviewCta?: boolean }
) => buildFormalPaymentReceiptHtml(recipient, booking, options);

export type TripStatusEmailStep =
  | "accepted"
  | "arrived"
  | "passenger_onboard"
  | "started"
  | "completed";

const TRIP_STATUS_COPY: Record<
  TripStatusEmailStep,
  { title: string; subtitle: string; customerMessage: string; adminMessage: string }
> = {
  accepted: {
    title: "Driver Accepted",
    subtitle: "Your driver has accepted the trip",
    customerMessage:
      "Your driver has accepted the booking and is preparing for your pickup. Full booking details are below.",
    adminMessage: "A driver has accepted this booking. Full details are below.",
  },
  arrived: {
    title: "Driver Arrived",
    subtitle: "Your driver is at the pickup location",
    customerMessage:
      "Your driver has arrived at the pickup location. Please make your way to the vehicle when ready.",
    adminMessage: "The driver has marked arrived for this booking.",
  },
  passenger_onboard: {
    title: "Passenger Onboard",
    subtitle: "You are onboard",
    customerMessage: "You are onboard. We hope you have a comfortable journey.",
    adminMessage: "The passenger has been marked onboard for this booking.",
  },
  started: {
    title: "Trip Started",
    subtitle: "Your journey is underway",
    customerMessage: "Your trip has started. Sit back and enjoy the ride.",
    adminMessage: "The driver has started the trip for this booking.",
  },
  completed: {
    title: "Trip Completed",
    subtitle: "Journey finished",
    customerMessage: "Your trip has been completed. Thank you for travelling with us.",
    adminMessage: "This trip has been marked complete. Full booking details are below.",
  },
};

export const getCustomerTripStatusTemplate = (
  customer: { firstName: string },
  booking: BookingEmailDetails,
  step: TripStatusEmailStep
) => {
  const copy = TRIP_STATUS_COPY[step];

  return layout(
    copy.title,
    copy.subtitle,
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(customer.firstName)},</p>
      <p class="text">
        Update for booking <span class="highlight">${escapeHtml(booking.bookingNumber)}</span>:
        ${escapeHtml(copy.customerMessage)}
      </p>
      ${buildBookingDetailsSection(booking)}
      <p class="text muted">
        Visit <a href="${SITE_URL}">${escapeHtml(SITE_URL)}</a> if you need help with your booking.
      </p>
    </div>
    `
  );
};

export const getAdminTripStatusTemplate = (
  admin: { firstName: string },
  booking: BookingEmailDetails,
  step: TripStatusEmailStep
) => {
  const copy = TRIP_STATUS_COPY[step];
  const adminBookingUrl = `${ADMIN_URL}/bookings/${booking.id}`;

  return layout(
    copy.title,
    `${copy.title} · ${booking.bookingNumber}`,
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(admin.firstName)},</p>
      <p class="text">
        ${escapeHtml(copy.adminMessage)}
      </p>
      ${buildBookingDetailsSection(booking)}
      <p class="text">
        <a href="${adminBookingUrl}" class="cta">View booking in admin</a>
      </p>
      <p class="text muted">
        Or open: <a href="${adminBookingUrl}">${escapeHtml(adminBookingUrl)}</a>
      </p>
    </div>
    `
  );
};
