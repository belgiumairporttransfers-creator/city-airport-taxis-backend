import Joi from "joi";
import {
  NEWSLETTER_DRAFT_AUDIENCES,
  NEWSLETTER_DRAFT_SEND_MODES,
} from "../types/newsletter-draft.types";
import { NEWSLETTER_CAMPAIGN_STATUSES } from "../types/newsletter-campaign.types";

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

export const sendNewsletterSchema = Joi.object({
  campaignName: Joi.string().trim().min(1).max(120).required().messages({
    "any.required": "Campaign name is required",
    "string.empty": "Campaign name is required",
  }),
  subject: Joi.string().trim().min(1).required().messages({
    "any.required": "Subject is required",
    "string.empty": "Subject is required",
  }),
  preheader: Joi.string().trim().allow("").max(150).optional(),
  message: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!stripHtml(value)) return helpers.error("string.empty");
      return value;
    })
    .messages({
      "any.required": "Message is required",
      "string.empty": "Message is required",
    }),
  fromName: Joi.string().trim().min(1).max(80).required().messages({
    "any.required": "Sender name is required",
  }),
  replyTo: Joi.string().trim().email().required().messages({
    "any.required": "Reply-to email is required",
    "string.email": "Enter a valid reply-to email",
  }),
  audience: Joi.string()
    .valid(...NEWSLETTER_DRAFT_AUDIENCES)
    .required(),
  sendMode: Joi.string()
    .valid(...NEWSLETTER_DRAFT_SEND_MODES)
    .required(),
  scheduledDate: Joi.string().trim().allow("").optional(),
  scheduledTime: Joi.string().trim().allow("").optional(),
  scheduledAt: Joi.string().isoDate().optional(),
  ctaText: Joi.string().trim().allow("").max(40).optional(),
  ctaUrl: Joi.string()
    .trim()
    .allow("")
    .optional()
    .custom((value, helpers) => {
      if (!value) return value;
      const { error } = Joi.string().uri().validate(value);
      if (error) return helpers.error("string.uri");
      return value;
    })
    .messages({
      "string.uri": "Enter a valid button URL",
    }),
  imageUrl: Joi.string().trim().allow("").optional(),
  imagePublicId: Joi.string().trim().allow("").optional(),
  draftId: Joi.string().hex().length(24).optional(),
})
  .custom((value, helpers) => {
    if (value.sendMode === "scheduled") {
      if (!value.scheduledAt) {
        return helpers.error("any.custom", {
          message: "Scheduled date and time are required",
        });
      }
      if (new Date(value.scheduledAt).getTime() <= Date.now()) {
        return helpers.error("any.custom", {
          message: "Scheduled time must be in the future",
        });
      }
    }

    if (value.ctaText && !value.ctaUrl) {
      return helpers.error("any.custom", {
        message: "Button URL is required when button text is provided",
      });
    }

    return value;
  })
  .messages({
    "any.custom": "{{#message}}",
  });

export const getCampaignsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow("").optional(),
  status: Joi.string()
    .valid(...NEWSLETTER_CAMPAIGN_STATUSES)
    .optional(),
  sort: Joi.string().trim().optional(),
});
