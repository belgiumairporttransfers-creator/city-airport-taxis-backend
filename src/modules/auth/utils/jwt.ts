import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "@/config/env";
import type { TokenPayload } from "../types/auth.types";

export type { TokenPayload };

export class JwtUtil {
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });
  }

  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  }

  static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}
