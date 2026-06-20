import Joi from "joi";

export const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export const strongPasswordSchema = Joi.string()
  .min(8)
  .pattern(PASSWORD_PATTERN)
  .messages({
    "string.pattern.base": PASSWORD_REQUIREMENTS_MESSAGE,
    "string.min": PASSWORD_REQUIREMENTS_MESSAGE,
    "any.required": "Password is required",
  });
