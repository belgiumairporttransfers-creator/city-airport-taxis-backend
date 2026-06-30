import Joi from "joi";
import mongoose from "mongoose";
import { BOOKING_NUMBER_PATTERN } from "@/modules/bookings/utils/booking-number";
import { TRIP_PHASES } from "../utils/trip-phase";

const isObjectId = (value: string) =>
  mongoose.Types.ObjectId.isValid(value) &&
  String(new mongoose.Types.ObjectId(value)) === value;

export const bookingRefParamSchema = Joi.object({
  bookingRef: Joi.string()
    .trim()
    .required()
    .custom((value, helpers) => {
      if (isObjectId(value)) {
        return value;
      }

      const normalized = value.toUpperCase();
      if (BOOKING_NUMBER_PATTERN.test(normalized)) {
        return normalized;
      }

      return helpers.error("any.invalid");
    })
    .messages({
      "any.invalid": "Invalid booking reference",
    }),
});

/** @deprecated Use bookingRefParamSchema */
export const bookingNumberParamSchema = Joi.object({
  bookingNumber: Joi.string()
    .trim()
    .required()
    .custom((value, helpers) => {
      if (isObjectId(value)) {
        return value;
      }

      const normalized = value.toUpperCase();
      if (BOOKING_NUMBER_PATTERN.test(normalized)) {
        return normalized;
      }

      return helpers.error("any.invalid");
    })
    .messages({
      "any.invalid": "Invalid booking reference",
    }),
});

export const getAdminTripsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string()
    .valid(...TRIP_PHASES)
    .optional(),
  driver: Joi.string().hex().length(24).optional(),
  date: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: Joi.string().trim().allow("").optional(),
  sort: Joi.string().trim().optional(),
});
