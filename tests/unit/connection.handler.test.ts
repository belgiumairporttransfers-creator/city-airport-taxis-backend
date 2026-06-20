import { describe, expect, it, vi, beforeEach } from "vitest";
import { handleConnection } from "@/infrastructure/socket/handlers/connection.handler";
import type { AuthenticatedSocket } from "@/infrastructure/socket/types/socket.types";

const registerMock = vi.fn().mockResolvedValue(undefined);
const unregisterMock = vi.fn().mockResolvedValue(undefined);
const getConnectionCountMock = vi.fn().mockReturnValue(1);
const getOnlineUserCountMock = vi.fn().mockResolvedValue(1);

vi.mock("@/infrastructure/socket/registry/online-users.registry", () => ({
  onlineUsersRegistry: {
    register: (...args: unknown[]) => registerMock(...args),
    unregister: (...args: unknown[]) => unregisterMock(...args),
    getConnectionCount: () => getConnectionCountMock(),
    getOnlineUserCount: () => getOnlineUserCountMock(),
  },
}));

describe("handleConnection", () => {
  beforeEach(() => {
    registerMock.mockClear();
    unregisterMock.mockClear();
  });

  it("registers socket and handles disconnect", async () => {
    const listeners: Record<string, (...args: unknown[]) => void> = {};
    const socket = {
      id: "sock-1",
      data: { userId: "user-1", type: "user", role: "user" },
      join: vi.fn(),
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        listeners[event] = handler;
      }),
    } as unknown as AuthenticatedSocket;

    handleConnection(socket);

    await Promise.resolve();
    expect(registerMock).toHaveBeenCalledWith("user-1", "sock-1");
    expect(socket.join).toHaveBeenCalled();

    listeners.disconnect("client disconnect");
    await Promise.resolve();
    expect(unregisterMock).toHaveBeenCalledWith("sock-1");
  });
});
