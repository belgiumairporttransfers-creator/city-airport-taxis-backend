import Joi from "joi";
import { objectIdSchema } from "@/shared/validators/object-id.schema";
import { CUSTOMER_STATUSES, CUSTOMER_TIERS, CUSTOMER_TYPES } from "../types/customer.types";

const billingAddressSchema = Joi.object({
  street: Joi.string().trim().allow("").optional(),
  city: Joi.string().trim().allow("").optional(),
  postcode: Joi.string().trim().allow("").optional(),
  country: Joi.string().trim().allow("").optional(),
});

const emailSchema = Joi.string().trim().email().required().messages({
  "any.required": "Email is required",
  "string.empty": "Email is required",
  "string.email": "Enter a valid email address",
});

const phoneSchema = Joi.string().trim().min(1).required().messages({
  "any.required": "Phone is required",
  "string.empty": "Phone is required",
});

const validateCustomerTypeFields = (
  value: Record<string, unknown>,
  helpers: Joi.CustomHelpers,
  options: { isCreate: boolean }
) => {
  const customerType = value.customerType as string | undefined;

  if (!customerType) {
    if (options.isCreate) {
      return helpers.error("any.custom", { message: "Customer type is required" });
    }
    return value;
  }

  if (customerType === "individual") {
    const firstName = value.firstName as string | undefined;
    const lastName = value.lastName as string | undefined;

    if (!firstName?.trim()) {
      return helpers.error("any.custom", {
        message: "First name is required for individual customers",
      });
    }

    if (!lastName?.trim()) {
      return helpers.error("any.custom", {
        message: "Last name is required for individual customers",
      });
    }
  }

  if (customerType === "corporate") {
    const companyName = value.companyName as string | undefined;

    if (!companyName?.trim()) {
      return helpers.error("any.custom", {
        message: "Company name is required for corporate customers",
      });
    }
  }

  return value;
};

export const createCustomerSchema = Joi.object({
  customerType: Joi.string()
    .valid(...CUSTOMER_TYPES)
    .required()
    .messages({
      "any.required": "Customer type is required",
      "any.only": "Customer type must be individual or corporate",
    }),
  tier: Joi.string()
    .valid(...CUSTOMER_TIERS)
    .default("standard"),
  firstName: Joi.string().trim().allow("").optional(),
  lastName: Joi.string().trim().allow("").optional(),
  companyName: Joi.string().trim().allow("").optional(),
  email: emailSchema,
  phone: phoneSchema,
  alternatePhone: Joi.string().trim().allow("").optional(),
  billingAddress: billingAddressSchema.optional(),
  vatNumber: Joi.string().trim().allow("").optional(),
  notes: Joi.string().trim().allow("").max(5000).optional(),
  tags: Joi.array().items(Joi.string().trim().min(1).max(50)).max(20).optional(),
  marketingOptIn: Joi.boolean().default(false),
  userId: objectIdSchema.optional(),
})
  .custom((value, helpers) => validateCustomerTypeFields(value, helpers, { isCreate: true }))
  .messages({
    "any.custom": "{{#message}}",
  });

export const updateCustomerSchema = Joi.object({
  customerType: Joi.string()
    .valid(...CUSTOMER_TYPES)
    .optional(),
  tier: Joi.string()
    .valid(...CUSTOMER_TIERS)
    .optional(),
  firstName: Joi.string().trim().min(1).optional(),
  lastName: Joi.string().trim().min(1).optional(),
  companyName: Joi.string().trim().min(1).optional(),
  email: Joi.string().trim().email().optional().messages({
    "string.email": "Enter a valid email address",
  }),
  phone: Joi.string().trim().min(1).optional().messages({
    "string.empty": "Phone cannot be empty",
  }),
  alternatePhone: Joi.string().trim().allow("").optional(),
  billingAddress: billingAddressSchema.optional(),
  vatNumber: Joi.string().trim().allow("").optional(),
  notes: Joi.string().trim().allow("").max(5000).optional(),
  tags: Joi.array().items(Joi.string().trim().min(1).max(50)).max(20).optional(),
  marketingOptIn: Joi.boolean().optional(),
  userId: objectIdSchema.allow(null).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update",
  })
  .custom((value, helpers) => validateCustomerTypeFields(value, helpers, { isCreate: false }))
  .messages({
    "any.custom": "{{#message}}",
  });

export const getCustomersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow("").optional(),
  status: Joi.string()
    .valid(...CUSTOMER_STATUSES)
    .optional(),
  customerType: Joi.string()
    .valid(...CUSTOMER_TYPES)
    .optional(),
  tier: Joi.string()
    .valid(...CUSTOMER_TIERS)
    .optional(),
  sort: Joi.string().trim().optional(),
});
