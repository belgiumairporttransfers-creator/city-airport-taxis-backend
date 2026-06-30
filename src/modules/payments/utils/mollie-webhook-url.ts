import { env } from "@/config/env";
import logger from "@/shared/utils/logger";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const isLocalHost = (hostname: string) => LOCAL_HOSTS.has(hostname.toLowerCase());

export const buildMollieWebhookUrl = (): string | undefined => {
  const explicitWebhook = process.env.MOLLIE_WEBHOOK_URL?.trim();
  if (explicitWebhook) {
    return explicitWebhook;
  }

  const webhookUrl = `${env.API_PUBLIC_URL.replace(/\/$/, "")}/api/payments/mollie/webhook`;

  try {
    const parsed = new URL(webhookUrl);

    if (isLocalHost(parsed.hostname)) {
      if (env.NODE_ENV === "production") {
        throw new Error(
          "API_PUBLIC_URL must be a publicly reachable HTTPS URL in production so Mollie can deliver payment webhooks."
        );
      }

      logger.warn(
        "Skipping Mollie webhook URL because API_PUBLIC_URL is not internet-reachable. Card checkout will still work, but payment status will not auto-update until you expose your API (e.g. ngrok) and set API_PUBLIC_URL."
      );
      return undefined;
    }
  } catch (error) {
    if (env.NODE_ENV === "production") {
      throw error;
    }

    logger.warn("Skipping Mollie webhook URL due to invalid API_PUBLIC_URL", { webhookUrl, error });
    return undefined;
  }

  return webhookUrl;
};
