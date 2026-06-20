import { describe, expect, it, vi, beforeEach } from "vitest";

describe("socket server", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("reports disabled health when sockets are off", async () => {
    vi.doMock("@/config/env", () => ({
      env: {
        SOCKET_ENABLED: false,
        SOCKET_PATH: "/socket.io",
        REDIS_ENABLED: false,
        corsOrigins: ["http://localhost:3000"],
      },
    }));

    const { getSocketHealthStatus, initSocketServer } = await import(
      "@/infrastructure/socket/server"
    );

    expect(getSocketHealthStatus().status).toBe("disabled");
    expect(await initSocketServer({} as import("http").Server)).toBeNull();
  });
});
