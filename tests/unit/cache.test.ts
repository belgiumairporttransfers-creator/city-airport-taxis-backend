import { describe, expect, it, vi, beforeEach } from "vitest";
import { cacheGet, cacheSet, cacheDel } from "@/infrastructure/redis/cache";
import { RedisClient } from "@/infrastructure/redis/client";

const mockClient = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  scan: vi.fn(),
};

vi.mock("@/infrastructure/redis/client", () => ({
  RedisClient: {
    connect: vi.fn(),
    isConnected: vi.fn(),
  },
}));

describe("redis cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(RedisClient.connect).mockResolvedValue(mockClient as never);
  });

  it("returns null on cache miss", async () => {
    mockClient.get.mockResolvedValue(null);
    await expect(cacheGet("missing")).resolves.toBeNull();
  });

  it("stores and parses json values", async () => {
    mockClient.get.mockResolvedValue(JSON.stringify({ ok: true }));
    await expect(cacheGet("key")).resolves.toEqual({ ok: true });
  });

  it("sets serialized values with ttl", async () => {
    await cacheSet("key", { value: 1 }, 30);
    expect(mockClient.set).toHaveBeenCalledWith("key", JSON.stringify({ value: 1 }), { EX: 30 });
  });

  it("deletes cache keys", async () => {
    await cacheDel("key");
    expect(mockClient.del).toHaveBeenCalledWith("key");
  });

  it("invalidates keys by pattern", async () => {
    mockClient.scan.mockResolvedValue({ cursor: 0, keys: ["settings:1"] });
    mockClient.del.mockResolvedValue(1);

    const { cacheInvalidatePattern } = await import("@/infrastructure/redis/cache");
    await expect(cacheInvalidatePattern("settings:*")).resolves.toBe(1);
  });
});
