import { Request, Response, NextFunction } from "express";
import { AppError } from "@/shared/errors/AppError";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const usesBearerAuth = (req: Request): boolean =>
  Boolean(req.headers.authorization?.startsWith("Bearer "));

export const csrfProtection = (req: Request, _res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (usesBearerAuth(req)) {
    return next();
  }

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.get("X-CSRF-Token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new AppError("Invalid or missing CSRF token", 403));
  }

  next();
};
