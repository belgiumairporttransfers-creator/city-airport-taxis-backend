import { describe, expect, it, vi } from "vitest";
import { isServiceHealthy, getPublicHealthReport } from "@/modules/health/services/health.service";

vi.mock("@/infrastructure/redis/client", () => ({
  RedisClient: {
    ping: vi.fn().mockResolvedValue({ connected: false, status: "disabled" }),
  },
}));

describe("health service", () => {
  it("isServiceHealthy requires mongo connection", () => {
    expect(
      isServiceHealthy(
        { connected: false, status: "disconnected" },
        { connected: false, status: "disabled" },
        { enabled: false, initialized: false, status: "disabled" }
      )
    ).toBe(false);

    expect(
      isServiceHealthy(
        { connected: true, status: "connected" },
        { connected: false, status: "disabled" },
        { enabled: false, initialized: false, status: "disabled" }
      )
    ).toBe(true);
  });

  it("getPublicHealthReport returns service summary only", async () => {
    const report = await getPublicHealthReport();

    expect(report.services?.mongodb).toBeDefined();
    expect(report.environment).toBeUndefined();
    expect(report.database).toBeUndefined();
  });
});
