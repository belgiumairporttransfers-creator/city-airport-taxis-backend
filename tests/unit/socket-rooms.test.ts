import { describe, expect, it, vi } from "vitest";
import { joinUserRoom, leaveUserRoom, SocketRooms } from "@/infrastructure/socket/rooms";

describe("socket rooms", () => {
  it("builds room names and joins user/admin rooms", () => {
    const socket = { join: vi.fn(), leave: vi.fn() };

    joinUserRoom(socket, "user-1", "user");
    expect(socket.join).toHaveBeenCalledWith(SocketRooms.user("user-1"));
    expect(socket.join).toHaveBeenCalledWith(SocketRooms.role("user"));

    joinUserRoom(socket, "admin-1", "admin");
    expect(socket.join).toHaveBeenCalledWith(SocketRooms.admin("admin-1"));
    expect(socket.join).toHaveBeenCalledWith(SocketRooms.role("admin"));
  });

  it("leaves user and admin rooms", () => {
    const socket = { join: vi.fn(), leave: vi.fn() };

    leaveUserRoom(socket, "user-1", "user");
    expect(socket.leave).toHaveBeenCalledWith(SocketRooms.user("user-1"));

    leaveUserRoom(socket, "admin-1", "admin");
    expect(socket.leave).toHaveBeenCalledWith(SocketRooms.admin("admin-1"));
  });
});
