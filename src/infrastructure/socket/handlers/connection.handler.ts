import logger from "@/shared/utils/logger";
import { onlineUsersRegistry } from "../registry/online-users.registry";
import { joinUserRoom } from "../rooms";
import {
  incrementSocketConnection,
  incrementSocketDisconnect,
} from "@/shared/observability/metrics";
import type { AuthenticatedSocket } from "../types/socket.types";

export const handleConnection = (socket: AuthenticatedSocket): void => {
  const { userId, type, role } = socket.data;

  void onlineUsersRegistry.register(userId, socket.id).then(() => {
    joinUserRoom(socket, userId, type);
    incrementSocketConnection();

    logger.info("Socket connected", {
      socketId: socket.id,
      userId,
      type,
      role,
      connections: onlineUsersRegistry.getConnectionCount(),
    });
  });

  socket.on("disconnect", (reason) => {
    void onlineUsersRegistry.unregister(socket.id).then(async () => {
      incrementSocketDisconnect();

      logger.info("Socket disconnected", {
        socketId: socket.id,
        userId,
        reason,
        onlineUsers: await onlineUsersRegistry.getOnlineUserCount(),
        connections: onlineUsersRegistry.getConnectionCount(),
      });
    });
  });
};
