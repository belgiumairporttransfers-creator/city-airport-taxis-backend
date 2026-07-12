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
import { adminContactRoutes } from "../modules/contact";
import { adminSettingsRoutes } from "../modules/settings";
import { adminDriverRoutes } from "../modules/drivers";
import { adminNotificationRoutes } from "../modules/notifications";
import { adminCommunicationRoutes } from "../modules/communication";
import { adminBookingRoutes } from "../modules/bookings";
import { adminAssignmentRoutes } from "../modules/assignments";
import { adminTripRoutes } from "../modules/trips";
import { adminPaymentRoutes } from "../modules/payments";
import { adminDashboardRoutes } from "../modules/dashboard";

const adminRoutes: IRouter = Router();

adminRoutes.use("/auth", adminAuthRoutes);

adminRoutes.use(protectAdmin);
adminRoutes.use(csrfProtection);

adminRoutes.use("/dashboard", adminDashboardRoutes);
adminRoutes.use("/settings", adminSettingsRoutes);
adminRoutes.use("/customers", adminCustomerRoutes);
adminRoutes.use("/vehicle-categories", adminVehicleCategoryRoutes);
adminRoutes.use("/vehicle-categories/:categoryId/pricing", adminCategoryPricingRoutes);
adminRoutes.use("/vehicle-pricing", adminVehiclePricingRoutes);
adminRoutes.use("/vehicles", adminVehicleRoutes);
adminRoutes.use("/drivers", adminDriverRoutes);
adminRoutes.use("/bookings", adminBookingRoutes);
adminRoutes.use("/assignments", adminAssignmentRoutes);
adminRoutes.use("/trips", adminTripRoutes);
adminRoutes.use("/payments", adminPaymentRoutes);
adminRoutes.use("/notifications", adminNotificationRoutes);
adminRoutes.use("/communication", adminCommunicationRoutes);
adminRoutes.use("/newsletters", adminNewsletterRoutes);
adminRoutes.use("/contact-messages", adminContactRoutes);
adminRoutes.use("/newsletter-drafts", adminNewsletterDraftRoutes);
adminRoutes.use("/newsletter-campaigns", adminNewsletterCampaignRoutes);
adminRoutes.use("/newsletter-campaign-recipients", adminNewsletterCampaignRecipientRoutes);

export default adminRoutes;
