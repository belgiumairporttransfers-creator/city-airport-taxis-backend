import { Router, type IRouter } from "express";
import userAuthController from "../controllers/user-auth.controller";
import { protectUser } from "@/middleware/auth";
import { validateRequest, validateParams } from "@/middleware/validate";
import { csrfProtection } from "@/middleware/csrf";
import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validators/auth.validator";
import { userRegisterSchema, userUpdateProfileSchema } from "../validators/user-auth.validator";
import {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
} from "@/middleware/rateLimiters";
import { sessionIdParamSchema } from "@/shared/validators/object-id.schema";

const router: IRouter = Router();

router.post(
  "/register",
  registerLimiter,
  validateRequest(userRegisterSchema),
  userAuthController.register
);
router.post("/login", loginLimiter, validateRequest(loginSchema), userAuthController.login);
router.post("/refresh", refreshLimiter, csrfProtection, userAuthController.refresh);
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validateRequest(forgotPasswordSchema),
  userAuthController.forgotPassword
);
router.post(
  "/reset-password",
  passwordResetLimiter,
  validateRequest(resetPasswordSchema),
  userAuthController.resetPassword
);
router.post(
  "/verify-email",
  emailVerificationLimiter,
  validateRequest(verifyEmailSchema),
  userAuthController.verifyEmail
);
router.post(
  "/resend-verification",
  emailVerificationLimiter,
  validateRequest(forgotPasswordSchema),
  userAuthController.resendVerification
);

router.use(protectUser);
router.use(csrfProtection);

router.post("/logout", userAuthController.logout);
router.post(
  "/change-password",
  validateRequest(changePasswordSchema),
  userAuthController.changePassword
);
router.post("/logout-all", userAuthController.logoutAllDevices);
router.get("/activities", userAuthController.getActivities);
router.get("/sessions", userAuthController.getSessions);
router.delete(
  "/sessions/:sessionId",
  validateParams(sessionIdParamSchema),
  userAuthController.revokeSession
);
router.get("/me", userAuthController.getMe);
router.post(
  "/update-profile",
  validateRequest(userUpdateProfileSchema),
  userAuthController.updateProfile
);

export default router;
