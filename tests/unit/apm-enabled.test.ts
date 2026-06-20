import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";

const sentryInitMock = vi.fn();
const captureExceptionMock = vi.fn();
const flushMock = vi.fn().mockResolvedValue(true);
const setupExpressErrorHandlerMock = vi.fn();

vi.mock("@sentry/node", () => ({
  init: (...args: unknown[]) => sentryInitMock(...args),
  expressIntegration: vi.fn(() => "express"),
  httpIntegration: vi.fn(() => "http"),
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
  flush: (...args: unknown[]) => flushMock(...args),
  setupExpressErrorHandler: (...args: unknown[]) => setupExpressErrorHandlerMock(...args),
}));

vi.mock("@/config/env", () => ({
  env: {
    SENTRY_ENABLED: true,
    SENTRY_DSN: "https://example@o0.ingest.sentry.io/0",
    SENTRY_TRACES_SAMPLE_RATE: 0.2,
    NODE_ENV: "test",
  },
}));

describe("apm with sentry enabled", () => {
  beforeEach(async () => {
    vi.resetModules();
    sentryInitMock.mockClear();
    captureExceptionMock.mockClear();
    flushMock.mockClear();
    setupExpressErrorHandlerMock.mockClear();
  });

  it("initializes sentry and wires error handlers", async () => {
    const apm = await import("@/shared/observability/apm");

    await apm.initObservability();
    expect(apm.isObservabilityEnabled()).toBe(true);
    expect(sentryInitMock).toHaveBeenCalled();

    const app = express();
    apm.setupSentryErrorHandler(app);
    apm.captureException(new Error("boom"), { route: "/test" });
    await apm.flushObservability();

    expect(setupExpressErrorHandlerMock).toHaveBeenCalledWith(app);
    expect(captureExceptionMock).toHaveBeenCalled();
    expect(flushMock).toHaveBeenCalled();

    apm.resetObservabilityForTests();
  });
});
