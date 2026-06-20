import { Response } from "express";
import { env } from "@/config/env";
import { generateCsrfToken } from "@/shared/utils/csrf";
import { parseDurationToMs } from "./duration";

const isProduction = env.NODE_ENV === "production";

const getCookieOptions = (maxAgeInMs: number, httpOnly = true) => {
  const options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "none" | "lax";
    expires?: Date;
  } = {
    httpOnly,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  };

  if (maxAgeInMs > 0) {
    options.expires = new Date(Date.now() + maxAgeInMs);
  }

  return options;
};

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
  const clearOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
  };
  res.clearCookie("accessToken", clearOptions);
  res.clearCookie("refreshToken", clearOptions);
  res.clearCookie("csrfToken", { ...clearOptions, httpOnly: false });
};

export const clearUserAuthCookies = (res: Response): void => {
  const clearOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
  };
  res.clearCookie("userAccessToken", clearOptions);
  res.clearCookie("userRefreshToken", clearOptions);
  res.clearCookie("csrfToken", { ...clearOptions, httpOnly: false });
};
