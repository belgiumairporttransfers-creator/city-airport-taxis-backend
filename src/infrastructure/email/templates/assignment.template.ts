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

export const getDriverAssignedTemplate = (
  driver: { firstName: string },
  details: {
    assignmentId: string;
    assignmentNumber: string;
    bookingNumber: string;
    category?: string;
    route?: {
      pickupAddress: string;
      dropoffAddress?: string;
      pickupDate: string;
      pickupTime: string;
      durationMinutes?: number;
    };
    vehicle?: {
      categoryName: string;
    };
    pricing?: {
      driverEarning: number;
    };
  }
) => {
  const assignmentUrl = `${DRIVER_PORTAL_URL}/assignments/${details.assignmentId}`;
  const dropoffAddress = details.route?.dropoffAddress?.trim();
  const durationMinutes = details.route?.durationMinutes;

  const detailLines = [
    `Booking: <span class="highlight">${escapeHtml(details.bookingNumber)}</span>`,
    `Assignment: <span class="highlight">${escapeHtml(details.assignmentNumber)}</span>`,
    details.category ? `Trip type: ${escapeHtml(details.category)}` : null,
    details.route
      ? `Pickup: <strong>${escapeHtml(details.route.pickupDate)} ${escapeHtml(details.route.pickupTime)}</strong>`
      : null,
    details.route ? `From: ${escapeHtml(details.route.pickupAddress)}` : null,
    dropoffAddress ? `To: ${escapeHtml(dropoffAddress)}` : null,
    durationMinutes
      ? `Duration: ${escapeHtml(formatDurationLabel(durationMinutes))}`
      : null,
    details.vehicle ? `Vehicle: ${escapeHtml(details.vehicle.categoryName)}` : null,
    details.pricing
      ? `Your earning: <span class="highlight">${escapeHtml(formatAmount(details.pricing.driverEarning))}</span>`
      : null,
  ]
    .filter(Boolean)
    .join("<br />");

  return layout(
    "New Trip Assigned",
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">You have been assigned a new trip. Review the details below and accept it from your driver portal.</p>
      <p class="text">
        ${detailLines}
      </p>
      <p class="text">
        <a href="${assignmentUrl}" style="display:inline-block;background:#7D3C1F;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          View &amp; Accept Assignment
        </a>
      </p>
      <p class="text muted">If the button does not work, open: <a href="${assignmentUrl}">${escapeHtml(assignmentUrl)}</a></p>
    </div>
    `
  );
};

type DriverNewBookingDetails = {
  id: string;
  bookingNumber: string;
  category?: string;
  route: {
    pickupAddress: string;
    dropoffAddress?: string;
    pickupDate: string;
    pickupTime: string;
    durationMinutes?: number;
  };
  vehicle: {
    categoryName: string;
  };
  pricing: {
    driverEarning: number;
  };
};

export const getDriverNewBookingAvailableTemplate = (
  driver: { firstName: string },
  booking: DriverNewBookingDetails
) => {
  const bookingUrl = `${DRIVER_PORTAL_URL}/bookings/${booking.id}`;
  const dropoffAddress = booking.route.dropoffAddress?.trim();
  const durationMinutes = booking.route.durationMinutes;

  const detailLines = [
    `Booking: <span class="highlight">${escapeHtml(booking.bookingNumber)}</span>`,
    booking.category ? `Trip type: ${escapeHtml(booking.category)}` : null,
    `Pickup: <strong>${escapeHtml(booking.route.pickupDate)} ${escapeHtml(booking.route.pickupTime)}</strong>`,
    `From: ${escapeHtml(booking.route.pickupAddress)}`,
    dropoffAddress ? `To: ${escapeHtml(dropoffAddress)}` : null,
    durationMinutes
      ? `Duration: ${escapeHtml(formatDurationLabel(durationMinutes))}`
      : null,
    `Vehicle: ${escapeHtml(booking.vehicle.categoryName)}`,
    `Your earning: <span class="highlight">${escapeHtml(formatAmount(booking.pricing.driverEarning))}</span>`,
  ]
    .filter(Boolean)
    .join("<br />");

  return layout(
    "New Booking Available",
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">A new paid booking is available. Review the details below and accept it from your driver portal.</p>
      <p class="text">
        ${detailLines}
      </p>
      <p class="text">
        <a href="${bookingUrl}" style="display:inline-block;background:#7D3C1F;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          View &amp; Accept Booking
        </a>
      </p>
      <p class="text muted">If the button does not work, open: <a href="${bookingUrl}">${escapeHtml(bookingUrl)}</a></p>
    </div>
    `
  );
};

export const getDriverTripEarningTemplate = (
  driver: { firstName: string },
  bookingNumber: string,
  pricing: {
    driverEarning: number;
  }
) => {
  const walletUrl = `${DRIVER_PORTAL_URL}/wallet`;

  return layout(
    "Trip Completed - Earning Added",
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">You completed booking <span class="highlight">${escapeHtml(bookingNumber)}</span>. Your wallet has been credited.</p>
      <p class="text">
        Amount added: <span class="highlight">${escapeHtml(formatAmount(pricing.driverEarning))}</span>
      </p>
      <p class="text">
        <a href="${walletUrl}" style="display:inline-block;background:#7D3C1F;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          View Wallet
        </a>
      </p>
    </div>
    `
  );
};

export const getAssignmentCancelledTemplate = (
  driver: { firstName: string },
  bookingNumber: string,
  assignmentNumber: string
) =>
  layout(
    "Assignment Cancelled",
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">
        Assignment <span class="highlight">${escapeHtml(assignmentNumber)}</span> for booking
        <span class="highlight">${escapeHtml(bookingNumber)}</span> has been cancelled.
      </p>
    </div>
    `
  );

export const getDriverBookingUpdatedTemplate = (
  driver: { firstName: string },
  booking: {
    bookingNumber: string;
    route: {
      pickupAddress: string;
      dropoffAddress?: string;
      pickupDate: string;
      pickupTime: string;
    };
    vehicle: {
      categoryName: string;
      passengers: number;
    };
    notes?: string;
  }
) =>
  layout(
    "Booking Updated",
    `
    <div class="content">
      <p class="greeting">Hi ${escapeHtml(driver.firstName)},</p>
      <p class="text">
        An accepted booking has been updated. Please review the latest details.
      </p>
      <p class="text">
        Booking: <span class="highlight">${escapeHtml(booking.bookingNumber)}</span><br />
        Vehicle: ${escapeHtml(booking.vehicle.categoryName)}<br />
        Passengers: ${escapeHtml(String(booking.vehicle.passengers))}<br />
        Pickup: ${escapeHtml(booking.route.pickupDate)} ${escapeHtml(booking.route.pickupTime)}<br />
        From: ${escapeHtml(booking.route.pickupAddress)}
        ${
          booking.route.dropoffAddress
            ? `<br />To: ${escapeHtml(booking.route.dropoffAddress)}`
            : ""
        }
        ${booking.notes ? `<br />Notes: ${escapeHtml(booking.notes)}` : ""}
      </p>
      <p class="text">Open your driver portal for the full trip details.</p>
      <p class="text"><a href="${DRIVER_PORTAL_URL}">${escapeHtml(DRIVER_PORTAL_URL)}</a></p>
    </div>
    `
  );
