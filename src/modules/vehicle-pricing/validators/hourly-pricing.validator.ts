import Joi from "joi";
import { objectIdSchema } from "@/shared/validators/object-id.schema";
import { VEHICLE_PRICING_STATUSES } from "../types/vehicle-pricing.types";
import { HOURLY_SERVICE_TYPES } from "../types/hourly-pricing.types";

export const createHourlyPricingSchema = Joi.object({
  serviceType: Joi.string()
    .valid(...HOURLY_SERVICE_TYPES)
    .default("hourly"),
  duration: Joi.number().integer().min(1).required().messages({
    "any.required": "Duration is required",
    "number.min": "Duration must be at least 1",
  }),
  price: Joi.number().min(0).required().messages({
    "any.required": "Price is required",
    "number.min": "Price must be at least 0",
  }),
  includedDistance: Joi.number().min(0).required().messages({
    "any.required": "Included distance is required",
    "number.min": "Included distance must be at least 0",
  }),
  extraDistancePrice: Joi.number().min(0).required().messages({
    "any.required": "Extra distance price is required",
    "number.min": "Extra distance price must be at least 0",
  }),
  status: Joi.string()
    .valid(...VEHICLE_PRICING_STATUSES)
    .default("active"),
  sortOrder: Joi.number().integer().min(0).default(0),
});

export const updateHourlyPricingSchema = Joi.object({
  serviceType: Joi.string()
    .valid(...HOURLY_SERVICE_TYPES)
    .optional(),
  duration: Joi.number().integer().min(1).optional(),
  price: Joi.number().min(0).optional(),
  includedDistance: Joi.number().min(0).optional(),
  extraDistancePrice: Joi.number().min(0).optional(),
  status: Joi.string()
    .valid(...VEHICLE_PRICING_STATUSES)
    .optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update",
  });

export const getHourlyPricingQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  categoryId: objectIdSchema.optional(),
  status: Joi.string()
    .valid(...VEHICLE_PRICING_STATUSES)
    .optional(),
  sort: Joi.string().trim().optional(),
  search: Joi.string().trim().allow("").optional(),
});
