import { Response } from "express";
import { env } from "@/config/env";
import { generateCsrfToken } from "@/shared/utils/csrf";
import { parseDurationToMs } from "./duration";

const isProduction = env.NODE_ENV === "production";

const getCookieDomain = (): string | undefined => {
  if (!isProduction) return undefined;

  const configured = process.env.COOKIE_DOMAIN?.trim();
  if (configured) {
    return configured.startsWith(".") ? configured : `.${configured}`;
  }

  try {
    const hostname = new URL(env.DRIVER_PORTAL_URL || env.ADMIN_FRONTEND_URL).hostname;
    if (hostname === "localhost" || hostname.endsWith(".localhost")) return undefined;
    const parts = hostname.split(".");
    if (parts.length >= 2) return `.${parts.slice(-2).join(".")}`;
  } catch {
    // ignore invalid URL
  }

  return undefined;
};

const cookieDomain = getCookieDomain();

const getCookieOptions = (maxAgeInMs: number, httpOnly = true) => {
  const options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "none" | "lax";
    domain?: string;
    expires?: Date;
  } = {
    httpOnly,
    secure: isProduction,
    sameSite: isProduction ? "lax" : "lax",
  };

  if (cookieDomain) {
    options.domain = cookieDomain;
  }

  if (maxAgeInMs > 0) {
    options.expires = new Date(Date.now() + maxAgeInMs);
  }

  return options;
};

const getClearCookieOptions = (httpOnly = true) => ({
  httpOnly,
  secure: isProduction,
  sameSite: isProduction ? ("lax" as const) : ("lax" as const),
  ...(cookieDomain ? { domain: cookieDomain } : {}),
});

const setCsrfCookie = (res: Response): void => {
  const csrfToken = generateCsrfToken();
  res.cookie("csrfToken", csrfToken, getCookieOptions(24 * 60 * 60 * 1000, false));
  res.setHeader("X-CSRF-Token", csrfToken);
};

export const setAdminAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
  rememberMe = false
): void => {
  const accessMaxAge = parseDurationToMs(env.JWT_EXPIRES_IN);
  const refreshMaxAge = rememberMe ? parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN) : 0;

  res.cookie("accessToken", accessToken, getCookieOptions(accessMaxAge));
  res.cookie("refreshToken", refreshToken, getCookieOptions(refreshMaxAge));
  setCsrfCookie(res);
};

export const setUserAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
  rememberMe = false
): void => {
  const accessMaxAge = parseDurationToMs(env.JWT_EXPIRES_IN);
  const refreshMaxAge = rememberMe ? parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN) : 0;

  res.cookie("userAccessToken", accessToken, getCookieOptions(accessMaxAge));
  res.cookie("userRefreshToken", refreshToken, getCookieOptions(refreshMaxAge));
  setCsrfCookie(res);
};

export const clearAdminAuthCookies = (res: Response): void => {
  const clearOptions = getClearCookieOptions(true);
  res.clearCookie("accessToken", clearOptions);
  res.clearCookie("refreshToken", clearOptions);
  res.clearCookie("csrfToken", getClearCookieOptions(false));
};

export const clearUserAuthCookies = (res: Response): void => {
  const clearOptions = getClearCookieOptions(true);
  res.clearCookie("userAccessToken", clearOptions);
  res.clearCookie("userRefreshToken", clearOptions);
  res.clearCookie("csrfToken", getClearCookieOptions(false));
};
