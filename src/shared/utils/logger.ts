import winston from "winston";
import { env } from "@/config/env";
import { getRequestContext } from "@/shared/observability/request-context";

const isProduction = env.NODE_ENV === "production";

const contextFormat = winston.format((info) => {
  const ctx = getRequestContext();
  if (ctx) {
    info.correlationId = ctx.correlationId;
    info.traceId = ctx.traceId;
    if (ctx.userId) info.userId = ctx.userId;
    if (ctx.adminId) info.adminId = ctx.adminId;
  }
  return info;
});

const jsonFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.timestamp(),
  contextFormat(),
  winston.format.json()
);

const devConsoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  contextFormat(),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const { service: _service, ...rest } = meta;
    const metaKeys = Object.keys(rest).filter((key) => rest[key] !== undefined);
    const metaStr = metaKeys.length ? ` ${JSON.stringify(rest)}` : "";
    const stackStr = stack ? `\n${stack}` : "";
    return `${timestamp} ${level}: ${message}${metaStr}${stackStr}`;
  })
);

const transports: winston.transport[] = [];

if (isProduction) {
  transports.push(new winston.transports.Console({ format: jsonFormat }));
} else {
  transports.push(
    new winston.transports.File({ filename: "logs/error.log", level: "error", format: jsonFormat }),
    new winston.transports.File({ filename: "logs/combined.log", format: jsonFormat }),
    new winston.transports.Console({ format: devConsoleFormat })
  );
}

const logger = winston.createLogger({
  level: env.LOG_LEVEL || "info",
  defaultMeta: { service: "city-airport-taxis-api" },
  transports,
});

export const createChildLogger = (meta: Record<string, unknown>) => logger.child(meta);

export default logger;
