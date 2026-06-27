import { Response } from "express";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorCode?: string;
  options?: Record<string, unknown>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    pages?: number;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  pages: number;
}

export const sendSuccess = <T = unknown>(
  res: Response,
  data?: T,
  options?: {
    message?: string;
    statusCode?: number;
    meta?: PaginationMeta;
    options?: Record<string, unknown>;
  }
): Response => {
  const response: ApiResponse<T> = {
    success: true,
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (options?.message) {
    response.message = options.message;
  }

  if (options?.meta) {
    response.meta = options.meta;
  }

  if (options?.options) {
    response.options = options.options;
  }

  const statusCode = options?.statusCode || 200;
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  error: string,
  statusCode: number = 400,
  errorCode?: string
): Response => {
  return res.status(statusCode).json({
    success: false,
    error,
    ...(errorCode ? { errorCode } : {}),
  });
};
