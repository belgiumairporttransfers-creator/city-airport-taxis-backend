import Joi from "joi";
import { strongPasswordSchema } from "./password.schema";
import { avatarUrlSchema } from "@/shared/validators/url.schema";

export const userRegisterSchema = Joi.object({
  firstName: Joi.string().trim().min(1).required().messages({
    "any.required": "First name is required",
  }),
  lastName: Joi.string().trim().min(1).required().messages({
    "any.required": "Last name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: strongPasswordSchema,
  phoneNumber: Joi.string().trim().optional().allow(""),
  phone: Joi.string().trim().optional().allow(""),
  companyName: Joi.string().trim().optional().allow(""),
  businessProfile: Joi.string().trim().optional().allow(""),
  rememberMe: Joi.boolean().optional(),
});

export const userUpdateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(80),
  lastName: Joi.string().trim().min(1).max(80),
  phoneNumber: Joi.string().trim().allow("").max(30),
  avatar: avatarUrlSchema,
  companyName: Joi.string().trim().allow("").max(120),
  businessProfile: Joi.string().trim().allow("").max(500),
})
  .min(1)
  .messages({
    "object.min": "At least one profile field is required",
  });
