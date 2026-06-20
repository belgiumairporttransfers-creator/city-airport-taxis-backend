import { createClient, type RedisClientType } from "redis";
import { env } from "@/config/env";
import logger from "@/shared/utils/logger";

export interface RedisHealthStatus {
  enabled: boolean;
  connected: boolean;
  status: "disabled" | "disconnected" | "connecting" | "connected" | "error";
  latencyMs?: number;
  error?: string;
}

class RedisClientManager {
  private client: RedisClientType | null = null;
  private connectPromise: Promise<RedisClientType | null> | null = null;
  private shuttingDown = false;
  private devUnavailable = false;

  isEnabled(): boolean {
    return env.REDIS_ENABLED;
  }

  isDevUnavailable(): boolean {
    return this.devUnavailable;
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  isConnected(): boolean {
    return Boolean(this.client?.isOpen);
  }

  async connect(): Promise<RedisClientType | null> {
    if (!env.REDIS_ENABLED) {
      logger.info("Redis is disabled — skipping connection");
      return null;
    }

    if (this.devUnavailable) {
      return null;
    }

    if (this.client?.isOpen) {
      return this.client;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.createConnection();

    try {
      return await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private async createConnection(): Promise<RedisClientType | null> {
    if (!env.REDIS_URL) {
      throw new Error("REDIS_URL is required when REDIS_ENABLED is true");
    }

    const client: RedisClientType = createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS,
        reconnectStrategy: (retries) => {
          if (this.shuttingDown) {
            return false;
          }

          if (env.NODE_ENV === "development") {
            return false;
          }

          if (retries > env.REDIS_MAX_RETRIES) {
            logger.error(`Redis reconnect failed after ${retries} attempts`);
            return new Error("Redis max reconnect attempts exceeded");
          }

          const delay = Math.min(retries * 100, 3000);
          logger.warn(`Redis reconnect attempt ${retries} in ${delay}ms`);
          return delay;
        },
      },
    });

    client.on("connect", () => {
      logger.info("Redis client connecting");
    });

    client.on("ready", () => {
      logger.info("Redis client ready");
    });

    client.on("reconnecting", () => {
      logger.warn("Redis client reconnecting");
    });

    client.on("error", (error) => {
      logger.error("Redis client error", { error: error.message });
    });

    client.on("end", () => {
      logger.warn("Redis client connection closed");
    });

    try {
      await client.connect();
      this.client = client;
      return client;
    } catch (error) {
      if (env.NODE_ENV === "development") {
        this.devUnavailable = true;
        logger.warn("Redis connection failed in development — continuing without Redis", {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
      throw error;
    }
  }

  async ping(): Promise<RedisHealthStatus> {
    if (!env.REDIS_ENABLED) {
      return { enabled: false, connected: false, status: "disabled" };
    }

    if (!this.client?.isOpen) {
      return { enabled: true, connected: false, status: "disconnected" };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      return {
        enabled: true,
        connected: true,
        status: "connected",
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Redis error";
      return {
        enabled: true,
        connected: false,
        status: "error",
        error: message,
      };
    }
  }

  async disconnect(): Promise<void> {
    this.shuttingDown = true;

    if (!this.client) {
      return;
    }

    try {
      if (this.client.isOpen) {
        await this.client.quit();
        logger.info("Redis client disconnected gracefully");
      }
    } catch (error) {
      logger.error("Error during Redis disconnect", { error });
      try {
        await this.client.disconnect();
      } catch {
        // ignore secondary disconnect errors during shutdown
      }
    } finally {
      this.client = null;
      this.connectPromise = null;
      this.shuttingDown = false;
    }
  }
}

export const RedisClient = new RedisClientManager();
