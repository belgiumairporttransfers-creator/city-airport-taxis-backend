import Joi from "joi";
import { objectIdSchema } from "@/shared/validators/object-id.schema";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_RECIPIENT_TYPES,
  NOTIFICATION_SEVERITIES,
} from "../types/notification.types";

export const getNotificationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  isRead: Joi.boolean().optional(),
  severity: Joi.string()
    .valid(...NOTIFICATION_SEVERITIES)
    .optional(),
  entityType: Joi.string()
    .valid(...NOTIFICATION_ENTITY_TYPES)
    .optional(),
  search: Joi.string().trim().allow("").optional(),
  sort: Joi.string().optional(),
});

export const notificationIdParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

export const createNotificationSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  message: Joi.string().trim().min(1).max(2000).required(),
  type: Joi.string().trim().min(1).max(120).required(),
  severity: Joi.string()
    .valid(...NOTIFICATION_SEVERITIES)
    .optional(),
  entityType: Joi.string()
    .valid(...NOTIFICATION_ENTITY_TYPES)
    .required(),
  entityId: Joi.string().trim().optional(),
  actionUrl: Joi.string().trim().optional(),
  recipientType: Joi.string()
    .valid(...NOTIFICATION_RECIPIENT_TYPES)
    .required(),
  recipientIds: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  metadata: Joi.object().unknown(true).optional(),
});
