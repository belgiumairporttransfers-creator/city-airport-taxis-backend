import Joi from "joi";
import { VEHICLE_CATEGORY_STATUSES } from "../types/vehicle-category.types";

const slugSchema = Joi.string()
  .trim()
  .lowercase()
  .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .messages({
    "string.pattern.base": "Slug must contain only lowercase letters, numbers, and hyphens",
  });

export const createVehicleCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required().messages({
    "any.required": "Category name is required",
    "string.empty": "Category name is required",
  }),
  slug: slugSchema.optional(),
  description: Joi.string().trim().allow("").max(2000).optional(),
  image: Joi.string().trim().allow("").optional(),
  passengerCapacity: Joi.number().integer().min(0).max(99).optional(),
  luggageCapacity: Joi.number().integer().min(0).max(99).optional(),
  sortOrder: Joi.number().integer().min(0).default(0),
  status: Joi.string()
    .valid(...VEHICLE_CATEGORY_STATUSES)
    .default("active"),
  isDefault: Joi.boolean().default(false),
});

export const updateVehicleCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).optional(),
  slug: slugSchema.optional(),
  description: Joi.string().trim().allow("").max(2000).optional(),
  image: Joi.string().trim().allow("").optional(),
  passengerCapacity: Joi.number().integer().min(0).max(99).optional(),
  luggageCapacity: Joi.number().integer().min(0).max(99).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  status: Joi.string()
    .valid(...VEHICLE_CATEGORY_STATUSES)
    .optional(),
  isDefault: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update",
  });

export const getVehicleCategoriesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow("").optional(),
  status: Joi.string()
    .valid(...VEHICLE_CATEGORY_STATUSES)
    .optional(),
  sort: Joi.string().trim().optional(),
});

export const vehicleCategorySlugParamSchema = Joi.object({
  slug: slugSchema.required().messages({
    "any.required": "Category slug is required",
  }),
});
