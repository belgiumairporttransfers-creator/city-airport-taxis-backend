import Joi from "joi";
import { NEWSLETTER_CAMPAIGN_RECIPIENT_STATUSES } from "../types/newsletter-campaign-recipient.types";

export const getCampaignRecipientsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().allow("").optional(),
  campaignId: Joi.string().hex().length(24).optional(),
  status: Joi.string()
    .valid(...NEWSLETTER_CAMPAIGN_RECIPIENT_STATUSES)
    .optional(),
  sort: Joi.string().trim().optional(),
});

export const resendFailedRecipientsSchema = Joi.object({
  campaignId: Joi.string().hex().length(24).required().messages({
    "any.required": "Campaign ID is required",
  }),
});
