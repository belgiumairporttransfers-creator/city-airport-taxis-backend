import { describe, expect, it } from "vitest";
import { parseDurationToMs, getRefreshExpiryDate } from "../../src/modules/auth/utils/duration";

describe("duration utils", () => {
  it("parses minute durations", () => {
    expect(parseDurationToMs("15m")).toBe(15 * 60 * 1000);
  });

  it("parses day durations", () => {
    expect(parseDurationToMs("30d")).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("computes refresh expiry from env default", () => {
    const expiry = getRefreshExpiryDate();
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });
});
