import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { AppError } from "../../src/shared/errors/AppError";
import { csrfProtection } from "../../src/middleware/csrf";

const createMockRes = (): Response => ({}) as Response;

describe("csrfProtection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows safe methods without csrf token", () => {
    const next = vi.fn();
    csrfProtection({ method: "GET", headers: {}, cookies: {} } as Request, createMockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("allows bearer requests without csrf token", () => {
    const next = vi.fn();
    csrfProtection(
      {
        method: "POST",
        headers: { authorization: "Bearer token" },
        cookies: {},
      } as Request,
      createMockRes(),
      next
    );
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects mutating cookie requests without matching csrf token", () => {
    const next = vi.fn();
    csrfProtection(
      {
        method: "POST",
        headers: {},
        cookies: { csrfToken: "abc" },
        get: () => undefined,
      } as unknown as Request,
      createMockRes(),
      next
    );
    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0] as AppError;
    expect(error.message).toContain("CSRF");
  });

  it("accepts matching csrf cookie and header", () => {
    const next = vi.fn();
    csrfProtection(
      {
        method: "POST",
        headers: {},
        cookies: { csrfToken: "abc" },
        get: (name: string) => (name === "X-CSRF-Token" ? "abc" : undefined),
      } as unknown as Request,
      createMockRes(),
      next
    );
    expect(next).toHaveBeenCalledWith();
  });
});
