import { env } from "@/config/env";
import { AppError } from "@/shared/errors/AppError";
import type { IPayment } from "@/modules/payments/types/payment.types";
import type { PaymentMode } from "@/modules/settings/types/settings.types";
import type { MolliePaymentMode } from "./mollie.types";

export const resolveMollieApiKey = (paymentMode: PaymentMode): string => {
  const key =
    paymentMode === "live"
      ? env.MOLLIE_LIVE_API_KEY
      : env.MOLLIE_TEST_API_KEY;

  if (!key) {
    throw new AppError(
      paymentMode === "live"
        ? "Mollie live API key is not configured"
        : "Mollie test API key is not configured",
      503
    );
  }

  return key;
};

export const resolveMollieApiKeyForPayment = (
  payment: Pick<IPayment, "providerResponse">,
  fallbackMode: PaymentMode
): string => {
  const storedMode = (payment.providerResponse as { mode?: MolliePaymentMode } | undefined)?.mode;

  if (storedMode === "live" || storedMode === "test") {
    return resolveMollieApiKey(storedMode);
  }

  return resolveMollieApiKey(fallbackMode);
};

export const getDefaultPaymentMode = (): PaymentMode => "test";
