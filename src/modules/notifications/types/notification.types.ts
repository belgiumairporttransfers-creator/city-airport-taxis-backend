import type { Document, Types } from "mongoose";

export const NOTIFICATION_SEVERITIES = ["info", "success", "warning", "error"] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

export const NOTIFICATION_RECIPIENT_TYPES = [
  "admin",
  "user",
  "driver",
  "role",
  "all_admins",
] as const;
export type NotificationRecipientType = (typeof NOTIFICATION_RECIPIENT_TYPES)[number];

export const NOTIFICATION_ENTITY_TYPES = [
  "driver",
  "customer",
  "booking",
  "vehicle",
  "payment",
  "system",
  "other",
] as const;
export type NotificationEntityType = (typeof NOTIFICATION_ENTITY_TYPES)[number];

export interface INotification extends Document {
  _id: Types.ObjectId;
  title: string;
  message: string;
  type: string;
  severity: NotificationSeverity;
  entityType: NotificationEntityType;
  entityId?: string;
  actionUrl?: string;
  recipientType: NotificationRecipientType;
  recipientIds: string[];
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationData {
  title: string;
  message: string;
  type: string;
  severity?: NotificationSeverity;
  entityType: NotificationEntityType;
  entityId?: string;
  actionUrl?: string;
  recipientType: NotificationRecipientType;
  recipientIds: string[];
  metadata?: Record<string, unknown>;
}

export interface GetNotificationsQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
  search?: string;
}

export interface NotificationResponse {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: NotificationSeverity;
  entityType: NotificationEntityType;
  entityId?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export type NotificationSocketEvent =
  | "notification:new"
  | "notification:updated"
  | "notification:read"
  | "notification:all-read";

/** Admin bell / notification center only surfaces new driver application alerts. */
export const ADMIN_DRIVER_APPLICATION_NOTIFICATION_TYPE = "driver.application.submitted";

export interface NotificationPubSubMessage {
  event: NotificationSocketEvent;
  notification?: NotificationResponse;
  recipientType: NotificationRecipientType;
  recipientIds: string[];
  unreadCount?: number;
}
