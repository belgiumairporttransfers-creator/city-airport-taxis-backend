import type {
  MOLLIE_PAYMENT_MODES,
  MOLLIE_PAYMENT_STATUSES,
  MOLLIE_SEQUENCE_TYPES,
} from "./mollie.constants";

export type MolliePaymentStatus = (typeof MOLLIE_PAYMENT_STATUSES)[number];

export type MolliePaymentMode = (typeof MOLLIE_PAYMENT_MODES)[number];

export type MollieSequenceType = (typeof MOLLIE_SEQUENCE_TYPES)[number];

export interface MollieAmount {
  value: string;
  currency: string;
}

export interface MollieLink {
  href: string;
  type: string;
}

export interface MolliePaymentLinks {
  self?: MollieLink;
  checkout?: MollieLink;
  dashboard?: MollieLink;
  documentation?: MollieLink;
  changePaymentState?: MollieLink;
  payOnline?: MollieLink;
}

export interface MolliePaymentMetadata {
  bookingId?: string;
  paymentId?: string;
  bookingNumber?: string;
  [key: string]: string | undefined;
}

export interface MollieQrCode {
  src: string;
  width: number;
  height: number;
}

export interface MolliePaymentDetails {
  cardNumber?: string;
  cardHolder?: string;
  cardAudience?: string;
  cardLabel?: string;
  cardFingerprint?: string;
  cardExpiryDate?: string;
  voucherNumber?: string;
  consumerName?: string;
  consumerAccount?: string;
  consumerBic?: string;
  bankName?: string;
  bankAccount?: string;
  transferReference?: string;
  billingEmail?: string;
  qrCode?: MollieQrCode;
  remainderMethod?: string;
}

export interface CreateMolliePaymentInput {
  amount: MollieAmount;
  description: string;
  redirectUrl: string;
  webhookUrl?: string;
  metadata?: MolliePaymentMetadata;
  method?: string;
  locale?: string;
  sequenceType?: MollieSequenceType;
}

export interface MolliePaymentResponse {
  resource?: "payment";
  id: string;
  mode?: MolliePaymentMode;
  createdAt?: string;
  status: MolliePaymentStatus;
  isCancelable?: boolean;
  authorizedAt?: string;
  paidAt?: string;
  expiresAt?: string;
  expiredAt?: string;
  failedAt?: string;
  canceledAt?: string;
  amount: MollieAmount;
  amountRefunded?: MollieAmount;
  amountRemaining?: MollieAmount;
  settlementAmount?: MollieAmount;
  description: string;
  method?: string;
  metadata?: MolliePaymentMetadata;
  details?: MolliePaymentDetails;
  profileId?: string;
  sequenceType?: MollieSequenceType;
  redirectUrl?: string;
  webhookUrl?: string;
  _links?: MolliePaymentLinks;
}

export interface MollieApiErrorBody {
  status?: number;
  title?: string;
  detail?: string;
  field?: string;
  _links?: MolliePaymentLinks;
}

export interface MollieRequestFailure {
  ok: false;
  status: number;
  errorBody: MollieApiErrorBody;
}

export interface MollieRequestSuccess<T> {
  ok: true;
  data: T;
}

export type MollieRequestResult<T> = MollieRequestSuccess<T> | MollieRequestFailure;

export interface MollieRequestOptions {
  apiKey: string;
}
