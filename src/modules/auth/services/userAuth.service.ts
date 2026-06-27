import crypto from "crypto";
import type { IUser } from "@/modules/auth/types/user.types";
import { AppError } from "@/shared/errors/AppError";
import emailService from "@/infrastructure/email/email.service";
import { JwtUtil } from "@/modules/auth/utils/jwt";
import authSessionService from "./auth-session.service";
import authActivityService from "./auth-activity.service";
import authLockoutService from "./auth-lockout.service";
import { normalizeEmail } from "@/modules/auth/utils/email";
import { env } from "@/config/env";
import userRepository from "@/modules/auth/repositories/user.repository";
import driverRepository from "@/modules/drivers/repositories/driver.repository";
import {
  AuthAuditContext,
  DRIVER_ROLE,
  USER_ACCOUNT_TYPE,
  toUserTokenPayload,
  toTokenPayload,
} from "@/modules/auth/types/auth.types";
import type { ActivityStatus, ActivityType } from "@/modules/auth/types/account-auth";

class UserAuthService {
  async findUserById(id: string) {
    return userRepository.findById(id);
  }

  async getProfileResponse(user: IUser) {
    const profile = user.toObject();

    if (user.role === DRIVER_ROLE && !profile.avatar?.trim()) {
      const application = await driverRepository.findByUserId(user._id.toString());
      const profilePhoto = application?.profilePhoto?.trim();

      if (profilePhoto) {
        profile.avatar = profilePhoto;
        user.avatar = profilePhoto;
        await userRepository.save(user);
      }
    }

    return profile;
  }

  private async issueTokens(user: IUser, audit: AuthAuditContext) {
    const tokenPayload = toTokenPayload(user._id.toString(), user.role, USER_ACCOUNT_TYPE);
    const accessToken = JwtUtil.generateAccessToken(tokenPayload);
    const refreshToken = JwtUtil.generateRefreshToken(tokenPayload);
    await authSessionService.create(user._id.toString(), USER_ACCOUNT_TYPE, refreshToken, audit);
    return { accessToken, refreshToken };
  }

  private async setEmailVerificationToken(user: IUser) {
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.isVerified = false;
    await userRepository.save(user);
    return verificationToken;
  }

  async register(data: Record<string, unknown>, audit: AuthAuditContext) {
    const {
      firstName,
      lastName,
      email: rawEmail,
      password,
      phoneNumber,
      phone,
      companyName,
      businessProfile,
    } = data as {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phoneNumber?: string;
      phone?: string;
      companyName?: string;
      businessProfile?: string;
    };

    const email = normalizeEmail(rawEmail);

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError("An account with this email already exists", 409);
    }

