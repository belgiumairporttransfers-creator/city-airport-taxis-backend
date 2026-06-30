export const MOLLIE_API_BASE = "https://api.mollie.com/v2" as const;

export const MOLLIE_REQUEST_TIMEOUT_MS = 15_000 as const;

export const MOLLIE_RETRYABLE_HTTP_STATUSES = [502, 503, 504] as const;

export const MOLLIE_PAYMENT_STATUSES = [
  "open",
  "canceled",
  "pending",
  "authorized",
  "expired",
  "failed",
  "paid",
] as const;

export const MOLLIE_PAYMENT_MODES = ["live", "test"] as const;

export const MOLLIE_SEQUENCE_TYPES = ["oneoff", "first", "recurring"] as const;
