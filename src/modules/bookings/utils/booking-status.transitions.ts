import { AppError } from "@/shared/errors/AppError";
import type { BookingStatus } from "@/modules/bookings/types/booking.types";

const TERMINAL_STATUSES: BookingStatus[] = ["cancelled", "complete"];

export const canConfirmBooking = (status: BookingStatus): boolean => status === "pending";

export const canCancelBooking = (status: BookingStatus): boolean =>
  !TERMINAL_STATUSES.includes(status);

export const canMarkNoShow = (status: BookingStatus): boolean => status === "confirmed";

export const assertCanConfirm = (status: BookingStatus) => {
  if (!canConfirmBooking(status)) {
    throw new AppError(`Booking cannot be confirmed from status "${status}"`, 400);
  }
};

export const assertCanCancel = (status: BookingStatus) => {
  if (!canCancelBooking(status)) {
    throw new AppError(`Booking cannot be cancelled from status "${status}"`, 400);
  }
};

export const assertCanMarkNoShow = (status: BookingStatus) => {
  if (!canMarkNoShow(status)) {
    throw new AppError(`Booking cannot be marked as no-show from status "${status}"`, 400);
  }
};

const PATCH_ALLOWED_STATUS_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
};

export const assertValidPatchStatusTransition = (
  currentStatus: BookingStatus,
  nextStatus: BookingStatus
) => {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowed = PATCH_ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];

  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      `Booking status cannot be changed from "${currentStatus}" to "${nextStatus}"`,
      400
    );
  }
};
