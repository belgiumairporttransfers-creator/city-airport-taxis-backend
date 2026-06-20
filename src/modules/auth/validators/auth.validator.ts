import Joi from "joi";
import { strongPasswordSchema } from "./password.schema";
import { avatarUrlSchema } from "@/shared/validators/url.schema";

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
  rememberMe: Joi.boolean().optional(),
});

export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),
  newPassword: strongPasswordSchema
    .invalid(Joi.ref("oldPassword"))
    .required()
    .messages({
      "any.invalid": "New password must be different from the current password",
      "any.required": "New password is required",
    }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "Reset token is required",
  }),
  password: strongPasswordSchema,
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(80),
  lastName: Joi.string().trim().min(1).max(80),
  phoneNumber: Joi.string().trim().allow("").max(30),
  avatar: avatarUrlSchema,
})
  .min(1)
  .messages({
    "object.min": "At least one profile field is required",
  });

export const verifyEmailSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "Verification token is required",
  }),
});
