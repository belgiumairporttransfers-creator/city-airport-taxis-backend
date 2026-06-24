import { Router, type IRouter } from "express";
import newsletterCampaignRecipientController from "../controllers/newsletter-campaign-recipient.controller";
import { validateParams, validateQuery, validateRequest } from "@/middleware/validate";
import {
  getCampaignRecipientsQuerySchema,
  resendFailedRecipientsSchema,
} from "../validators/newsletter-campaign-recipient.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";

const adminNewsletterCampaignRecipientRoutes: IRouter = Router();

adminNewsletterCampaignRecipientRoutes.get(
  "/",
  validateQuery(getCampaignRecipientsQuerySchema),
  newsletterCampaignRecipientController.getAll
);
adminNewsletterCampaignRecipientRoutes.post(
  "/resend-failed",
  validateRequest(resendFailedRecipientsSchema),
  newsletterCampaignRecipientController.resendFailed
);
adminNewsletterCampaignRecipientRoutes.post(
  "/:id/resend",
  validateParams(idParamSchema),
  newsletterCampaignRecipientController.resendOne
);

export default adminNewsletterCampaignRecipientRoutes;
