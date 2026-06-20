import { env } from "@/config/env";

export const parseDurationToMs = (duration: string): number => {
  const value = parseInt(duration, 10);
  if (duration.endsWith("m")) return value * 60 * 1000;
  if (duration.endsWith("h")) return value * 60 * 60 * 1000;
  if (duration.endsWith("d")) return value * 24 * 60 * 60 * 1000;
  return value;
};

export const getRefreshExpiryDate = (): Date => {
  return new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN));
};
