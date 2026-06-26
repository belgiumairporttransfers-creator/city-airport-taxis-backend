import Joi from "joi";
import {
  DRIVER_APPLICATION_STATUSES,
  DRIVER_DOCUMENT_FIELDS,
  DRIVER_SHIFT_TYPES,
} from "../types/driver.types";

const timeSchema = Joi.string()
  .trim()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
  .messages({
    "string.pattern.base": "Time must be in HH:mm 24-hour format",
  });

const documentFieldSchema = Joi.string().trim().uri().required().messages({
  "any.required": "Document URL is required",
  "string.uri": "Document must be a valid URL",
});

const documentsSchema = Joi.object(
  Object.fromEntries(DRIVER_DOCUMENT_FIELDS.map((field) => [field, documentFieldSchema]))
).required();

const applicationBodySchema = {
  operatingCountry: Joi.string().trim().min(1).max(120).required(),
  operatingCity: Joi.string().trim().min(1).max(120).required(),
  firstName: Joi.string().trim().min(1).max(80).required(),
  lastName: Joi.string().trim().min(1).max(80).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().min(5).max(30).required(),
  homeAddress: Joi.string().trim().min(1).max(500).required(),
  carType: Joi.string().trim().min(1).max(120).required(),
  carColor: Joi.string().trim().min(1).max(60).required(),
  licensePlate: Joi.string().trim().min(1).max(20).required(),
  carYearModel: Joi.string().trim().min(1).max(40).required(),
  yearsOfExperience: Joi.number().integer().min(0).max(80).required(),
  shiftType: Joi.string()
    .valid(...DRIVER_SHIFT_TYPES)
    .required(),
  availableFrom: timeSchema.required(),
  availableTo: timeSchema.required(),
  profilePhoto: Joi.string().trim().uri().allow("").optional(),
  documents: documentsSchema,
};

export const submitDriverApplicationSchema = Joi.object(applicationBodySchema);

const adminCreateApplicationBodySchema = {
  operatingCountry: Joi.string().trim().min(1).max(120).required(),
  operatingCity: Joi.string().trim().min(1).max(120).required(),
  firstName: Joi.string().trim().min(1).max(80).required(),
  lastName: Joi.string().trim().min(1).max(80).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().min(5).max(30).required(),
  homeAddress: Joi.string().trim().min(1).max(500).required(),
  carType: Joi.string().trim().min(1).max(120).required(),
  carColor: Joi.string().trim().min(1).max(60).required(),
  licensePlate: Joi.string().trim().min(1).max(20).required(),
  carYearModel: Joi.string().trim().min(1).max(40).required(),
  yearsOfExperience: Joi.number().integer().min(0).max(80).required(),
  shiftType: Joi.string()
    .valid(...DRIVER_SHIFT_TYPES)
    .required(),
  availableFrom: timeSchema.required(),
  availableTo: timeSchema.required(),
  profilePhoto: Joi.string().trim().uri().allow("").optional(),
  about: Joi.string().trim().allow("").max(5000).optional(),
  skills: Joi.array().items(Joi.string().trim().min(1).max(80)).max(30).optional(),
  documents: documentsSchema,
};

export const createDriverApplicationSchema = Joi.object(adminCreateApplicationBodySchema);

export const resubmitDriverApplicationSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  operatingCountry: Joi.string().trim().min(1).max(120).optional(),
  operatingCity: Joi.string().trim().min(1).max(120).optional(),
  firstName: Joi.string().trim().min(1).max(80).optional(),
  lastName: Joi.string().trim().min(1).max(80).optional(),
  phone: Joi.string().trim().min(5).max(30).optional(),
  homeAddress: Joi.string().trim().min(1).max(500).optional(),
  carType: Joi.string().trim().min(1).max(120).optional(),
  carColor: Joi.string().trim().min(1).max(60).optional(),
  licensePlate: Joi.string().trim().min(1).max(20).optional(),
  carYearModel: Joi.string().trim().min(1).max(40).optional(),
  yearsOfExperience: Joi.number().integer().min(0).max(80).optional(),
  shiftType: Joi.string()
    .valid(...DRIVER_SHIFT_TYPES)
    .optional(),
  availableFrom: timeSchema.optional(),
  availableTo: timeSchema.optional(),
  profilePhoto: Joi.string().trim().uri().allow("").optional(),
  documents: Joi.object(
    Object.fromEntries(
      DRIVER_DOCUMENT_FIELDS.map((field) => [
        field,
        Joi.string().trim().uri().optional(),
      ])
    )
  ).optional(),
})
  .min(2)
  .messages({
    "object.min": "At least one field besides email is required to resubmit",
  });

export const updateDriverApplicationSchema = Joi.object({
  operatingCountry: Joi.string().trim().min(1).max(120).optional(),
  operatingCity: Joi.string().trim().min(1).max(120).optional(),
  firstName: Joi.string().trim().min(1).max(80).optional(),
  lastName: Joi.string().trim().min(1).max(80).optional(),
  phone: Joi.string().trim().min(5).max(30).optional(),
  homeAddress: Joi.string().trim().min(1).max(500).optional(),
  carType: Joi.string().trim().min(1).max(120).optional(),
  carColor: Joi.string().trim().min(1).max(60).optional(),
  licensePlate: Joi.string().trim().min(1).max(20).optional(),
  carYearModel: Joi.string().trim().min(1).max(40).optional(),
  yearsOfExperience: Joi.number().integer().min(0).max(80).optional(),
  shiftType: Joi.string()
    .valid(...DRIVER_SHIFT_TYPES)
    .optional(),
  availableFrom: timeSchema.optional(),
  availableTo: timeSchema.optional(),
  profilePhoto: Joi.string().trim().uri().allow("").optional(),
  about: Joi.string().trim().allow("").max(5000).optional(),
  skills: Joi.array().items(Joi.string().trim().min(1).max(80)).max(30).optional(),
  documents: Joi.object(
    Object.fromEntries(
      DRIVER_DOCUMENT_FIELDS.map((field) => [
        field,
        Joi.string().trim().uri().optional(),
      ])
    )
  ).optional(),
  reviewNotes: Joi.string().trim().allow("").max(5000).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update",
  });

export const driverUploadDocumentSchema = Joi.object({
  applicationNumber: Joi.string().trim().min(5).max(40).required(),
  email: Joi.string().trim().email().required(),
});

export const reviewNotesSchema = Joi.object({
  reviewNotes: Joi.string().trim().min(1).max(5000).required().messages({
    "any.required": "Review notes are required",
    "string.empty": "Review notes are required",
  }),
});

export const optionalReviewNotesSchema = Joi.object({
  reviewNotes: Joi.string().trim().allow("").max(5000).optional(),
});

export const getDriverApplicationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow("").optional(),
  status: Joi.string()
    .valid(...DRIVER_APPLICATION_STATUSES)
    .optional(),
  sort: Joi.string().trim().optional(),
});

export const applicationNumberParamSchema = Joi.object({
  applicationNumber: Joi.string().trim().min(5).max(40).required(),
});
