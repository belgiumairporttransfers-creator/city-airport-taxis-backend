import { Router, type IRouter } from "express";
import { userAuthRoutes } from "../modules/auth";
import { publicNewsletterRoutes } from "../modules/newsletter";
import { publicSettingsRoutes } from "../modules/settings";
import { uploadRoutes } from "../modules/upload";
import { publicVehicleCategoryRoutes } from "../modules/vehicle-categories";
import { publicVehiclePricingRoutes } from "../modules/vehicle-pricing";
import { publicDriverRoutes, portalDriverRoutes } from "../modules/drivers";

const publicRoutes: IRouter = Router();

publicRoutes.use("/settings/public", publicSettingsRoutes);
publicRoutes.use("/newsletter", publicNewsletterRoutes);
publicRoutes.use("/vehicle-categories", publicVehicleCategoryRoutes);
publicRoutes.use("/vehicle-pricing", publicVehiclePricingRoutes);
publicRoutes.use("/drivers", publicDriverRoutes);
publicRoutes.use("/drivers", portalDriverRoutes);
publicRoutes.use("/auth", userAuthRoutes);
publicRoutes.use("/upload", uploadRoutes);

export default publicRoutes;
