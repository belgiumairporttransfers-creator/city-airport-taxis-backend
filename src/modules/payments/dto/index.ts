import type { IPayment } from "@/modules/payments/types/payment.types";

type PaymentLike = IPayment | (Record<string, unknown> & { _id: unknown });

const toIdString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value);
  }
  return undefined;
};

const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
};

const toRecord = (payment: PaymentLike): Record<string, unknown> => {
  if (
    typeof payment === "object" &&
    payment !== null &&
    typeof (payment as IPayment).toObject === "function"
  ) {
    return (payment as IPayment).toObject() as Record<string, unknown>;
  }

  return payment as Record<string, unknown>;
};

export interface PaymentResponse {
  id: string;
  bookingId: string;
  status: string;
  amount: number;
  currency: string;
  transactionId?: string;
  providerPaymentId?: string;
  cardLastDigits?: string;
  paidAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentListItemResponse extends PaymentResponse {
  bookingNumber?: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  method: string;
}

export const toPaymentResponse = (payment: PaymentLike): PaymentResponse => {
  const record = toRecord(payment);

  return {
    id: toIdString(record._id) ?? "",
    bookingId: toIdString(record.bookingId) ?? "",
    status: record.status as string,
    amount: Number(record.amount ?? 0),
    currency: (record.currency as string) ?? "EUR",
    transactionId: record.transactionId as string | undefined,
    providerPaymentId: record.providerPaymentId as string | undefined,
    cardLastDigits: record.cardLastDigits as string | undefined,
    paidAt: toIsoString(record.paidAt),
    refundedAt: toIsoString(record.refundedAt),
    createdAt: toIsoString(record.createdAt) ?? "",
    updatedAt: toIsoString(record.updatedAt) ?? "",
  };
};

const formatPaymentMethod = (providerResponse?: Record<string, unknown>): string => {
  const method = providerResponse?.method;
  if (typeof method !== "string" || !method.trim()) {
    return "N/A";
  }

  if (method.toLowerCase() === "ideal") {
    return "iDEAL";
  }

  return method.charAt(0).toUpperCase() + method.slice(1);
};

export const toAdminPaymentListItemResponse = (
  payment: PaymentLike
): AdminPaymentListItemResponse => {
  const record = toRecord(payment);
  const dto = toPaymentResponse(payment);
  const booking = record.bookingId as Record<string, unknown> | undefined;
  const customer = (booking?.customer as Record<string, unknown>) ?? {};
  const providerResponse = record.providerResponse as Record<string, unknown> | undefined;

  return {
    ...dto,
    bookingNumber: booking?.bookingNumber as string | undefined,
    customer: {
      firstName: (customer.firstName as string) ?? "",
      lastName: (customer.lastName as string) ?? "",
      email: (customer.email as string) ?? "",
    },
    method: formatPaymentMethod(providerResponse),
  };
};
