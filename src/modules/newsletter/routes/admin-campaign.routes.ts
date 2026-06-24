import { Router, type IRouter } from "express";
import newsletterCampaignController from "../controllers/newsletter-campaign.controller";
import { validateRequest, validateParams, validateQuery } from "@/middleware/validate";
import {
  getCampaignsQuerySchema,
  sendNewsletterSchema,
} from "../validators/newsletter-campaign.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";

const adminNewsletterCampaignRoutes: IRouter = Router();

adminNewsletterCampaignRoutes.post(
  "/send",
  validateRequest(sendNewsletterSchema),
  newsletterCampaignController.send
);
adminNewsletterCampaignRoutes.post(
  "/:id/resend",
  validateParams(idParamSchema),
  newsletterCampaignController.resend
);
adminNewsletterCampaignRoutes.delete(
  "/:id",
  validateParams(idParamSchema),
  newsletterCampaignController.deleteOne
);
adminNewsletterCampaignRoutes.get(
  "/",
  validateQuery(getCampaignsQuerySchema),
  newsletterCampaignController.getAll
);
adminNewsletterCampaignRoutes.get(
  "/:id",
  validateParams(idParamSchema),
  newsletterCampaignController.getOne
);

export default adminNewsletterCampaignRoutes;
