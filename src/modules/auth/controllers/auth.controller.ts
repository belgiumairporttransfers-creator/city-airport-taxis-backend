import { Request, Response } from "express";
import authService from "../services/auth.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { setAdminAuthCookies, clearAdminAuthCookies } from "../utils/cookie";
import { AppError } from "@/shared/errors/AppError";
import { getAuthAuditContext } from "../utils/auth-audit";
import { getRefreshTokenFromRequest } from "../utils/refresh-token";

class AuthController {
  login = asyncHandler(async (req: Request, res: Response) => {
    const { admin, accessToken, refreshToken } = await authService.login(
      req.body,
      getAuthAuditContext(req)
    );

    setAdminAuthCookies(res, accessToken, refreshToken, req.body.rememberMe);
    return sendSuccess(res, admin.toObject(), { message: "Authentication successful" });
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const token = getRefreshTokenFromRequest(req, "refreshToken");
    if (!token) throw new AppError("Refresh token missing", 401);

    const { accessToken, refreshToken } = await authService.refreshToken(token);

    setAdminAuthCookies(res, accessToken, refreshToken, Boolean(req.body.rememberMe));
    return sendSuccess(res, undefined, { message: "Authentication successful" });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const token = getRefreshTokenFromRequest(req, "refreshToken");

    if (token && req.admin) {
      await authService.logout(token, req.admin._id.toString());
      await authService.logActivity(req.admin._id.toString(), getAuthAuditContext(req), "logout");
    }

    clearAdminAuthCookies(res);
    return sendSuccess(res, undefined, { message: "Logged out successfully" });
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    await authService.changePassword(
      req.admin._id.toString(),
      req.body,
      getAuthAuditContext(req)
    );

    return sendSuccess(res, undefined, {
      message: "Password updated successfully. All other sessions revoked.",
    });
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body, getAuthAuditContext(req));
    return sendSuccess(res, undefined, {
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body, getAuthAuditContext(req));
    return sendSuccess(res, undefined, {
      message: "Password reset successfully. You can now log in with your new password.",
    });
  });

  logoutAllDevices = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    await authService.logoutAllDevices(req.admin._id.toString());
    await authService.logActivity(req.admin._id.toString(), getAuthAuditContext(req), "logout_all");

    clearAdminAuthCookies(res);
    return sendSuccess(res, undefined, { message: "Logged out successfully" });
  });

  getMe = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const profile = await authService.getMe(req.admin._id.toString());
    return sendSuccess(res, profile);
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const admin = await authService.updateProfile(
      req.admin._id.toString(),
      req.body,
      getAuthAuditContext(req)
    );

    return sendSuccess(res, admin.toObject(), { message: "Profile updated successfully" });
  });

  getActivities = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const activities = await authService.getActivities(req.admin._id.toString());
    return sendSuccess(res, activities);
  });

  getSessions = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const sessions = await authService.getSessions(req.admin._id.toString());
    return sendSuccess(res, sessions);
  });

  revokeSession = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    await authService.revokeSession(
      req.admin._id.toString(),
      req.params.sessionId,
      getAuthAuditContext(req)
    );
    return sendSuccess(res, undefined, { message: "Session revoked successfully" });
  });
}

export default new AuthController();
