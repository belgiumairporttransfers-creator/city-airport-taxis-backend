import { Request, Response, NextFunction } from "express";
import { AppError } from "@/shared/errors/AppError";
import { env } from "@/config/env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const usesBearerAuth = (req: Request): boolean =>
  Boolean(req.headers.authorization?.startsWith("Bearer "));

const isAllowedOrigin = (origin: string): boolean => env.corsOrigins.includes(origin);

export const csrfProtection = (req: Request, _res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (usesBearerAuth(req)) {
    return next();
  }

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.get("X-CSRF-Token");

  if (cookieToken && headerToken && cookieToken === headerToken) {
    return next();
  }

  // Cross-subdomain SPA: the browser sends the csrf cookie to the API, but JS on
  // driver/admin subdomains cannot read it for the X-CSRF-Token header. Origin is
  // not forgeable, and SameSite=Lax blocks cross-site cookie use anyway.
  const origin = req.get("Origin");
  if (cookieToken && origin && isAllowedOrigin(origin)) {
    return next();
  }

  return next(new AppError("Invalid or missing CSRF token", 403));
};
