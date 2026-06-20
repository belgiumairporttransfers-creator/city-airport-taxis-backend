import type { Application, RequestHandler } from "express";
import { env } from "@/config/env";
import logger from "@/shared/utils/logger";

type SentryModule = typeof import("@sentry/node");

let sentry: SentryModule | null = null;
let initialized = false;

export const initObservability = async (): Promise<void> => {
  if (initialized || !env.SENTRY_ENABLED || !env.SENTRY_DSN) {
    return;
  }

  try {
    const module = await import("@sentry/node");
    sentry = module;
    module.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      release: process.env.npm_package_version,
      tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
      integrations: [module.expressIntegration(), module.httpIntegration()],
      beforeSend(event) {
        if (env.NODE_ENV === "test") {
          return null;
        }
        return event;
      },
    });
    initialized = true;
    logger.info("Sentry APM initialized", {
      environment: env.NODE_ENV,
      tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    });
  } catch (error) {
    logger.warn("Sentry initialization skipped", { error });
  }
};

export const getSentryRequestHandler = (): RequestHandler => {
  if (!sentry || !initialized) {
    return (_req, _res, next) => next();
  }

  return sentry.setupExpressErrorHandler as unknown as RequestHandler;
};

export const setupSentryErrorHandler = (app: Application): void => {
  if (!sentry || !initialized) {
    return;
  }

  sentry.setupExpressErrorHandler(app);
};

export const captureException = (
  error: Error,
  context?: Record<string, unknown>
): void => {
  if (!env.SENTRY_ENABLED || !sentry) {
    return;
  }

  sentry.captureException(error, { extra: context });
};

export const flushObservability = async (timeoutMs = 2000): Promise<void> => {
  if (!sentry || !initialized) {
    return;
  }

  await sentry.flush(timeoutMs);
};

export const isObservabilityEnabled = (): boolean => initialized;

export const resetObservabilityForTests = (): void => {
  sentry = null;
  initialized = false;
};
