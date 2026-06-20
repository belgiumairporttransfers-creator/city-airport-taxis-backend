import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Socket } from "socket.io";
import { socketAuthMiddleware } from "@/infrastructure/socket/middleware/auth.middleware";

const verifyMock = vi.fn();

vi.mock("@/modules/auth/utils/auth-account", () => ({
  verifyAccessTokenAccount: (...args: unknown[]) => verifyMock(...args),
}));

const createSocket = (overrides: Record<string, unknown> = {}): Socket =>
  ({
    id: "socket-1",
    handshake: {
      auth: {},
      headers: {},
      ...((overrides.handshake as object) || {}),
    },
    data: {},
    ...overrides,
  }) as unknown as Socket;

describe("socketAuthMiddleware", () => {
  beforeEach(() => {
    verifyMock.mockReset();
  });

  it("accepts bearer token from Authorization header", async () => {
    verifyMock.mockResolvedValue({ userId: "u1", role: "admin", type: "admin" });
    const socket = createSocket({
      handshake: { headers: { authorization: "Bearer access-token" }, auth: {} },
    });
    const next = vi.fn();

    await socketAuthMiddleware(socket, next);

    expect(verifyMock).toHaveBeenCalledWith("access-token");
    expect(socket.data.userId).toBe("u1");
    expect(next).toHaveBeenCalledWith();
  });

  it("accepts token from handshake auth", async () => {
    verifyMock.mockResolvedValue({ userId: "u2", role: "user", type: "user" });
    const socket = createSocket({
      handshake: { auth: { token: "auth-token" }, headers: {} },
    });
    const next = vi.fn();

    await socketAuthMiddleware(socket, next);

    expect(verifyMock).toHaveBeenCalledWith("auth-token");
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects missing token", async () => {
    const socket = createSocket();
    const next = vi.fn();

    await socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("rejects invalid token", async () => {
    verifyMock.mockRejectedValue(new Error("invalid"));
    const socket = createSocket({
      handshake: { auth: { token: "bad" }, headers: {} },
    });
    const next = vi.fn();

    await socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Invalid or expired token" }));
  });
});
