import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryOnlineUsersRegistry } from "@/infrastructure/socket/registry/online-users.registry";

describe("InMemoryOnlineUsersRegistry", () => {
  const registry = new InMemoryOnlineUsersRegistry();

  beforeEach(() => {
    registry.clear();
  });

  it("tracks user connections", () => {
    registry.register("user-1", "socket-a");
    registry.register("user-1", "socket-b");
    registry.register("user-2", "socket-c");

    expect(registry.getOnlineUserCount()).toBe(2);
    expect(registry.getConnectionCount()).toBe(3);
    expect(registry.isUserOnline("user-1")).toBe(true);
  });

  it("removes socket on unregister and clears user when last socket leaves", () => {
    registry.register("user-1", "socket-a");
    registry.register("user-1", "socket-b");

    registry.unregister("socket-a");
    expect(registry.isUserOnline("user-1")).toBe(true);
    expect(registry.getConnectionCount()).toBe(1);

    registry.unregister("socket-b");
    expect(registry.isUserOnline("user-1")).toBe(false);
    expect(registry.getOnlineUserCount()).toBe(0);
  });
});
