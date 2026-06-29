import Joi from "joi";
import { objectIdSchema } from "@/shared/validators/object-id.schema";
import { VEHICLE_PRICING_STATUSES, VEHICLE_PRICING_TYPES, BOOKING_TRIP_CATEGORIES } from "../types/vehicle-pricing.types";

const maxDistanceSchema = Joi.number().min(0).allow(null).messages({
  "number.base": "Maximum distance must be a number or null",
});

export const createVehiclePricingSchema = Joi.object({
  minDistance: Joi.number().min(0).required().messages({
    "any.required": "Minimum distance is required",
    "number.min": "Minimum distance must be at least 0",
  }),
  maxDistance: maxDistanceSchema.required().messages({
    "any.required": "Maximum distance is required",
  }),
  pricingType: Joi.string()
    .valid(...VEHICLE_PRICING_TYPES)
    .required()
    .messages({
      "any.required": "Pricing type is required",
    }),
  priceAmount: Joi.number().min(0).required().messages({
    "any.required": "Price amount is required",
    "number.min": "Price amount must be at least 0",
  }),
  perUnitRate: Joi.number().min(0).allow(null).optional(),
  increasePercentage: Joi.number().min(-100).max(100).allow(null).optional(),
  status: Joi.string()
    .valid(...VEHICLE_PRICING_STATUSES)
    .default("active"),
  sortOrder: Joi.number().integer().min(0).default(0),
}).custom((value, helpers) => {
  if (value.maxDistance !== null && value.maxDistance <= value.minDistance) {
    return helpers.message({
      custom:
        value.maxDistance === value.minDistance
          ? "Maximum distance must be greater than minimum distance (ranges cannot be empty)"
          : "Maximum distance must be greater than minimum distance unless null",
    });
  }

  if (
    value.pricingType === "base_plus_per_unit" &&
    (value.perUnitRate === undefined || value.perUnitRate === null)
  ) {
    return helpers.message({
      custom: "Per unit rate is required for base_plus_per_unit pricing",
    });
  }

  if (
    value.increasePercentage !== undefined &&
    value.increasePercentage !== null &&
    (value.increasePercentage < -100 || value.increasePercentage > 100)
  ) {
    return helpers.message({
      custom: "Price adjustment must be between -100 and 100",
    });
  }

  return value;
});

export const updateVehiclePricingSchema = Joi.object({
  minDistance: Joi.number().min(0).optional(),
  maxDistance: maxDistanceSchema.optional(),
  pricingType: Joi.string()
    .valid(...VEHICLE_PRICING_TYPES)
    .optional(),
  priceAmount: Joi.number().min(0).optional(),
  perUnitRate: Joi.number().min(0).allow(null).optional(),
  increasePercentage: Joi.number().min(-100).max(100).allow(null).optional(),
  status: Joi.string()
    .valid(...VEHICLE_PRICING_STATUSES)
    .optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update",
  })
  .custom((value, helpers) => {
    const minDistance = value.minDistance;
    const maxDistance = value.maxDistance;

    if (
      minDistance !== undefined &&
      maxDistance !== undefined &&
      maxDistance !== null &&
      maxDistance <= minDistance
    ) {
      return helpers.message({
        custom: "Maximum distance must be greater than minimum distance unless null",
      });
    }

    if (
      value.pricingType === "base_plus_per_unit" &&
      value.perUnitRate !== undefined &&
      value.perUnitRate !== null &&
      value.perUnitRate < 0
    ) {
      return helpers.message({
        custom: "Per unit rate must be at least 0",
      });
    }

    if (
      value.increasePercentage !== undefined &&
      value.increasePercentage !== null &&
      (value.increasePercentage < -100 || value.increasePercentage > 100)
    ) {
      return helpers.message({
        custom: "Price adjustment must be between -100 and 100",
      });
    }

    return value;
  });

export const getPricingQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  categoryId: objectIdSchema.optional(),
  status: Joi.string()
    .valid(...VEHICLE_PRICING_STATUSES)
    .optional(),
  sort: Joi.string().trim().optional(),
  search: Joi.string().trim().allow("").optional(),
});

export const getPricingQuotesQuerySchema = Joi.object({
  distance: Joi.number().min(0).required().messages({
    "any.required": "Distance is required",
    "number.base": "Distance must be a number",
    "number.min": "Distance must be at least 0",
  }),
});

export const getPublicPricingQuotesQuerySchema = Joi.object({
  distance: Joi.number().min(0).required().messages({
    "any.required": "Distance is required",
    "number.base": "Distance must be a number",
    "number.min": "Distance must be at least 0",
  }),
  passengers: Joi.number().integer().min(1).required().messages({
    "any.required": "Passengers is required",
    "number.base": "Passengers must be a number",
    "number.min": "Passengers must be at least 1",
  }),
  category: Joi.string()
    .valid(...BOOKING_TRIP_CATEGORIES)
    .default("one-way"),
});

export const validatePricingStructureSchema = Joi.object({}).default({});

export const categoryIdParamSchema = Joi.object({
  categoryId: objectIdSchema.required().messages({
    "any.required": "Category id is required",
  }),
});
