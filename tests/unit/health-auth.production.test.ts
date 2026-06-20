import { describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { isHealthAuthorized } from "@/middleware/health-auth";

describe("health auth production", () => {
  it("requires matching health token in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HEALTH_CHECK_TOKEN", "secret-token");

    const authorized = isHealthAuthorized({
      header: (name: string) => (name === "X-Health-Token" ? "secret-token" : undefined),
    } as Request);

    expect(authorized).toBe(true);
    vi.unstubAllEnvs();
  });
});
