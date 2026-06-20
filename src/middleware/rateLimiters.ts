import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import { createRateLimitStore } from "@/infrastructure/redis/rate-limit-store";

const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

const noopLimiter: RequestHandler = (_req, _res, next) => next();

const createLimiter = (name: string, options: Parameters<typeof rateLimit>[0]): RequestHandler => {
  if (isTestEnv) return noopLimiter;

  const store = createRateLimitStore(name);
  return rateLimit(store ? { ...options, store } : options) as RequestHandler;
};

export const loginLimiter: RequestHandler = createLimiter("login", {
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts, please try again after 15 minutes" },
});

export const registerLimiter: RequestHandler = createLimiter("register", {
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many registration attempts, please try again later" },
});

export const refreshLimiter: RequestHandler = createLimiter("refresh", {
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many token refresh attempts, please try again later" },
});

export const passwordResetLimiter: RequestHandler = createLimiter("password-reset", {
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many password reset requests, please try again later" },
});

export const emailVerificationLimiter: RequestHandler = createLimiter("email-verification", {
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many verification requests, please try again later",
  },
});

export const uploadLimiter: RequestHandler = createLimiter("upload", {
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many upload attempts, please try again later" },
});

export const newsletterLimiter: RequestHandler = createLimiter("newsletter", {
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many newsletter subscription attempts, please try again later",
  },
});
