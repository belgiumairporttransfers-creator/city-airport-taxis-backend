import { describe, expect, it } from "vitest";
import {
  BOOKING_PREFIX,
  BOOKING_NUMBER_PATTERN,
} from "@/modules/bookings/utils/booking-number";

describe("booking-number", () => {
  it("validates booking number pattern", () => {
    expect(BOOKING_PREFIX).toBe("ODR");
    expect(BOOKING_NUMBER_PATTERN.test("ODR-123456")).toBe(true);
    expect(BOOKING_NUMBER_PATTERN.test("odr-123456")).toBe(true);
    expect(BOOKING_NUMBER_PATTERN.test("ODR-12345")).toBe(false);
    expect(BOOKING_NUMBER_PATTERN.test("ODR-1234567")).toBe(false);
    expect(BOOKING_NUMBER_PATTERN.test("BK-20260629-000017")).toBe(false);
  });
});
