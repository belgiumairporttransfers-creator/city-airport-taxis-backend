import Joi from "joi";
import mongoose from "mongoose";
import { PAYMENT_STATUSES } from "../types/payment.types";

export const mollieWebhookSchema = Joi.object({
  id: Joi.string().trim().min(1).required(),
});

export const getPaymentsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().allow("").optional(),
  status: Joi.string()
    .valid(...PAYMENT_STATUSES)
    .optional(),
  sort: Joi.string().trim().optional(),
});

export const bulkDeletePaymentsSchema = Joi.object({
  ids: Joi.array()
    .items(
      Joi.string()
        .custom((value, helpers) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            return helpers.error("any.invalid");
          }
          return value;
        })
        .messages({ "any.invalid": "Invalid payment id" })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one payment id is required",
      "any.required": "Payment ids are required",
    }),
});
