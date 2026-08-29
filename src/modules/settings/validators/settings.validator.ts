import Joi from "joi";
import { PAYMENT_MODES } from "../types/settings.types";

export const updateSettingsSchema = Joi.object({
  maintenanceMode: Joi.boolean().required().messages({
    "any.required": "Maintenance mode is required",
    "boolean.base": "Maintenance mode must be true or false",
  }),
  comingSoonMode: Joi.boolean().required().messages({
    "any.required": "Coming soon mode is required",
    "boolean.base": "Coming soon mode must be true or false",
  }),
  paymentMode: Joi.string()
    .valid(...PAYMENT_MODES)
    .required()
    .messages({
      "any.only": "Payment mode must be test or live",
      "any.required": "Payment mode is required",
    }),
  minBookingMinutes: Joi.number().integer().min(0).required().messages({
    "any.required": "Minimum booking time is required",
    "number.base": "Minimum booking time must be a number",
    "number.integer": "Minimum booking time must be a whole number of minutes",
    "number.min": "Minimum booking time cannot be negative",
  }),
  airportPickup: Joi.number().min(0).required().messages({
    "any.required": "Airport pickup price is required",
    "number.base": "Airport pickup price must be a number",
    "number.min": "Airport pickup price cannot be negative",
  }),
  waitingTimePricePerMinute: Joi.number().min(0).required().messages({
    "any.required": "Driver waiting time price per minute is required",
    "number.base": "Driver waiting time price per minute must be a number",
    "number.min": "Driver waiting time price per minute cannot be negative",
  }),
  waitingTimePricePerHour: Joi.number().min(0).required().messages({
    "any.required": "Driver waiting time price per hour is required",
    "number.base": "Driver waiting time price per hour must be a number",
    "number.min": "Driver waiting time price per hour cannot be negative",
  }),
  driverCommissionPercent: Joi.number().min(0).max(100).required().messages({
    "any.required": "Driver commission is required",
    "number.base": "Driver commission must be a number",
    "number.min": "Driver commission cannot be negative",
    "number.max": "Driver commission cannot exceed 100%",
  }),
  nightPricingStartTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required()
    .messages({
      "any.required": "Night pricing start time is required",
      "string.pattern.base": "Night pricing start time must be in HH:mm format",
    }),
  nightPricingEndTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required()
    .messages({
      "any.required": "Night pricing end time is required",
      "string.pattern.base": "Night pricing end time must be in HH:mm format",
    }),
  nightPricingPercent: Joi.number().min(0).max(100).required().messages({
    "any.required": "Night pricing percent is required",
    "number.base": "Night pricing percent must be a number",
    "number.min": "Night pricing percent cannot be negative",
    "number.max": "Night pricing percent cannot exceed 100%",
  }),
  driverNotificationDelayMinutes: Joi.number().integer().min(0).required().messages({
    "any.required": "Driver notification delay is required",
    "number.base": "Driver notification delay must be a number",
    "number.integer": "Driver notification delay must be a whole number of minutes",
    "number.min": "Driver notification delay cannot be negative",
  }),
});
