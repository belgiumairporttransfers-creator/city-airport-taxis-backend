import { describe, expect, it, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
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

vi.mock("@/modules/communication/socket/communication.handlers", () => ({
  registerCommunicationHandlers: vi.fn(),
}));

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("handleConnection", () => {
  beforeEach(() => {
    registerMock.mockClear();
    unregisterMock.mockClear();
  });

  it("registers socket and handles disconnect", async () => {
    const listeners: Record<string, (...args: unknown[]) => void> = {};
    const userId = new Types.ObjectId().toString();
    const socket = {
      id: "sock-1",
      data: { userId, type: "user", role: "user" },
      join: vi.fn(),
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        listeners[event] = handler;
      }),
    } as unknown as AuthenticatedSocket;

    handleConnection(socket);

    await flushPromises();
    expect(registerMock).toHaveBeenCalledWith(userId, "sock-1");
    expect(socket.join).toHaveBeenCalled();

    listeners.disconnect("client disconnect");
    await flushPromises();
    expect(unregisterMock).toHaveBeenCalledWith("sock-1");
  });
});
