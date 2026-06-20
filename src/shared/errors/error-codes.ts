export const ErrorCodes = {
  // Auth
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_ACCOUNT_LOCKED: "AUTH_ACCOUNT_LOCKED",
  AUTH_ACCOUNT_SUSPENDED: "AUTH_ACCOUNT_SUSPENDED",
  AUTH_EMAIL_NOT_VERIFIED: "AUTH_EMAIL_NOT_VERIFIED",
  AUTH_CSRF_FAILED: "AUTH_CSRF_FAILED",

  // Validation
  VALIDATION_FAILED: "VALIDATION_FAILED",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  DUPLICATE_RESOURCE: "DUPLICATE_RESOURCE",

  // Rate limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

  // Upload
  UPLOAD_INVALID_FILE: "UPLOAD_INVALID_FILE",
  UPLOAD_FAILED: "UPLOAD_FAILED",

  // Internal
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export const mapStatusToErrorCode = (statusCode: number, errName?: string): ErrorCode => {
  if (errName === "JsonWebTokenError") return ErrorCodes.AUTH_TOKEN_INVALID;
  if (errName === "TokenExpiredError") return ErrorCodes.AUTH_TOKEN_EXPIRED;

  switch (statusCode) {
    case 400:
      return ErrorCodes.VALIDATION_FAILED;
    case 401:
      return ErrorCodes.AUTH_UNAUTHORIZED;
    case 403:
      return ErrorCodes.AUTH_CSRF_FAILED;
    case 404:
      return ErrorCodes.RESOURCE_NOT_FOUND;
    case 409:
      return ErrorCodes.DUPLICATE_RESOURCE;
    case 423:
      return ErrorCodes.AUTH_ACCOUNT_LOCKED;
    case 429:
      return ErrorCodes.RATE_LIMIT_EXCEEDED;
    case 503:
      return ErrorCodes.SERVICE_UNAVAILABLE;
    default:
      return ErrorCodes.INTERNAL_ERROR;
  }
};
