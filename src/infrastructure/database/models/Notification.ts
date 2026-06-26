import { Schema, model } from "mongoose";
import type { INotification } from "@/modules/notifications/types/notification.types";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_RECIPIENT_TYPES,
  NOTIFICATION_SEVERITIES,
} from "@/modules/notifications/types/notification.types";

const notificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    severity: {
      type: String,
      enum: NOTIFICATION_SEVERITIES,
      default: "info",
    },
    entityType: {
      type: String,
      enum: NOTIFICATION_ENTITY_TYPES,
      required: true,
    },
    entityId: {
      type: String,
      trim: true,
    },
    actionUrl: {
      type: String,
      trim: true,
    },
    recipientType: {
      type: String,
      enum: NOTIFICATION_RECIPIENT_TYPES,
      required: true,
      index: true,
    },
    recipientIds: {
      type: [String],
      default: [],
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipientIds: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

export const Notification = model<INotification>("Notification", notificationSchema);
