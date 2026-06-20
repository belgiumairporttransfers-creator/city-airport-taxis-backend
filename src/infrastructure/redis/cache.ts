import { RedisClient } from "@/infrastructure/redis/client";
import { incrementCacheHit, incrementCacheMiss } from "@/shared/observability/metrics";

const DEFAULT_TTL_SECONDS = 300;

export const getRedisClient = () => RedisClient.getClient();

export const isRedisAvailable = (): boolean => RedisClient.isConnected();

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const client = await RedisClient.connect();
  if (!client) return null;

  const value = await client.get(key);
  if (value === null) {
    incrementCacheMiss();
    return null;
  }

  incrementCacheHit();
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
};

export const cacheSet = async (
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<void> => {
  const client = await RedisClient.connect();
  if (!client) return;

  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  await client.set(key, serialized, { EX: ttlSeconds });
};

export const cacheDel = async (key: string): Promise<void> => {
  const client = await RedisClient.connect();
  if (!client) return;

  await client.del(key);
};

export const cacheInvalidatePattern = async (pattern: string): Promise<number> => {
  const client = await RedisClient.connect();
  if (!client) return 0;

  let cursor = 0;
  let deleted = 0;

  do {
    const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
    cursor = result.cursor;
    if (result.keys.length > 0) {
      deleted += await client.del(result.keys);
    }
  } while (cursor !== 0);

  return deleted;
};
