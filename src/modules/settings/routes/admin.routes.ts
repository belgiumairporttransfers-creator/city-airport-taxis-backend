import { Router, type IRouter } from "express";
import settingsController from "../controllers/settings.controller";
import { validateRequest } from "@/middleware/validate";
import { updateSettingsSchema } from "../validators/settings.validator";

const adminSettingsRoutes: IRouter = Router();

adminSettingsRoutes.get("/", settingsController.getSettings);
adminSettingsRoutes.post(
  "/",
  validateRequest(updateSettingsSchema),
  settingsController.updateSettings
);

export default adminSettingsRoutes;
