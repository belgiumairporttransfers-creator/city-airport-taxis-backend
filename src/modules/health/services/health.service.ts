import mongoose from "mongoose";
import { env } from "@/config/env";
import { RedisClient } from "@/infrastructure/redis/client";
import { getSocketHealthStatus } from "@/infrastructure/socket/server";
import emailService from "@/infrastructure/email/email.service";
import { pingStorageHealth } from "@/infrastructure/storage/cloudinary";
import { getMetricsSnapshot } from "@/shared/observability/metrics";

export interface MongoHealthStatus {
  status: string;
  connected: boolean;
}

export type ServiceHealthStatus = "healthy" | "unhealthy" | "disabled";

export interface ServiceHealthSummary {
  mongodb: ServiceHealthStatus;
  redis: ServiceHealthStatus;
  socket: ServiceHealthStatus;
  email: ServiceHealthStatus;
  storage: ServiceHealthStatus;
}

export interface HealthReport {
  success: boolean;
  message: string;
  timestamp: string;
  environment?: string;
  database?: MongoHealthStatus;
  redis?: Awaited<ReturnType<typeof RedisClient.ping>>;
  socket?: ReturnType<typeof getSocketHealthStatus>;
  email?: Awaited<ReturnType<typeof emailService.pingHealth>>;
  storage?: Awaited<ReturnType<typeof pingStorageHealth>>;
  services?: ServiceHealthSummary;
  metrics?: ReturnType<typeof getMetricsSnapshot>;
}

const getMongoHealthStatus = (): MongoHealthStatus => {
  const readyState = mongoose.connection.readyState;

  const statusMap: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    status: statusMap[readyState] || "unknown",
    connected: readyState === 1,
  };
};

const toServiceStatus = (connected: boolean, enabled = true): ServiceHealthStatus => {
  if (!enabled) return "disabled";
  return connected ? "healthy" : "unhealthy";
};

export const isServiceHealthy = (
  database: MongoHealthStatus,
  redis: Awaited<ReturnType<typeof RedisClient.ping>>,
  socket: ReturnType<typeof getSocketHealthStatus>
): boolean => {
  if (!database.connected) {
    return false;
  }

  if (env.REDIS_ENABLED && !redis.connected) {
    return false;
  }

  if (env.SOCKET_ENABLED && !socket.initialized) {
    return false;
  }

  // Email and storage are monitored but do not block readiness when Mongo/Redis are primary deps
  return true;
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const getHealthReport = async (includeMetrics = false): Promise<HealthReport> => {
  const database = getMongoHealthStatus();
  const redis = await RedisClient.ping();
  const socket = getSocketHealthStatus();
  const email = await withTimeout(
    emailService.pingHealth(),
    2000,
    { status: "unhealthy" as const, error: "Health check timed out" }
  );
  const storage = await withTimeout(
    pingStorageHealth(),
    2000,
    { status: "unhealthy" as const, error: "Health check timed out" }
  );

  const services: ServiceHealthSummary = {
    mongodb: toServiceStatus(database.connected),
    redis: toServiceStatus(redis.connected, env.REDIS_ENABLED),
    socket: toServiceStatus(socket.initialized, env.SOCKET_ENABLED),
    email: email.status,
    storage: storage.status,
  };

  const success = isServiceHealthy(database, redis, socket);

  return {
    success,
    message: success ? "Server is healthy" : "One or more services are unavailable",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    database,
    redis,
    socket,
    email,
    storage,
    services,
    ...(includeMetrics ? { metrics: getMetricsSnapshot() } : {}),
  };
};

export const getPublicHealthReport = async (): Promise<HealthReport> => {
  const database = getMongoHealthStatus();
  const redis = await RedisClient.ping();
  const socket = getSocketHealthStatus();
  const success = isServiceHealthy(database, redis, socket);

  return {
    success,
    message: success ? "Server is healthy" : "One or more services are unavailable",
    timestamp: new Date().toISOString(),
    services: {
      mongodb: toServiceStatus(database.connected),
      redis: toServiceStatus(redis.connected, env.REDIS_ENABLED),
      socket: toServiceStatus(socket.initialized, env.SOCKET_ENABLED),
      email: "disabled",
      storage: "disabled",
    },
  };
};

export const getHealthStatusCode = (report: HealthReport, ready = true): number => {
  if (!ready) {
    return 200;
  }

  if (!report.success) {
    return 503;
  }

  return 200;
};
