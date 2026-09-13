import { env } from "@/config/env";
import { escapeHtml } from "@/shared/utils/escape-html";
import type { BookingEmailDetails } from "@/infrastructure/email/utils/booking-email-details";

const BRAND = "City Airport Taxis";
const YEAR = new Date().getFullYear();
const SITE_URL = env.FRONTEND_URL;
const ADMIN_URL = env.ADMIN_FRONTEND_URL;
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

  if (booking.route.airportPickup) {
    rows.push(detailRow("Airport pickup", "Yes"));
  }

  rows.push(
    detailRow("Vehicle", escapeHtml(booking.vehicle.categoryName)),
    detailRow("Passengers", escapeHtml(String(booking.vehicle.passengers)))
  );

  if (luggageParts) {
    rows.push(detailRow("Luggage", escapeHtml(luggageParts)));
  }

  if (booking.flight?.flightNumber) {
    rows.push(detailRow("Flight number", escapeHtml(booking.flight.flightNumber)));
  }

  if (booking.flight?.terminal) {
    rows.push(detailRow("Terminal", escapeHtml(booking.flight.terminal)));
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

export const getPaymentReceiptTemplate = (
  customer: { firstName: string },
  booking: BookingEmailDetails
) =>
  layout(
    "Payment Receipt",
    `Payment received for ${booking.bookingNumber}`,
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(customer.firstName)},</p>
      <p class="text">
        This is your payment receipt for booking
        <span class="highlight">${escapeHtml(booking.bookingNumber)}</span>.
        Thank you for travelling with ${BRAND}.
      </p>
      ${buildBookingDetailsSection(booking)}
      <p class="text muted">
        Book again anytime at <a href="${SITE_URL}">${escapeHtml(SITE_URL)}</a>.
      </p>
    </div>
    `
  );

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
  customer: { firstName: string },
  booking: BookingEmailDetails
) =>
  layout(
    "Trip Completed",
    "Thank you for travelling with us",
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(customer.firstName)},</p>
      <p class="text">
        Your trip for booking <span class="highlight">${escapeHtml(booking.bookingNumber)}</span> has been completed.
      </p>
      <p class="text">
        Thank you for choosing ${BRAND}. We hope you had a pleasant journey.
        We would love to hear about your experience — your review helps other travellers and our drivers.
      </p>
      <p class="text" style="text-align:center;margin:28px 0;">
        <a href="${escapeHtml(REVIEW_URL)}" class="cta">Leave a review</a>
      </p>
      <p class="text muted" style="text-align:center;">
        Or open: <a href="${escapeHtml(REVIEW_URL)}">${escapeHtml(REVIEW_URL)}</a>
      </p>
      ${buildBookingDetailsSection(booking)}
      <p class="text muted">
        Book again anytime at <a href="${SITE_URL}">${escapeHtml(SITE_URL)}</a>.
      </p>
    </div>
    `
  );

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
