import { RedisStore, type RedisReply } from "rate-limit-redis";
import type { Store } from "express-rate-limit";
import { RedisClient } from "@/infrastructure/redis/client";
import { env } from "@/config/env";

export const createRateLimitStore = (name: string): Store | undefined => {
  if (!env.REDIS_ENABLED || RedisClient.isDevUnavailable() || !RedisClient.isConnected()) {
    return undefined;
  }

  return new RedisStore({
    sendCommand: async (...args: string[]) => {
      const client = await RedisClient.connect();
      if (!client) {
        throw new Error("Redis is not available for rate limiting");
      }
      return client.sendCommand(args) as Promise<RedisReply>;
    },
    prefix: `rl:${name}:`,
  });
};

/** @deprecated Use createRateLimitStore with a unique name per limiter */
export const getRateLimitStore = (): Store | undefined => createRateLimitStore("legacy");
