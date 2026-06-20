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
  stopFee: Joi.number().min(0).required().messages({
    "any.required": "Stops fee is required",
    "number.base": "Stops fee must be a number",
    "number.min": "Stops fee cannot be negative",
  }),
  cardProcessingFee: Joi.number().min(0).max(100).required().messages({
    "any.required": "Card processing fee is required",
    "number.base": "Card processing fee must be a number",
    "number.min": "Card processing fee cannot be negative",
    "number.max": "Card processing fee cannot exceed 100%",
  }),
  airportPickup: Joi.number().min(0).required().messages({
    "any.required": "Airport pickup price is required",
    "number.base": "Airport pickup price must be a number",
    "number.min": "Airport pickup price cannot be negative",
  }),
  trainPickup: Joi.number().min(0).required().messages({
    "any.required": "Train pickup price is required",
    "number.base": "Train pickup price must be a number",
    "number.min": "Train pickup price cannot be negative",
  }),
  meetAndGreet: Joi.number().min(0).required().messages({
    "any.required": "Meet and greet price is required",
    "number.base": "Meet and greet price must be a number",
    "number.min": "Meet and greet price cannot be negative",
  }),
  returnMeetAndGreet: Joi.number().min(0).required().messages({
    "any.required": "Return meet and greet price is required",
    "number.base": "Return meet and greet price must be a number",
    "number.min": "Return meet and greet price cannot be negative",
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
});
