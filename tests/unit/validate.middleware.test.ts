import { describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { validateRequest, validateParams, validateQuery } from "@/middleware/validate";
import { AppError } from "@/shared/errors/AppError";
import { idParamSchema } from "@/shared/validators/object-id.schema";

const runMiddleware = (
  middleware: ReturnType<typeof validateRequest>,
  req: Partial<Request>
) =>
  new Promise<{ error?: AppError; req: Request }>((resolve) => {
    const request = req as Request;
    middleware(request, {} as Response, (err?: unknown) => {
      resolve({ error: err as AppError | undefined, req: request });
    });
  });

describe("validate middleware", () => {
  it("validateRequest strips unknown body fields", async () => {
    const schema = Joi.object({ name: Joi.string().required() });
    const { error, req } = await runMiddleware(validateRequest(schema), {
      body: { name: "City Airport Taxis", extra: true },
    });

    expect(error).toBeUndefined();
    expect(req.body).toEqual({ name: "City Airport Taxis" });
  });

  it("validateParams rejects invalid ids", async () => {
    const { error } = await runMiddleware(validateParams(idParamSchema), {
      params: { id: "bad-id" },
    });

    expect(error?.message).toContain("Invalid id format");
  });

  it("validateQuery applies defaults", async () => {
    const schema = Joi.object({ page: Joi.number().default(1) });
    const { error, req } = await runMiddleware(validateQuery(schema), {
      query: {},
    });

    expect(error).toBeUndefined();
    expect(req.query.page).toBe(1);
  });
});
