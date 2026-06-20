import { AppError } from "@/shared/errors/AppError";
import authService from "../services/auth.service";
import userAuthService from "../services/userAuth.service";
import { JwtUtil } from "./jwt";
import type { TokenPayload } from "../types/auth.types";
import type { AccountUserType } from "../types/account-auth";

export interface VerifiedAccount {
  userId: string;
  role: string;
  type: AccountUserType;
}

export const rejectStaleToken = (decoded: TokenPayload, passwordChangedAt?: Date): void => {
  if (!passwordChangedAt || decoded.iat === undefined) {
    return;
  }

  const changedAt = Math.floor(passwordChangedAt.getTime() / 1000);
  if (decoded.iat < changedAt) {
    throw new AppError("User recently changed password! Please log in again.", 401);
  }
};

export const verifyAccessTokenAccount = async (token: string): Promise<VerifiedAccount> => {
  const decoded = JwtUtil.verifyAccessToken(token);

  if (decoded.type === "admin") {
    const admin = await authService.findAdminById(decoded.id);
    if (!admin) {
      throw new AppError("User no longer exists", 401);
    }
    rejectStaleToken(decoded, admin.passwordChangedAt);
    return { userId: decoded.id, role: decoded.role, type: "admin" };
  }

  if (decoded.type === "user") {
    const user = await userAuthService.findUserById(decoded.id);
    if (!user) {
      throw new AppError("User no longer exists", 401);
    }
    rejectStaleToken(decoded, user.passwordChangedAt);
    if (user.status !== "active") {
      throw new AppError("Account is not active", 403);
    }
    return { userId: decoded.id, role: decoded.role, type: "user" };
  }

  throw new AppError("Invalid token type", 401);
};
