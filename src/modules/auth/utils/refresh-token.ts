import type { Request } from "express";
import { env } from "@/config/env";

export const getRefreshTokenFromRequest = (
  req: Request,
  cookieName: "refreshToken" | "userRefreshToken"
): string | undefined => {
  const cookieToken = req.cookies?.[cookieName];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }

  if (env.NODE_ENV !== "production") {
    const bodyToken = req.body?.refreshToken;
    if (typeof bodyToken === "string" && bodyToken.length > 0) {
      return bodyToken;
    }
  }

  return undefined;
};
