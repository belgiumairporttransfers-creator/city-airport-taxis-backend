import { describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { errorHandler } from "@/middleware/errorHandler";
import { AppError } from "@/shared/errors/AppError";

const createRes = () => {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as Response & { statusCode: number; body: Record<string, unknown> };
};

describe("errorHandler", () => {
  it("returns errorCode for AppError", () => {
    const res = createRes();
    const next = vi.fn() as NextFunction;

    errorHandler(new AppError("Not found", 404), { path: "/x", method: "GET" } as Request, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body.errorCode).toBe("RESOURCE_NOT_FOUND");
  });

  it("maps CastError to validation failed", () => {
    const res = createRes();
    const err = new Error("Cast failed");
    err.name = "CastError";

    errorHandler(err, { path: "/x", method: "GET" } as Request, res, vi.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid id format");
  });

  it("maps duplicate key errors to 409", () => {
    const res = createRes();
    const err = Object.assign(new Error("duplicate"), { code: 11000 });

    errorHandler(err, { path: "/x", method: "POST" } as Request, res, vi.fn());

    expect(res.statusCode).toBe(409);
    expect(res.body.errorCode).toBe("DUPLICATE_RESOURCE");
  });

  it("maps JsonWebTokenError to auth token invalid", () => {
    const res = createRes();
    const err = new Error("jwt malformed");
    err.name = "JsonWebTokenError";

    errorHandler(err, { path: "/x", method: "GET" } as Request, res, vi.fn());

    expect(res.statusCode).toBe(401);
    expect(res.body.errorCode).toBe("AUTH_TOKEN_INVALID");
  });
});
