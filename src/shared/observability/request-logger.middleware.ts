import { Request, Response, NextFunction } from "express";
import {
  createRequestContext,
  runWithRequestContext,
} from "@/shared/observability/request-context";
import {
  incrementRequestCount,
  incrementSlowRequestCount,
  SLOW_REQUEST_THRESHOLD_MS,
} from "@/shared/observability/metrics";
import logger from "@/shared/utils/logger";

export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId =
    (req.headers["x-correlation-id"] as string) ||
    (req.headers["x-request-id"] as string) ||
    undefined;

  const context = createRequestContext(correlationId);
  req.correlationId = context.correlationId;
  req.traceId = context.traceId;

  res.setHeader("X-Correlation-Id", context.correlationId);
  res.setHeader("X-Trace-Id", context.traceId);

  const start = process.hrtime.bigint();

  runWithRequestContext(context, () => {
    incrementRequestCount();

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const isSlow = durationMs >= SLOW_REQUEST_THRESHOLD_MS;

      if (isSlow) {
        incrementSlowRequestCount();
      }

      logger.info("HTTP request completed", {
        correlationId: context.correlationId,
        traceId: context.traceId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        slow: isSlow,
        userId: req.user?._id?.toString(),
        adminId: req.admin?._id?.toString(),
      });
    });

    next();
  });
};
