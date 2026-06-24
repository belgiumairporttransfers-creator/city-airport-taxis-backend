import Joi from "joi";
import mongoose from "mongoose";
import {
  NEWSLETTER_DRAFT_AUDIENCES,
  NEWSLETTER_DRAFT_SEND_MODES,
} from "../types/newsletter-draft.types";

const draftFields = {
  campaignName: Joi.string().trim().min(1).max(120).messages({
    "any.required": "Campaign name is required",
    "string.empty": "Campaign name is required",
  }),
  subject: Joi.string().trim().allow("").max(200).optional(),
  preheader: Joi.string().trim().allow("").max(150).optional(),
  message: Joi.string().allow("").optional(),
  fromName: Joi.string().trim().allow("").max(80).optional(),
  replyTo: Joi.string()
    .trim()
    .allow("")
    .optional()
    .custom((value, helpers) => {
      if (!value) return value;
      const { error } = Joi.string().email().validate(value);
      if (error) return helpers.error("string.email");
      return value;
    })
    .messages({
      "string.email": "Enter a valid reply-to email",
    }),
  audience: Joi.string()
    .valid(...NEWSLETTER_DRAFT_AUDIENCES)
    .optional(),
  sendMode: Joi.string()
    .valid(...NEWSLETTER_DRAFT_SEND_MODES)
    .optional(),
  scheduledDate: Joi.string().trim().allow("").optional(),
  scheduledTime: Joi.string().trim().allow("").optional(),
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
};

export const saveDraftSchema = Joi.object({
  ...draftFields,
  campaignName: draftFields.campaignName.required(),
});

export const updateDraftSchema = Joi.object(draftFields).min(1);

export const getDraftsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow("").optional(),
  sort: Joi.string().trim().optional(),
});

export const bulkDeleteDraftsSchema = Joi.object({
  ids: Joi.array()
    .items(
      Joi.string()
        .custom((value, helpers) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            return helpers.error("any.invalid");
          }
          return value;
        })
        .messages({
          "any.invalid": "Invalid draft id",
        })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one draft id is required",
      "any.required": "Draft ids are required",
    }),
});
