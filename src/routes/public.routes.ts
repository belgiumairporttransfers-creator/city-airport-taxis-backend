import { Router, type IRouter } from "express";
import { userAuthRoutes } from "../modules/auth";
import { publicNewsletterRoutes } from "../modules/newsletter";
import { publicContactRoutes } from "../modules/contact";
import { publicSettingsRoutes } from "../modules/settings";
import { uploadRoutes } from "../modules/upload";
import { publicVehicleCategoryRoutes } from "../modules/vehicle-categories";
import { publicVehiclePricingRoutes } from "../modules/vehicle-pricing";
import { publicDriverRoutes, portalDriverRoutes } from "../modules/drivers";
import { portalAssignmentRoutes } from "../modules/assignments";
import { portalTripRoutes } from "../modules/trips";
import { portalCommunicationRoutes } from "../modules/communication";
import { publicBookingRoutes, portalBookingRoutes } from "../modules/bookings";
import { publicPaymentRoutes } from "../modules/payments";
import { portalWalletRoutes } from "../modules/wallet";
import { portalDashboardRoutes } from "../modules/dashboard";

const publicRoutes: IRouter = Router();

publicRoutes.use("/settings/public", publicSettingsRoutes);
publicRoutes.use("/newsletter", publicNewsletterRoutes);
publicRoutes.use("/contact", publicContactRoutes);
publicRoutes.use("/vehicle-categories", publicVehicleCategoryRoutes);
publicRoutes.use("/vehicle-pricing", publicVehiclePricingRoutes);
publicRoutes.use("/bookings", publicBookingRoutes);
publicRoutes.use("/payments", publicPaymentRoutes);
publicRoutes.use("/drivers", publicDriverRoutes);
publicRoutes.use("/drivers", portalDriverRoutes);
publicRoutes.use("/drivers", portalAssignmentRoutes);
publicRoutes.use("/drivers", portalBookingRoutes);
publicRoutes.use("/drivers", portalTripRoutes);
publicRoutes.use("/drivers", portalWalletRoutes);
publicRoutes.use("/drivers", portalDashboardRoutes);
publicRoutes.use("/communication", portalCommunicationRoutes);
publicRoutes.use("/auth", userAuthRoutes);
publicRoutes.use("/upload", uploadRoutes);

export default publicRoutes;
