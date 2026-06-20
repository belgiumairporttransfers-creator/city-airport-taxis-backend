import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import type { RedisClientType } from "redis";
import { env } from "@/config/env";
import { RedisClient } from "@/infrastructure/redis/client";
import logger from "@/shared/utils/logger";
import { socketAuthMiddleware } from "./middleware/auth.middleware";
import { handleConnection } from "./handlers/connection.handler";
import { onlineUsersRegistry } from "./registry/online-users.registry";
import type { AuthenticatedSocket, SocketHealthStatus } from "./types/socket.types";

let io: Server | null = null;
let redisSubClient: RedisClientType | null = null;

export const initSocketServer = async (httpServer: HttpServer): Promise<Server | null> => {
  if (!env.SOCKET_ENABLED) {
    logger.info("Socket.IO is disabled — skipping initialization");
    return null;
  }

  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    path: env.SOCKET_PATH,
    cors: {
      origin: env.corsOrigins,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  if (env.REDIS_ENABLED) {
    const pubClient = await RedisClient.connect();
    if (pubClient) {
      const subClient = pubClient.duplicate();
      await subClient.connect();
      redisSubClient = subClient;
      io.adapter(createAdapter(pubClient, subClient));
      logger.info("Socket.IO Redis adapter enabled");
    }
  }

  io.use(socketAuthMiddleware);
  io.on("connection", (socket) => {
    handleConnection(socket as AuthenticatedSocket);
  });

  logger.info("Socket.IO initialized", {
    path: env.SOCKET_PATH,
    corsOrigins: env.corsOrigins,
    redisAdapter: env.REDIS_ENABLED,
  });

  return io;
};

export const getSocketServer = (): Server | null => io;

export const getSocketHealthStatus = (): SocketHealthStatus => {
  if (!env.SOCKET_ENABLED) {
    return {
      enabled: false,
      initialized: false,
      status: "disabled",
    };
  }

  if (!io) {
    return {
      enabled: true,
      initialized: false,
      status: "not_initialized",
      path: env.SOCKET_PATH,
    };
  }

  return {
    enabled: true,
    initialized: true,
    status: "running",
    path: env.SOCKET_PATH,
    connections: io.engine.clientsCount,
    onlineUsers: onlineUsersRegistry.getConnectionCount(),
  };
};

export const shutdownSocketServer = async (): Promise<void> => {
  if (redisSubClient?.isOpen) {
    await redisSubClient.quit();
    redisSubClient = null;
  }

  if (!io) {
    void onlineUsersRegistry.clear();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    io?.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  io = null;
  void onlineUsersRegistry.clear();
  logger.info("Socket.IO server shut down");
};
