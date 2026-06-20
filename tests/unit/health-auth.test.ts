import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { isHealthAuthorized } from "@/middleware/health-auth";

const mockRequest = (headers: Record<string, string> = {}): Request =>
  ({
    header: (name: string) => headers[name],
  }) as Request;

describe("health auth", () => {
  it("allows health access outside production", () => {
    expect(isHealthAuthorized(mockRequest())).toBe(true);
  });
});
