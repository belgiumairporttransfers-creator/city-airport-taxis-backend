import { UAParser } from "ua-parser-js";
import { Types } from "mongoose";
import { JwtUtil } from "@/modules/auth/utils/jwt";
import type { TokenPayload } from "@/modules/auth/types/auth.types";
import { AppError } from "@/shared/errors/AppError";
import { env } from "@/config/env";
import { getRefreshExpiryDate } from "@/modules/auth/utils/duration";
import type { AuthAuditContext, AuthListQuery } from "@/modules/auth/types/auth.types";
import type { AccountUserType } from "@/modules/auth/types/account-auth";
import sessionRepository from "@/modules/auth/repositories/session.repository";

class AuthSessionService {
  async create(
    userId: string,
    userType: AccountUserType,
    refreshToken: string,
    audit: AuthAuditContext
  ) {
    const { ip, userAgent } = audit;

    await this.enforceMaxSessions(userId, userType);

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return sessionRepository.create({
      user: new Types.ObjectId(userId),
      userType,
      refreshToken: JwtUtil.hashToken(refreshToken),
      ipAddress: ip || "unknown",
      userAgent,
      device: result.device.model || "Desktop",
      browser: result.browser.name,
      os: result.os.name,
      expiresAt: getRefreshExpiryDate(),
    });
  }

  async rotate(
    refreshToken: string,
    userType: AccountUserType,
    buildPayload: (userId: string) => Promise<TokenPayload | null>
  ) {
    const decoded = JwtUtil.verifyRefreshToken(refreshToken);

    if (decoded.type !== userType) {
      throw new AppError("Invalid or compromised refresh token", 401);
    }

    const tokenPayload = await buildPayload(decoded.id);
    if (!tokenPayload) {
      await sessionRepository.invalidateAllForUser(decoded.id, userType);
      throw new AppError("Invalid or compromised refresh token", 401);
    }

    const newRefreshToken = JwtUtil.generateRefreshToken(tokenPayload);
    const newHashedRefresh = JwtUtil.hashToken(newRefreshToken);
    const hashedToken = JwtUtil.hashToken(refreshToken);

    const session = await sessionRepository.findOneAndUpdateRefreshToken(
      hashedToken,
      userType,
      decoded.id,
      newHashedRefresh
    );

    if (!session) {
      await sessionRepository.invalidateAllForUser(decoded.id, userType);
      throw new AppError("Invalid or compromised refresh token", 401);
    }

    const accessToken = JwtUtil.generateAccessToken(tokenPayload);
    return { accessToken, refreshToken: newRefreshToken };
  }

  async invalidate(refreshToken: string, userId: string, userType: AccountUserType) {
    const hashedToken = JwtUtil.hashToken(refreshToken);
    await sessionRepository.invalidateByRefreshToken(hashedToken, userId, userType);
  }

  async invalidateAll(userId: string, userType: AccountUserType) {
    await sessionRepository.invalidateAllForUser(userId, userType);
  }

  async listForUser(userId: string, userType: AccountUserType) {
    return sessionRepository.findValidForUser(userId, userType);
  }

  async listPaginatedForUser(userId: string, userType: AccountUserType, query: AuthListQuery) {
    const result = await sessionRepository.findWithPagination(userId, userType, query);

    return {
      items: result.data,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    };
  }

  async revokeById(sessionId: string, userId: string, userType: AccountUserType) {
    const result = await sessionRepository.revokeById(sessionId, userId, userType);
    return Boolean(result);
  }

  private async enforceMaxSessions(userId: string, userType: AccountUserType) {
    const max = env.MAX_SESSIONS_PER_USER;
    const sessions = await sessionRepository.findValidSessionIds(userId, userType);

    const excess = sessions.length - max + 1;
    if (excess <= 0) return;

    const toRevoke = sessions.slice(0, excess).map((s) => s._id);
    await sessionRepository.invalidateByIds(toRevoke);
  }
}

export default new AuthSessionService();
