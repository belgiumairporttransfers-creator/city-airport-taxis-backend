import type { MolliePaymentResponse, MolliePaymentStatus } from "./mollie.types";

const FAILED_STATUSES: ReadonlySet<MolliePaymentStatus> = new Set(["failed", "expired"]);

const PENDING_STATUSES: ReadonlySet<MolliePaymentStatus> = new Set([
  "open",
  "pending",
  "authorized",
]);

export const extractCardLastDigits = (
  payment: Pick<MolliePaymentResponse, "details">
): string | undefined => {
  const cardNumber = payment.details?.cardNumber;

  if (!cardNumber) {
    return undefined;
  }

  const digits = cardNumber.replace(/\D/g, "");

  return digits.slice(-4) || undefined;
};

export const isPaid = (status: MolliePaymentStatus): boolean => status === "paid";

export const isFailed = (status: MolliePaymentStatus): boolean => FAILED_STATUSES.has(status);

export const isCancelled = (status: MolliePaymentStatus): boolean => status === "canceled";

export const isPending = (status: MolliePaymentStatus): boolean => PENDING_STATUSES.has(status);

export const isSuccessful = (status: MolliePaymentStatus): boolean => isPaid(status);

export const toProviderResponseRecord = (
  payment: MolliePaymentResponse
): Record<string, unknown> => {
  return payment as unknown as Record<string, unknown>;
};
