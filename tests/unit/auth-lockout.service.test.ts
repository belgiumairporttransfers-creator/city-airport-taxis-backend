import { describe, expect, it, vi, beforeEach } from "vitest";
import authLockoutService from "@/modules/auth/services/auth-lockout.service";
import { AppError } from "@/shared/errors/AppError";

const createAccount = (overrides: Record<string, unknown> = {}) => ({
  failedLoginAttempts: 0,
  lockUntil: undefined,
  _id: { toString: () => "user-1" },
  comparePassword: vi.fn().mockResolvedValue(false),
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("authLockoutService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when account is locked", () => {
    const account = createAccount({
      lockUntil: new Date(Date.now() + 60_000),
    });

    expect(() => authLockoutService.assertNotLocked(account as never, "user")).toThrow(AppError);
  });

  it("resets attempts after successful password verification", async () => {
    const account = createAccount({
      failedLoginAttempts: 2,
      comparePassword: vi.fn().mockResolvedValue(true),
    });

    const valid = await authLockoutService.verifyPassword(
      account as never,
      "Password123!",
      "user",
      { ipAddress: "127.0.0.1", userAgent: "test" }
    );

    expect(valid).toBe(true);
    expect(account.failedLoginAttempts).toBe(0);
    expect(account.save).toHaveBeenCalled();
  });
});
