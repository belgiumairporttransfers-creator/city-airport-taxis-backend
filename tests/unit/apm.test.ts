import { describe, expect, it, vi } from "vitest";
import express from "express";
import {
  initObservability,
  captureException,
  flushObservability,
  getSentryRequestHandler,
  isObservabilityEnabled,
  setupSentryErrorHandler,
} from "@/shared/observability/apm";

describe("apm", () => {
  it("does not initialize when sentry is disabled", async () => {
    await initObservability();
    expect(isObservabilityEnabled()).toBe(false);
    expect(() => captureException(new Error("test"))).not.toThrow();
  });

  it("returns no-op handlers when sentry is disabled", async () => {
    const app = express();
    const handler = getSentryRequestHandler();
    await new Promise<void>((resolve) => handler({} as express.Request, {} as express.Response, resolve));
    setupSentryErrorHandler(app);
    await flushObservability();
  });
});
