import http from "http";
import mongoose from "mongoose";
import connectDB from "@/infrastructure/database/connection";
import { RedisClient } from "@/infrastructure/redis/client";
import { env } from "@/config/env";
import { initSocketServer, shutdownSocketServer } from "@/infrastructure/socket/server";
import {
  initObservability,
  captureException,
  flushObservability,
} from "@/shared/observability/apm";
import logger from "@/shared/utils/logger";
import { startNewsletterScheduler, stopNewsletterScheduler, startNewsletterDeliveryWorker, stopNewsletterDeliveryWorker } from "@/modules/newsletter";
import {
  initNotificationInfrastructure,
  shutdownNotificationInfrastructure,
} from "@/modules/notifications";

const PORT = env.PORT || 5000;

let httpServer: http.Server | null = null;
let isShuttingDown = false;

const bootstrap = async (): Promise<void> => {
  await initObservability();
  await connectDB();
  await RedisClient.connect();

  const { default: app, applyErrorHandlers } = await import("./app");
  applyErrorHandlers(app);

  httpServer = http.createServer(app);
  await initSocketServer(httpServer);
  await initNotificationInfrastructure();

  httpServer.listen(PORT, () => {
    startNewsletterScheduler();
    void startNewsletterDeliveryWorker();
    logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`, {
      redisEnabled: env.REDIS_ENABLED,
      redisConnected: RedisClient.isConnected(),
      newsletterQueueEnabled: env.NEWSLETTER_QUEUE_ENABLED,
      emailProvider: env.EMAIL_PROVIDER,
      socketEnabled: env.SOCKET_ENABLED,
      socketPath: env.SOCKET_PATH,
      sentryEnabled: env.SENTRY_ENABLED,
    });
  });
};

const shutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received — shutting down gracefully`);

  try {
    stopNewsletterScheduler();
    await stopNewsletterDeliveryWorker();
    await shutdownNotificationInfrastructure();
    await shutdownSocketServer();
    await RedisClient.disconnect();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info("MongoDB disconnected");
    }

    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer?.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      httpServer = null;
    }

    await flushObservability();
    logger.info("Graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", { error });
    process.exit(1);
  }
};

bootstrap().catch((error) => {
  logger.error("Failed to start server:", error);
  captureException(error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});

process.on("unhandledRejection", (err: Error) => {
  logger.error(`Unhandled Rejection: ${err.message}`, { stack: err.stack });
  captureException(err);
  process.exit(1);
});

process.on("uncaughtException", (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  captureException(err);
  process.exit(1);
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
