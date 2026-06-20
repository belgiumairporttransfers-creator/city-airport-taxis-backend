import { describe, expect, it } from "vitest";
import { ErrorCodes, mapStatusToErrorCode } from "@/shared/errors/error-codes";

describe("error codes", () => {
  it("maps 401 to AUTH_UNAUTHORIZED", () => {
    expect(mapStatusToErrorCode(401)).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
  });

  it("maps JWT errors", () => {
    expect(mapStatusToErrorCode(401, "JsonWebTokenError")).toBe(ErrorCodes.AUTH_TOKEN_INVALID);
    expect(mapStatusToErrorCode(401, "TokenExpiredError")).toBe(ErrorCodes.AUTH_TOKEN_EXPIRED);
  });
});
