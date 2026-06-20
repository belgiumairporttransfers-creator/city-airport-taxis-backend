import Joi from "joi";
import mongoose from "mongoose";
import { NEWSLETTER_SOURCES } from "../types/newsletter.types";

export const subscribeSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "any.required": "Email is required",
    "string.email": "Please enter a valid email address",
  }),
  source: Joi.string()
    .valid(...NEWSLETTER_SOURCES)
    .optional()
    .messages({
      "any.only": "Invalid newsletter source",
    }),
});

export const getAllQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow("").optional(),
  source: Joi.string()
    .valid(...NEWSLETTER_SOURCES)
    .optional()
    .messages({
      "any.only": "Invalid newsletter source",
    }),
  sort: Joi.string().trim().optional(),
});

export const bulkDeleteSchema = Joi.object({
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
          "any.invalid": "Invalid newsletter id",
        })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one newsletter id is required",
      "any.required": "Newsletter ids are required",
    }),
});
