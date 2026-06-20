import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "@/shared/errors/AppError";

export const isHealthAuthorized = (req: Request): boolean => {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const expectedToken = process.env.HEALTH_CHECK_TOKEN || "";
  if (!expectedToken) {
    return false;
  }

  const token = req.header("X-Health-Token");
  return token === expectedToken;
};

export const requireHealthAuth = (req: Request, _res: Response, next: NextFunction): void => {
  if (isHealthAuthorized(req)) {
    return next();
  }

  next(new UnauthorizedError("Health check access denied"));
};