    let user: IUser;
    try {
      user = await userRepository.create({
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber || phone,
        companyName,
        businessProfile,
        password,
        status: "active",
      });
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) {
        throw new AppError("An account with this email already exists", 409);
      }
      throw err;
    }

    if (env.REQUIRE_EMAIL_VERIFICATION) {
      const verificationToken = await this.setEmailVerificationToken(user);
      await emailService.sendEmailVerification(user, verificationToken);
      return { user, accessToken: "", refreshToken: "" };
    }

    user.isVerified = true;
    await userRepository.save(user);

    const tokens = await this.issueTokens(user, audit);
    await authActivityService.log(user._id.toString(), USER_ACCOUNT_TYPE, audit, "login");

    return { user, ...tokens };
  }

  async verifyEmail(token: string, audit: AuthAuditContext) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await userRepository.findByEmailVerificationToken(hashedToken);

    if (!user) {
      throw new AppError("Verification link is invalid or has expired", 400);
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.status = "active";
    await userRepository.save(user);

    await authActivityService.log(user._id.toString(), USER_ACCOUNT_TYPE, audit, "email_verified");

    const tokens = await this.issueTokens(user, audit);
    return { user, ...tokens };
  }

  async resendVerificationEmail(data: { email: string }) {
    const { email } = data;

    const user = await userRepository.findByEmail(normalizeEmail(email));
    if (!user || user.isVerified) return;

    const verificationToken = await this.setEmailVerificationToken(user);
    await emailService.sendEmailVerification(user, verificationToken);
  }

  async login(data: { email: string; password: string }, audit: AuthAuditContext) {
    const { email, password } = data;

    const user = await userRepository.findByEmailWithPassword(normalizeEmail(email));
    if (!user) throw new AppError("Invalid credentials", 401);

    authLockoutService.assertNotLocked(user, USER_ACCOUNT_TYPE);

    if (user.status === "suspended") {
      throw new AppError("Account is suspended", 403);
    }

    if (user.status !== "active") {
      throw new AppError("Account is not active", 403);
    }

    if (env.REQUIRE_EMAIL_VERIFICATION && !user.isVerified) {
      throw new AppError("Please verify your email before logging in", 403);
    }

    if (!(await authLockoutService.verifyPassword(user, password, USER_ACCOUNT_TYPE, audit))) {
      throw new AppError("Invalid credentials", 401);
    }

    user.lastLogin = new Date();
    await userRepository.save(user);

    const tokens = await this.issueTokens(user, audit);
    await authActivityService.log(user._id.toString(), USER_ACCOUNT_TYPE, audit, "login");

    return { user, ...tokens };
  }

  async refreshToken(token: string) {
    return authSessionService.rotate(token, USER_ACCOUNT_TYPE, async (userId) => {
      const user = await userRepository.findById(userId);
      if (!user || user.status !== "active") return null;
      if (env.REQUIRE_EMAIL_VERIFICATION && !user.isVerified) return null;
      return toUserTokenPayload(user._id.toString(), user.role);
    });
  }

  async logout(refreshToken: string, userId: string) {
    await authSessionService.invalidate(refreshToken, userId, USER_ACCOUNT_TYPE);
  }

  async logoutAllDevices(userId: string) {
    await Promise.all([
      authSessionService.invalidateAll(userId, USER_ACCOUNT_TYPE),
      userRepository.updatePasswordChangedAt(userId),
    ]);
  }

  async changePassword(
    userId: string,
    data: { oldPassword: string; newPassword: string },
    audit: AuthAuditContext
  ) {
    const { oldPassword, newPassword } = data;

    const user = await userRepository.findByIdWithPassword(userId);
    if (!user || !(await user.comparePassword(oldPassword))) {
      throw new AppError("Current password is incorrect", 401);
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await userRepository.save(user);

    await authSessionService.invalidateAll(userId, USER_ACCOUNT_TYPE);
    await authActivityService.log(userId, USER_ACCOUNT_TYPE, audit, "password_change");
  }

  async forgotPassword(data: { email: string }, audit: AuthAuditContext) {
    const { email } = data;

    const user = await userRepository.findByEmail(normalizeEmail(email));
    if (!user) return;

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await userRepository.save(user);

    await emailService.sendForgotPasswordEmail(user, resetToken);
    await authActivityService.log(
      user._id.toString(),
      USER_ACCOUNT_TYPE,
      audit,
      "password_reset_request"
    );
  }

  async resetPassword(data: { token: string; password: string }, audit: AuthAuditContext) {
    const { token, password } = data;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await userRepository.findByResetToken(hashedToken);

    if (!user) {
      throw new AppError("Token is invalid or has expired", 400);
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.passwordChangedAt = new Date();
    await userRepository.save(user);

    await authSessionService.invalidateAll(user._id.toString(), USER_ACCOUNT_TYPE);
    await authActivityService.log(user._id.toString(), USER_ACCOUNT_TYPE, audit, "password_reset");
  }

  async updateProfile(userId: string, data: Record<string, unknown>, audit: AuthAuditContext) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const allowed = [
      "firstName",
      "lastName",
      "phoneNumber",
      "avatar",
      "companyName",
      "businessProfile",
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        (user as unknown as Record<string, unknown>)[key] = data[key];
      }
    }

    await userRepository.save(user);
    await authActivityService.log(userId, USER_ACCOUNT_TYPE, audit, "update_profile");
    return user;
  }

  async getSessions(userId: string) {
    return authSessionService.listForUser(userId, USER_ACCOUNT_TYPE);
  }

  async revokeSession(userId: string, sessionId: string, audit: AuthAuditContext) {
    const revoked = await authSessionService.revokeById(sessionId, userId, USER_ACCOUNT_TYPE);
    if (!revoked) throw new AppError("Session not found", 404);

    await authActivityService.log(userId, USER_ACCOUNT_TYPE, audit, "session_revoked");
  }

  async logActivity(
    userId: string,
    audit: AuthAuditContext,
    type: ActivityType,
    status: ActivityStatus = "success"
  ) {
    return authActivityService.log(userId, USER_ACCOUNT_TYPE, audit, type, status);
  }

  async getActivities(userId: string) {
    return authActivityService.getRecent(userId, USER_ACCOUNT_TYPE);
  }
}

export default new UserAuthService();
