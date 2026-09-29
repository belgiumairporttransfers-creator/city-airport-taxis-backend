import Joi from "joi";
import { objectIdSchema } from "@/shared/validators/object-id.schema";

export const getUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().allow("").optional(),
  role: Joi.string().valid("user", "driver", "all").optional(),
  status: Joi.string().valid("active", "suspended", "all").optional(),
  isVerified: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid("true", "false", "all"))
    .optional(),
  sortBy: Joi.string()
    .valid("createdAt", "firstName", "lastName", "email", "lastLogin")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

export const updateUserStatusSchema = Joi.object({
  status: Joi.string().valid("active", "suspended").required(),
  reason: Joi.string().trim().max(500).allow("").optional(),
});

export const bulkDeleteUsersSchema = Joi.object({
  ids: Joi.array().items(objectIdSchema).min(1).required().messages({
    "array.min": "At least one user id is required",
    "any.required": "User ids are required",
  }),
});
