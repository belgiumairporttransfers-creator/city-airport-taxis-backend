import Joi from "joi";
import { BOOKING_NUMBER_PATTERN } from "@/modules/bookings/utils/booking-number";
import { ASSIGNMENT_STATUSES } from "../types/assignment.types";
import { idParamSchema } from "@/shared/validators/object-id.schema";

export const createAssignmentSchema = Joi.object({
  bookingId: Joi.string().hex().length(24).required(),
  driverId: Joi.string().hex().length(24).required(),
  adminNotes: Joi.string().trim().allow("", null).max(2000).optional(),
});

export const reassignAssignmentSchema = createAssignmentSchema;

export const rejectAssignmentSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(1000).required(),
});

export const getAssignmentsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string()
    .valid(...ASSIGNMENT_STATUSES)
    .optional(),
  driver: Joi.string().hex().length(24).optional(),
  booking: Joi.alternatives()
    .try(Joi.string().hex().length(24), Joi.string().trim().pattern(BOOKING_NUMBER_PATTERN))
    .optional(),
  search: Joi.string().trim().allow("").optional(),
  sort: Joi.string().trim().optional(),
});

export const getDriverAssignmentsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string()
    .valid(...ASSIGNMENT_STATUSES)
    .optional(),
  scope: Joi.string()
    .valid("today", "upcoming", "awaiting", "accepted", "completed", "cancelled")
    .optional(),
  sort: Joi.string().trim().optional(),
});

export { idParamSchema as assignmentIdParamSchema };
