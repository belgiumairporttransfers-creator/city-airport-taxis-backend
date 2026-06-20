import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getRefreshTokenFromRequest } from "@/modules/auth/utils/refresh-token";

describe("getRefreshTokenFromRequest", () => {
  it("reads refresh token from cookies", () => {
    const token = getRefreshTokenFromRequest(
      { cookies: { refreshToken: "cookie-token" }, body: {} } as Request,
      "refreshToken"
    );

    expect(token).toBe("cookie-token");
  });

  it("reads refresh token from body in non-production", () => {
    const token = getRefreshTokenFromRequest(
      { cookies: {}, body: { refreshToken: "body-token" } } as Request,
      "refreshToken"
    );

    expect(token).toBe("body-token");
  });
});
