import { Router, type IRouter } from "express";
import { protectAdmin } from "../middleware/auth";
import { csrfProtection } from "../middleware/csrf";
import { adminAuthRoutes } from "../modules/auth";
import { adminNewsletterRoutes, adminNewsletterDraftRoutes, adminNewsletterCampaignRoutes, adminNewsletterCampaignRecipientRoutes } from "../modules/newsletter";
import { adminSettingsRoutes } from "../modules/settings";

const adminRoutes: IRouter = Router();

adminRoutes.use("/auth", adminAuthRoutes);

adminRoutes.use(protectAdmin);
adminRoutes.use(csrfProtection);

adminRoutes.use("/settings", adminSettingsRoutes);
adminRoutes.use("/newsletters", adminNewsletterRoutes);
adminRoutes.use("/newsletter-drafts", adminNewsletterDraftRoutes);
adminRoutes.use("/newsletter-campaigns", adminNewsletterCampaignRoutes);
adminRoutes.use("/newsletter-campaign-recipients", adminNewsletterCampaignRecipientRoutes);

export default adminRoutes;
