import { Router, type IRouter } from "express";
import { protectAdmin } from "../middleware/auth";
import { csrfProtection } from "../middleware/csrf";
import { adminAuthRoutes } from "../modules/auth";
import { adminCustomerRoutes } from "../modules/customers";
import { adminVehicleCategoryRoutes } from "../modules/vehicle-categories";
import { adminVehicleRoutes } from "../modules/vehicles";
import { adminCategoryPricingRoutes, adminVehiclePricingRoutes } from "../modules/vehicle-pricing";
import {
  adminNewsletterRoutes,
  adminNewsletterDraftRoutes,
  adminNewsletterCampaignRoutes,
  adminNewsletterCampaignRecipientRoutes,
} from "../modules/newsletter";
import { adminSettingsRoutes } from "../modules/settings";
import { adminDriverRoutes } from "../modules/drivers";
import { adminNotificationRoutes } from "../modules/notifications";

const adminRoutes: IRouter = Router();

adminRoutes.use("/auth", adminAuthRoutes);

adminRoutes.use(protectAdmin);
adminRoutes.use(csrfProtection);

adminRoutes.use("/settings", adminSettingsRoutes);
adminRoutes.use("/customers", adminCustomerRoutes);
adminRoutes.use("/vehicle-categories", adminVehicleCategoryRoutes);
adminRoutes.use("/vehicle-categories/:categoryId/pricing", adminCategoryPricingRoutes);
adminRoutes.use("/vehicle-pricing", adminVehiclePricingRoutes);
adminRoutes.use("/vehicles", adminVehicleRoutes);
adminRoutes.use("/drivers", adminDriverRoutes);
adminRoutes.use("/notifications", adminNotificationRoutes);
adminRoutes.use("/newsletters", adminNewsletterRoutes);
adminRoutes.use("/newsletter-drafts", adminNewsletterDraftRoutes);
adminRoutes.use("/newsletter-campaigns", adminNewsletterCampaignRoutes);
adminRoutes.use("/newsletter-campaign-recipients", adminNewsletterCampaignRecipientRoutes);

export default adminRoutes;
