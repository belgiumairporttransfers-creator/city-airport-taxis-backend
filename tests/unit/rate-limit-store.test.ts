import { describe, expect, it, vi, beforeEach } from "vitest";

const RedisStoreMock = vi.fn(function RedisStore(this: { prefix?: string }, options: { prefix: string }) {
  this.prefix = options.prefix;
});

vi.mock("rate-limit-redis", () => ({
  RedisStore: RedisStoreMock,
}));

vi.mock("@/infrastructure/redis/client", () => ({
  RedisClient: {
    isDevUnavailable: vi.fn().mockReturnValue(false),
    isConnected: vi.fn().mockReturnValue(true),
    connect: vi.fn(),
  },
}));

vi.mock("@/config/env", () => ({
  env: { REDIS_ENABLED: true },
}));

describe("rate limit store", () => {
  beforeEach(() => {
    RedisStoreMock.mockClear();
  });

  it("creates a unique store per limiter name", async () => {
    const { createRateLimitStore } = await import("@/infrastructure/redis/rate-limit-store");

    const loginStore = createRateLimitStore("login");
    const globalStore = createRateLimitStore("global");

    expect(RedisStoreMock).toHaveBeenCalledTimes(2);
    expect(RedisStoreMock.mock.calls[0][0].prefix).toBe("rl:login:");
    expect(RedisStoreMock.mock.calls[1][0].prefix).toBe("rl:global:");
    expect(loginStore).not.toBe(globalStore);
  });

  it("returns undefined when redis is disabled", async () => {
    vi.resetModules();
    vi.doMock("@/config/env", () => ({
      env: { REDIS_ENABLED: false },
    }));
    vi.doMock("rate-limit-redis", () => ({
      RedisStore: RedisStoreMock,
    }));
    vi.doMock("@/infrastructure/redis/client", () => ({
      RedisClient: { isDevUnavailable: vi.fn().mockReturnValue(false), connect: vi.fn() },
    }));

    const { createRateLimitStore } = await import("@/infrastructure/redis/rate-limit-store");
    expect(createRateLimitStore("login")).toBeUndefined();
  });
});
