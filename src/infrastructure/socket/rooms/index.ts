import type { AccountUserType } from "@/modules/auth/types/account-auth";

/** Room naming conventions for multi-tenant / role-based messaging */
export const SocketRooms = {
  user: (userId: string) => `user:${userId}`,
  admin: (adminId: string) => `admin:${adminId}`,
  role: (role: string) => `role:${role}`,
  global: () => "global",
} as const;

export const joinUserRoom = (
  socket: { join: (room: string) => void },
  userId: string,
  userType: AccountUserType
): void => {
  socket.join(SocketRooms.user(userId));
  if (userType === "admin") {
    socket.join(SocketRooms.admin(userId));
    socket.join(SocketRooms.role("admin"));
  } else {
    socket.join(SocketRooms.role("user"));
  }
};

export const leaveUserRoom = (
  socket: { leave: (room: string) => void },
  userId: string,
  userType: AccountUserType
): void => {
  socket.leave(SocketRooms.user(userId));
  if (userType === "admin") {
    socket.leave(SocketRooms.admin(userId));
    socket.leave(SocketRooms.role("admin"));
  } else {
    socket.leave(SocketRooms.role("user"));
  }
};
