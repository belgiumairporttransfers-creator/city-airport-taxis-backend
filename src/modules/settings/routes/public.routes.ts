import { Router, type IRouter } from "express";
import settingsController from "../controllers/settings.controller";

const publicSettingsRoutes: IRouter = Router();

publicSettingsRoutes.get("/", settingsController.getPublicSettings);

export default publicSettingsRoutes;
