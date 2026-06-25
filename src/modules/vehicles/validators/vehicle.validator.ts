import Joi from "joi";
import { objectIdSchema } from "@/shared/validators/object-id.schema";
import { VEHICLE_STATUSES } from "../types/vehicle.types";

export const createVehicleSchema = Joi.object({
  categoryId: objectIdSchema.required().messages({
    "any.required": "Vehicle category is required",
  }),
  registrationNumber: Joi.string().trim().min(1).max(20).required().messages({
    "any.required": "Registration number is required",
    "string.empty": "Registration number is required",
  }),
  make: Joi.string().trim().min(1).max(80).required().messages({
    "any.required": "Make is required",
    "string.empty": "Make is required",
  }),
  model: Joi.string().trim().min(1).max(80).required().messages({
    "any.required": "Model is required",
    "string.empty": "Model is required",
  }),
  year: Joi.number().integer().min(1900).max(2100).optional(),
  color: Joi.string().trim().allow("").max(40).optional(),
  passengerCapacity: Joi.number().integer().min(1).max(99).required().messages({
    "any.required": "Passenger capacity is required",
  }),
  luggageCapacity: Joi.number().integer().min(0).max(99).required().messages({
    "any.required": "Luggage capacity is required",
  }),
  status: Joi.string()
    .valid(...VEHICLE_STATUSES)
    .default("active"),
  features: Joi.array().items(Joi.string().trim().min(1).max(80)).max(30).optional(),
  image: Joi.string().trim().allow("").optional(),
  notes: Joi.string().trim().allow("").max(5000).optional(),
});

export const updateVehicleSchema = Joi.object({
  categoryId: objectIdSchema.optional(),
  registrationNumber: Joi.string().trim().min(1).max(20).optional(),
  make: Joi.string().trim().min(1).max(80).optional(),
  model: Joi.string().trim().min(1).max(80).optional(),
  year: Joi.number().integer().min(1900).max(2100).optional(),
  color: Joi.string().trim().allow("").max(40).optional(),
  passengerCapacity: Joi.number().integer().min(1).max(99).optional(),
  luggageCapacity: Joi.number().integer().min(0).max(99).optional(),
  status: Joi.string()
    .valid(...VEHICLE_STATUSES)
    .optional(),
  features: Joi.array().items(Joi.string().trim().min(1).max(80)).max(30).optional(),
  image: Joi.string().trim().allow("").optional(),
  notes: Joi.string().trim().allow("").max(5000).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update",
  });

export const getVehiclesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow("").optional(),
  status: Joi.string()
    .valid(...VEHICLE_STATUSES)
    .optional(),
  categoryId: objectIdSchema.optional(),
  sort: Joi.string().trim().optional(),
});
