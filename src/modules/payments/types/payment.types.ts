import type { Document, Types } from "mongoose";

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "cancelled",
  "expired",
  "refunded",
  "partially_refunded",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_RECORD_METHODS = ["mollie", "pay_onboard"] as const;
export type PaymentRecordMethod = (typeof PAYMENT_RECORD_METHODS)[number];

export interface IPayment extends Document {
  bookingId: Types.ObjectId;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethod?: PaymentRecordMethod;
  transactionId?: string;
  providerPaymentId?: string;
  providerResponse?: Record<string, unknown>;
  cardLastDigits?: string;
  paidAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentData {
  bookingId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethod?: PaymentRecordMethod;
  providerResponse?: Record<string, unknown>;
}

export interface GetPaymentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: PaymentStatus;
  sort?: string;
}
