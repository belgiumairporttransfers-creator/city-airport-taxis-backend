import { describe, expect, it } from "vitest";
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/error-codes";

describe("AppError classes", () => {
  it("sets status codes and optional error codes", () => {
    expect(new AppError("fail", 500, ErrorCodes.INTERNAL_ERROR).statusCode).toBe(500);
    expect(new BadRequestError("bad").statusCode).toBe(400);
    expect(new NotFoundError().statusCode).toBe(404);
    expect(new ForbiddenError().statusCode).toBe(403);
    expect(new ConflictError().statusCode).toBe(409);
    expect(new ValidationError("invalid").statusCode).toBe(422);
    expect(new UnauthorizedError("nope", ErrorCodes.AUTH_UNAUTHORIZED).errorCode).toBe(
      ErrorCodes.AUTH_UNAUTHORIZED
    );
  });
});
