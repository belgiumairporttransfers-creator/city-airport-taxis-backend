import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import http from "http";
import request from "supertest";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from "../helpers/db";
import { TEST_ADMIN } from "../helpers/auth";

describe("Socket integration", () => {
  let httpServer: http.Server;
  let port: number;
  let shutdownSocket: () => Promise<void>;

  beforeAll(async () => {
    vi.stubEnv("SOCKET_ENABLED", "true");
    vi.stubEnv("REDIS_ENABLED", "false");
    vi.resetModules();

    await connectTestDatabase();

    const appModule = await import("@/app");
    const socketModule = await import("@/infrastructure/socket/server");
    const { Admin } = await import("@/infrastructure/database/models/Admin");

    await Admin.create(TEST_ADMIN);

    httpServer = http.createServer(appModule.default);
    await socketModule.initSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        port = typeof address === "object" && address ? address.port : 0;
        resolve();
      });
    });

    shutdownSocket = socketModule.shutdownSocketServer;
  });

  afterAll(async () => {
    await shutdownSocket();

    if (httpServer.listening) {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
    }

    vi.unstubAllEnvs();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    const { Admin } = await import("@/infrastructure/database/models/Admin");
    await Admin.create(TEST_ADMIN);
  });

  it("connects authenticated admin socket and disconnects cleanly", async () => {
    const agent = request.agent(httpServer);
    const loginResponse = await agent.post("/api/admin/auth/login").send({
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password,
    });

    expect(loginResponse.status).toBe(200);

    const cookieHeader = loginResponse.headers["set-cookie"];
    expect(cookieHeader).toBeDefined();

    const client: ClientSocket = ioClient(`http://127.0.0.1:${port}`, {
      path: "/socket.io",
      transports: ["websocket"],
      extraHeaders: {
        Cookie: Array.isArray(cookieHeader) ? cookieHeader.join("; ") : String(cookieHeader),
      },
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Socket connect timeout")), 10000);
      client.on("connect", () => {
        clearTimeout(timeout);
        resolve();
      });
      client.on("connect_error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    expect(client.connected).toBe(true);

    await new Promise<void>((resolve) => {
      client.on("disconnect", () => resolve());
      client.disconnect();
    });
  });

  it("rejects unauthenticated socket connections", async () => {
    const client = ioClient(`http://127.0.0.1:${port}`, {
      path: "/socket.io",
      transports: ["websocket"],
    });

    await expect(
      new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Expected connect_error")), 10000);
        client.on("connect", () => {
          clearTimeout(timeout);
          reject(new Error("Should not connect without auth"));
        });
        client.on("connect_error", () => {
          clearTimeout(timeout);
          resolve();
        });
      })
    ).resolves.toBeUndefined();

    client.disconnect();
  });
});
