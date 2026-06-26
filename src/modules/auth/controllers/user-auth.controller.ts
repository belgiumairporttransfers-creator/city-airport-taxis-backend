import { Request, Response } from "express";
import userAuthService from "../services/userAuth.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { setUserAuthCookies, clearUserAuthCookies } from "../utils/cookie";
import { AppError } from "@/shared/errors/AppError";
import { env } from "@/config/env";
import { getAuthAuditContext } from "../utils/auth-audit";
import { getRefreshTokenFromRequest } from "../utils/refresh-token";

class UserAuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await userAuthService.register(
      req.body,
      getAuthAuditContext(req)
    );

    if (!accessToken && env.REQUIRE_EMAIL_VERIFICATION && !user.isVerified) {
      return sendSuccess(res, user.toObject(), {
        message:
          "Registration successful. Please check your email to verify your account before signing in.",
      });
    }

    setUserAuthCookies(res, accessToken, refreshToken, req.body.rememberMe);
    return sendSuccess(res, user.toObject(), { message: "Authentication successful" });
  });

  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await userAuthService.verifyEmail(
      req.body.token,
      getAuthAuditContext(req)
    );

    setUserAuthCookies(res, accessToken, refreshToken, false);
    return sendSuccess(res, user.toObject(), { message: "Email verified successfully" });
  });

  resendVerification = asyncHandler(async (req: Request, res: Response) => {
    await userAuthService.resendVerificationEmail(req.body);
    return sendSuccess(res, undefined, {
      message: "If an unverified account exists, a verification email has been sent.",
    });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await userAuthService.login(
      req.body,
      getAuthAuditContext(req)
    );

    setUserAuthCookies(res, accessToken, refreshToken, req.body.rememberMe);
    return sendSuccess(res, user.toObject(), { message: "Authentication successful" });
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const token = getRefreshTokenFromRequest(req, "userRefreshToken");
    if (!token) throw new AppError("Refresh token missing", 401);

    const { accessToken, refreshToken } = await userAuthService.refreshToken(token);

    setUserAuthCookies(res, accessToken, refreshToken, Boolean(req.body.rememberMe));
    return sendSuccess(res, undefined, { message: "Authentication successful" });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const token = getRefreshTokenFromRequest(req, "userRefreshToken");

    if (token && req.user) {
      await userAuthService.logout(token, req.user._id.toString());
      await userAuthService.logActivity(
        req.user._id.toString(),
        getAuthAuditContext(req),
        "logout"
      );
    }

    clearUserAuthCookies(res);
    return sendSuccess(res, undefined, { message: "Logged out successfully" });
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    await userAuthService.changePassword(
      req.user._id.toString(),
      req.body,
      getAuthAuditContext(req)
    );

    return sendSuccess(res, undefined, {
      message: "Password updated successfully. All other sessions revoked.",
    });
  });

  logoutAllDevices = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    await userAuthService.logoutAllDevices(req.user._id.toString());
    await userAuthService.logActivity(
      req.user._id.toString(),
      getAuthAuditContext(req),
      "logout_all"
    );

    clearUserAuthCookies(res);
    return sendSuccess(res, undefined, { message: "Logged out successfully" });
  });

  getActivities = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const activities = await userAuthService.getActivities(req.user._id.toString());
    return sendSuccess(res, activities);
  });

  getSessions = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const sessions = await userAuthService.getSessions(req.user._id.toString());
    return sendSuccess(res, sessions);
  });

  revokeSession = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    await userAuthService.revokeSession(
      req.user._id.toString(),
      req.params.sessionId,
      getAuthAuditContext(req)
    );
    return sendSuccess(res, undefined, { message: "Session revoked successfully" });
  });

  getMe = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    return sendSuccess(res, req.user.toObject());
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    await userAuthService.forgotPassword(req.body, getAuthAuditContext(req));
    return sendSuccess(res, undefined, {
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    await userAuthService.resetPassword(req.body, getAuthAuditContext(req));
    return sendSuccess(res, undefined, {
      message: "Password reset successfully. You can now log in with your new password.",
    });
  });

  setPassword = asyncHandler(async (req: Request, res: Response) => {
    await userAuthService.resetPassword(req.body, getAuthAuditContext(req));
    return sendSuccess(res, undefined, {
      message: "Password set successfully. You can now log in to the driver portal.",
    });
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const user = await userAuthService.updateProfile(
      req.user._id.toString(),
      req.body,
      getAuthAuditContext(req)
    );

    return sendSuccess(res, user.toObject(), { message: "Profile updated successfully" });
  });
}

export default new UserAuthController();
