import type { ErrorCode } from "@/shared/errors/error-codes";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  errorCode?: ErrorCode;

  constructor(message: string, statusCode: number = 500, errorCode?: ErrorCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad Request", errorCode?: ErrorCode) {
    super(message, 400, errorCode);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized", errorCode?: ErrorCode) {
    super(message, 401, errorCode);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden", errorCode?: ErrorCode) {
    super(message, 403, errorCode);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", errorCode?: ErrorCode) {
    super(message, 404, errorCode);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists", errorCode?: ErrorCode) {
    super(message, 409, errorCode);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed", errorCode?: ErrorCode) {
    super(message, 422, errorCode);
  }
}
