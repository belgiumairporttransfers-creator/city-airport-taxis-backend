import { Router, type IRouter } from "express";
import { userAuthRoutes } from "../modules/auth";
import { publicNewsletterRoutes } from "../modules/newsletter";
import { publicSettingsRoutes } from "../modules/settings";
import { uploadRoutes } from "../modules/upload";

const publicRoutes: IRouter = Router();

publicRoutes.use("/settings/public", publicSettingsRoutes);
publicRoutes.use("/newsletter", publicNewsletterRoutes);
publicRoutes.use("/auth", userAuthRoutes);
publicRoutes.use("/upload", uploadRoutes);

export default publicRoutes;
