import crypto from "crypto";
import { AppError } from "@/shared/errors/AppError";
import { JwtUtil } from "@/modules/auth/utils/jwt";
import authSessionService from "./auth-session.service";
import authActivityService from "./auth-activity.service";
import authLockoutService from "./auth-lockout.service";
import emailService from "@/infrastructure/email/email.service";
import { normalizeEmail } from "@/modules/auth/utils/email";
import adminRepository from "@/modules/auth/repositories/admin.repository";
import {
  ADMIN_ACCOUNT_TYPE,
  AuthAuditContext,
  AuthListQuery,
  toTokenPayload,
} from "@/modules/auth/types/auth.types";
import type { ActivityStatus, ActivityType } from "@/modules/auth/types/account-auth";

class AuthService {
  async findAdminById(id: string) {
    return adminRepository.findById(id);
  }

  async getMe(adminId: string) {
    const admin = await this.findAdminById(adminId);
    if (!admin) throw new AppError("User no longer exists", 401);

    const adminObj = admin.toObject();

    return {
      ...adminObj,
      name: `${adminObj.firstName} ${adminObj.lastName}`.trim(),
    };
  }

  async updateProfile(
    adminId: string,
    data: { firstName?: string; lastName?: string; phoneNumber?: string; avatar?: string },
    audit: AuthAuditContext
  ) {
    const admin = await adminRepository.findById(adminId);
    if (!admin) throw new AppError("User no longer exists", 404);

    const allowed = ["firstName", "lastName", "phoneNumber", "avatar"] as const;
    for (const key of allowed) {
      if (data[key] !== undefined) {
        admin[key] = data[key] as string;
      }
    }

    await adminRepository.save(admin);
    await authActivityService.log(adminId, ADMIN_ACCOUNT_TYPE, audit, "update_profile");
    return admin;
  }

  async login(data: { email: string; password: string }, audit: AuthAuditContext) {
    const { email, password } = data;

    const admin = await adminRepository.findByEmailWithPassword(normalizeEmail(email));
    if (!admin) throw new AppError("Invalid credentials", 401);

    authLockoutService.assertNotLocked(admin, ADMIN_ACCOUNT_TYPE);

    if (!(await authLockoutService.verifyPassword(admin, password, ADMIN_ACCOUNT_TYPE, audit))) {
      throw new AppError("Invalid credentials", 401);
    }

    admin.lastLogin = new Date();
    await adminRepository.save(admin);

    const tokenPayload = toTokenPayload(admin._id.toString(), admin.role, ADMIN_ACCOUNT_TYPE);
    const accessToken = JwtUtil.generateAccessToken(tokenPayload);
    const refreshToken = JwtUtil.generateRefreshToken(tokenPayload);

    await authSessionService.create(admin._id.toString(), ADMIN_ACCOUNT_TYPE, refreshToken, audit);
    await authActivityService.log(admin._id.toString(), ADMIN_ACCOUNT_TYPE, audit, "login");

    return { admin, accessToken, refreshToken };
  }

  async refreshToken(token: string) {
    return authSessionService.rotate(token, ADMIN_ACCOUNT_TYPE, async (userId) => {
      const admin = await adminRepository.findById(userId);
      if (!admin) return null;
      return toTokenPayload(admin._id.toString(), admin.role, ADMIN_ACCOUNT_TYPE);
    });
  }

  async logout(refreshToken: string, adminId: string) {
    await authSessionService.invalidate(refreshToken, adminId, ADMIN_ACCOUNT_TYPE);
  }

  async logoutAllDevices(adminId: string) {
    await Promise.all([
      authSessionService.invalidateAll(adminId, ADMIN_ACCOUNT_TYPE),
      adminRepository.updatePasswordChangedAt(adminId),
    ]);
  }

  async changePassword(
    adminId: string,
    data: { oldPassword: string; newPassword: string },
    audit: AuthAuditContext
  ) {
    const { oldPassword, newPassword } = data;

    const admin = await adminRepository.findByIdWithPassword(adminId);
    if (!admin || !(await admin.comparePassword(oldPassword))) {
      throw new AppError("Current password is incorrect", 401);
    }

    admin.password = newPassword;
    admin.passwordChangedAt = new Date();
    await adminRepository.save(admin);

    await authSessionService.invalidateAll(adminId, ADMIN_ACCOUNT_TYPE);
    await authActivityService.log(adminId, ADMIN_ACCOUNT_TYPE, audit, "password_change");
  }

  async forgotPassword(data: { email: string }, audit: AuthAuditContext) {
    const { email } = data;

    const admin = await adminRepository.findByEmail(normalizeEmail(email));
    if (!admin) return;

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    admin.resetPasswordToken = hashedToken;
    admin.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await adminRepository.save(admin);

    await emailService.sendAdminForgotPasswordEmail(admin, resetToken);
    await authActivityService.log(
      admin._id.toString(),
      ADMIN_ACCOUNT_TYPE,
      audit,
      "password_reset_request"
    );
  }

  async resetPassword(data: { token: string; password: string }, audit: AuthAuditContext) {
    const { token, password } = data;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const admin = await adminRepository.findByResetToken(hashedToken);

    if (!admin) throw new AppError("Token is invalid or has expired", 400);

    admin.password = password;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    admin.passwordChangedAt = new Date();
    await adminRepository.save(admin);

    await authSessionService.invalidateAll(admin._id.toString(), ADMIN_ACCOUNT_TYPE);
    await authActivityService.log(
      admin._id.toString(),
      ADMIN_ACCOUNT_TYPE,
      audit,
      "password_reset"
    );
  }

  async getSessions(adminId: string, query: AuthListQuery) {
    return authSessionService.listPaginatedForUser(adminId, ADMIN_ACCOUNT_TYPE, query);
  }

  async revokeSession(adminId: string, sessionId: string, audit: AuthAuditContext) {
    const revoked = await authSessionService.revokeById(sessionId, adminId, ADMIN_ACCOUNT_TYPE);
    if (!revoked) throw new AppError("Session not found", 404);

    await authActivityService.log(adminId, ADMIN_ACCOUNT_TYPE, audit, "session_revoked");
  }

  async logActivity(
    adminId: string,
    audit: AuthAuditContext,
    type: ActivityType,
    status: ActivityStatus = "success"
  ) {
    return authActivityService.log(adminId, ADMIN_ACCOUNT_TYPE, audit, type, status);
  }

  async getActivities(adminId: string, query: AuthListQuery) {
    return authActivityService.getPaginated(adminId, ADMIN_ACCOUNT_TYPE, query);
  }
}

export default new AuthService();
