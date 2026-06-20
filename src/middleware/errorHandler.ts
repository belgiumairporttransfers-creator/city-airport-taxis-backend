import { Request, Response, NextFunction } from "express";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes, mapStatusToErrorCode } from "@/shared/errors/error-codes";
import { incrementErrorCount } from "@/shared/observability/metrics";
import logger from "@/shared/utils/logger";
import { env } from "@/config/env";
import { captureException } from "@/shared/observability/apm";

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = { ...err } as AppError;
  error.message = err.message;

  incrementErrorCount();

  if (err.name === "CastError" || err.name === "BSONError") {
    error = new AppError("Invalid id format", 400, ErrorCodes.VALIDATION_FAILED);
  }

  if ((err as { code?: number }).code === 11000) {
    error = new AppError("Duplicate field value entered", 409, ErrorCodes.DUPLICATE_RESOURCE);
  }

  if (err.name === "ValidationError") {
    const message =
      env.NODE_ENV === "development"
        ? Object.values((err as unknown as { errors: Record<string, { message: string }> }).errors)
            .map((val) => val.message)
            .join(", ")
        : "Validation failed";
    error = new AppError(message, 422, ErrorCodes.VALIDATION_FAILED);
  }

  if (err.name === "MulterError") {
    error = new AppError("Invalid file upload", 400, ErrorCodes.UPLOAD_INVALID_FILE);
  }

  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid token", 401, ErrorCodes.AUTH_TOKEN_INVALID);
  }

  if (err.name === "TokenExpiredError") {
    error = new AppError("Token expired", 401, ErrorCodes.AUTH_TOKEN_EXPIRED);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  const isOperational = error.isOperational !== false;
  const errorCode = error.errorCode || mapStatusToErrorCode(statusCode, err.name);

  logger.error("Request error", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode,
    errorCode,
    isOperational,
    correlationId: req.correlationId,
    traceId: req.traceId,
    userId: req.user?._id?.toString(),
    adminId: req.admin?._id?.toString(),
  });

  if (!isOperational) {
    logger.error("Non-operational error detected", { errorCode, path: req.path });
    captureException(err instanceof Error ? err : new Error(message), {
      path: req.path,
      method: req.method,
      statusCode,
      errorCode,
      correlationId: req.correlationId,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    errorCode,
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
