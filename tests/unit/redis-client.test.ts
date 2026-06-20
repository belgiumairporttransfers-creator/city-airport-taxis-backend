import { describe, expect, it, vi, beforeEach } from "vitest";

const connectMock = vi.fn();
const pingMock = vi.fn();
const quitMock = vi.fn();
const onMock = vi.fn();

const createClientMock = vi.fn(() => ({
  connect: connectMock,
  ping: pingMock,
  quit: quitMock,
  disconnect: vi.fn(),
  on: onMock,
  isOpen: true,
  duplicate: vi.fn(),
}));

vi.mock("redis", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

describe("RedisClient", () => {
  beforeEach(async () => {
    vi.resetModules();
    connectMock.mockReset();
    pingMock.mockReset();
    quitMock.mockReset();
    onMock.mockReset();
    connectMock.mockResolvedValue(undefined);
    pingMock.mockResolvedValue("PONG");
    quitMock.mockResolvedValue(undefined);
  });

  it("returns disabled status when redis is off", async () => {
    vi.doMock("@/config/env", () => ({
      env: {
        REDIS_ENABLED: false,
        REDIS_URL: "",
        REDIS_CONNECT_TIMEOUT_MS: 1000,
        REDIS_MAX_RETRIES: 3,
      },
    }));

    const { RedisClient } = await import("@/infrastructure/redis/client");
    const status = await RedisClient.ping();

    expect(status.status).toBe("disabled");
    expect(await RedisClient.connect()).toBeNull();
  });

  it("connects and pings when redis is enabled", async () => {
    vi.doMock("@/config/env", () => ({
      env: {
        REDIS_ENABLED: true,
        REDIS_URL: "redis://127.0.0.1:6379",
        REDIS_CONNECT_TIMEOUT_MS: 1000,
        REDIS_MAX_RETRIES: 3,
      },
    }));

    const { RedisClient } = await import("@/infrastructure/redis/client");
    await RedisClient.connect();
    const status = await RedisClient.ping();

    expect(createClientMock).toHaveBeenCalled();
    expect(status.status).toBe("connected");
    await RedisClient.disconnect();
  });
});
