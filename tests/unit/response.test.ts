import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import { sendSuccess, sendError } from "@/shared/utils/response";

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

describe("response helpers", () => {
  it("sendSuccess includes data and message", () => {
    const res = createRes();
    sendSuccess(res, { id: 1 }, { message: "ok", statusCode: 201 });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ id: 1 });
    expect(res.body.message).toBe("ok");
  });

  it("sendError includes errorCode when provided", () => {
    const res = createRes();
    sendError(res, "Invalid", 422, "VALIDATION_FAILED");

    expect(res.statusCode).toBe(422);
    expect(res.body.errorCode).toBe("VALIDATION_FAILED");
  });
});
