import { Router, type IRouter } from "express";
import authController from "../controllers/auth.controller";
import { protectAdmin } from "@/middleware/auth";
import { validateRequest, validateParams } from "@/middleware/validate";
import { csrfProtection } from "@/middleware/csrf";
import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validators/auth.validator";
import { loginLimiter, refreshLimiter, passwordResetLimiter } from "@/middleware/rateLimiters";
import { sessionIdParamSchema } from "@/shared/validators/object-id.schema";

const router: IRouter = Router();

router.post("/login", loginLimiter, validateRequest(loginSchema), authController.login);
router.post("/refresh", refreshLimiter, csrfProtection, authController.refresh);
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  passwordResetLimiter,
  validateRequest(resetPasswordSchema),
  authController.resetPassword
);

router.use(protectAdmin);
router.use(csrfProtection);

router.get("/me", authController.getMe);
router.post("/update-profile", validateRequest(updateProfileSchema), authController.updateProfile);
router.post("/logout", authController.logout);
router.post(
  "/change-password",
  validateRequest(changePasswordSchema),
  authController.changePassword
);
router.post("/logout-all", authController.logoutAllDevices);
router.get("/activities", authController.getActivities);
router.get("/sessions", authController.getSessions);
router.delete(
  "/sessions/:sessionId",
  validateParams(sessionIdParamSchema),
  authController.revokeSession
);

export default router;
