import dotenv from "dotenv";
import path from "path";

const DEV_JWT_SECRET = "dev_only_jwt_secret_change_me_32chars_min";
const DEV_JWT_REFRESH_SECRET = "dev_only_refresh_secret_change_me_32";

const nodeEnv = process.env.NODE_ENV || "development";
const envFile =
  nodeEnv === "production"
    ? ".env.production"
    : nodeEnv === "development"
      ? ".env"
      : `.env.${nodeEnv}`;

dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_USER: string;
  EMAIL_PASS: string;
  EMAIL_FROM: string;
  DEFAULT_ADMIN_EMAIL: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  LOG_LEVEL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  FRONTEND_URL: string;
  ADMIN_FRONTEND_URL: string;
  corsOrigins: string[];
  REQUIRE_EMAIL_VERIFICATION: boolean;
  MAX_SESSIONS_PER_USER: number;
  BCRYPT_ROUNDS: number;
  TRUST_PROXY_HOPS: number;
  REDIS_URL: string;
  REDIS_ENABLED: boolean;
  REDIS_CONNECT_TIMEOUT_MS: number;
  REDIS_MAX_RETRIES: number;
  SOCKET_ENABLED: boolean;
  SOCKET_PATH: string;
  HEALTH_CHECK_TOKEN: string;
  SENTRY_DSN: string;
  SENTRY_ENABLED: boolean;
  SENTRY_TRACES_SAMPLE_RATE: number;
}

const buildCorsOrigins = (frontendUrl: string, adminFrontendUrl: string): string[] => [
  ...new Set([frontendUrl, adminFrontendUrl].filter(Boolean)),
];

const getEnvConfig = (): EnvConfig => {
  const isProduction = nodeEnv === "production";
  const isSecureEnv = nodeEnv === "production" || nodeEnv === "staging";

  const redisUrl = process.env.REDIS_URL || "";
  const redisExplicitlyEnabled = process.env.REDIS_ENABLED === "true";
  const redisExplicitlyDisabled = process.env.REDIS_ENABLED === "false";
  const socketEnabled = process.env.SOCKET_ENABLED !== "false";
  const sentryDsn = process.env.SENTRY_DSN || "";

  let redisEnabled = redisExplicitlyEnabled || (Boolean(redisUrl) && !redisExplicitlyDisabled);

  if (isProduction) {
    redisEnabled = true;
  }

  const requiredEnvVars = [
    "MONGODB_URI",
    "EMAIL_HOST",
    "EMAIL_USER",
    "EMAIL_PASS",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
  ];

  if (isProduction) {
    requiredEnvVars.push("FRONTEND_URL", "ADMIN_FRONTEND_URL", "HEALTH_CHECK_TOKEN", "REDIS_URL");
  }

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(", ")}`;
    if (isProduction) {
      throw new Error(errorMessage);
    }
    console.warn(`[ENV WARNING] ${errorMessage}`);
  }

  if (isProduction && !redisUrl) {
    throw new Error("REDIS_URL is required in production");
  }

  if (isProduction && socketEnabled && !redisEnabled) {
    throw new Error("Redis must be enabled when Socket.IO is enabled in production");
  }

  const sentryExplicitlyEnabled = process.env.SENTRY_ENABLED === "true";
  if (sentryExplicitlyEnabled && !sentryDsn) {
    const message = "SENTRY_DSN is required when SENTRY_ENABLED=true";
    if (isProduction) {
      throw new Error(message);
    }
    console.warn(`[ENV WARNING] ${message}`);
  }

  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (isProduction) {
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters in production");
    }
    if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
      throw new Error("JWT_REFRESH_SECRET must be at least 32 characters in production");
    }
    if (jwtSecret === jwtRefreshSecret) {
      throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be different in production");
    }
  }

  if (isSecureEnv) {
    if (!jwtSecret || jwtSecret === DEV_JWT_SECRET) {
      throw new Error("JWT_SECRET must be set to a secure value in production/staging");
    }
    if (!jwtRefreshSecret || jwtRefreshSecret === DEV_JWT_REFRESH_SECRET) {
      throw new Error("JWT_REFRESH_SECRET must be set to a secure value in production/staging");
    }
  }

  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
  if (bcryptRounds < 10 || bcryptRounds > 15) {
    const message = "BCRYPT_ROUNDS must be between 10 and 15";
    if (isProduction) {
      throw new Error(message);
    }
    console.warn(`[ENV WARNING] ${message}`);
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const adminFrontendUrl = process.env.ADMIN_FRONTEND_URL || "http://localhost:3001";
  const sentryEnabled = sentryExplicitlyEnabled && Boolean(sentryDsn);

  const tracesSampleRate = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.2");

  return {
    NODE_ENV: nodeEnv,
    PORT: parseInt(process.env.PORT || "5000", 10),
    MONGODB_URI: process.env.MONGODB_URI || "",
    EMAIL_HOST: process.env.EMAIL_HOST || "",
    EMAIL_PORT: parseInt(process.env.EMAIL_PORT || "587", 10),
    EMAIL_USER: process.env.EMAIL_USER || "",
    EMAIL_PASS: process.env.EMAIL_PASS || "",
    EMAIL_FROM: process.env.EMAIL_FROM || "noreply@cityairporttaxis.com",
    DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL || "admin@cityairporttaxis.com",
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
    JWT_SECRET: jwtSecret || DEV_JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
    JWT_REFRESH_SECRET: jwtRefreshSecret || DEV_JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    FRONTEND_URL: frontendUrl,
    ADMIN_FRONTEND_URL: adminFrontendUrl,
    corsOrigins: buildCorsOrigins(frontendUrl, adminFrontendUrl),
    REQUIRE_EMAIL_VERIFICATION: process.env.REQUIRE_EMAIL_VERIFICATION !== "false",
    MAX_SESSIONS_PER_USER: parseInt(process.env.MAX_SESSIONS_PER_USER || "10", 10),
    BCRYPT_ROUNDS: bcryptRounds,
    TRUST_PROXY_HOPS: parseInt(process.env.TRUST_PROXY_HOPS || "1", 10),
    REDIS_URL: redisUrl,
    REDIS_ENABLED: redisEnabled,
    REDIS_CONNECT_TIMEOUT_MS: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || "10000", 10),
    REDIS_MAX_RETRIES: parseInt(process.env.REDIS_MAX_RETRIES || "10", 10),
    SOCKET_ENABLED: socketEnabled,
    SOCKET_PATH: process.env.SOCKET_PATH || "/socket.io",
    HEALTH_CHECK_TOKEN: process.env.HEALTH_CHECK_TOKEN || "",
    SENTRY_DSN: sentryDsn,
    SENTRY_ENABLED: sentryEnabled,
    SENTRY_TRACES_SAMPLE_RATE:
      Number.isFinite(tracesSampleRate) && tracesSampleRate >= 0 && tracesSampleRate <= 1
        ? tracesSampleRate
        : 0.2,
  };
};

export const env = getEnvConfig();
