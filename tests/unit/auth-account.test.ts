import { describe, expect, it } from "vitest";
import { rejectStaleToken } from "@/modules/auth/utils/auth-account";
import { AppError } from "@/shared/errors/AppError";
import type { TokenPayload } from "@/modules/auth/types/auth.types";

describe("rejectStaleToken", () => {
  it("allows tokens issued after password change", () => {
    expect(() =>
      rejectStaleToken({ iat: 200 } as TokenPayload, new Date(100_000))
    ).not.toThrow();
  });

  it("rejects tokens issued before password change", () => {
    expect(() =>
      rejectStaleToken({ iat: 100 } as TokenPayload, new Date(200_000))
    ).toThrow(AppError);
  });
});
