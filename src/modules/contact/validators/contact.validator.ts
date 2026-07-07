import Joi from "joi";
import mongoose from "mongoose";

export const submitContactSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).required().messages({
    "any.required": "First name is required",
    "string.empty": "First name is required",
  }),
  lastName: Joi.string().trim().min(1).max(100).required().messages({
    "any.required": "Last name is required",
    "string.empty": "Last name is required",
  }),
  email: Joi.string().email().required().messages({
    "any.required": "Email is required",
    "string.email": "Please enter a valid email address",
  }),
  phone: Joi.string().trim().min(5).max(30).required().messages({
    "any.required": "Phone number is required",
    "string.min": "Please enter a valid phone number",
  }),
  subject: Joi.string().trim().min(1).max(200).required().messages({
    "any.required": "Subject is required",
    "string.empty": "Subject is required",
  }),
  message: Joi.string().trim().min(10).max(5000).required().messages({
    "any.required": "Message is required",
    "string.min": "Message must be at least 10 characters",
  }),
});

export const getAllQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow("").optional(),
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
          "any.invalid": "Invalid contact id",
        })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one contact id is required",
      "any.required": "Contact ids are required",
    }),
});
