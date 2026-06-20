import Joi from "joi";
import mongoose from "mongoose";

export const objectIdValidator = (value: string, helpers: Joi.CustomHelpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error("any.invalid");
  }
  return value;
};

export const objectIdSchema = Joi.string().custom(objectIdValidator).messages({
  "any.invalid": "Invalid id format",
});

export const idParamSchema = Joi.object({
  id: objectIdSchema.required().messages({
    "any.required": "Id is required",
  }),
});

export const sessionIdParamSchema = Joi.object({
  sessionId: objectIdSchema.required().messages({
    "any.required": "Session id is required",
  }),
});
