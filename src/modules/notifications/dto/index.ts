import type { INotification } from "@/modules/notifications/types/notification.types";
import type { NotificationResponse } from "@/modules/notifications/types/notification.types";

type NotificationLike = INotification | (Record<string, unknown> & { _id: unknown });

const toIdString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value);
  }
  return undefined;
};

const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
};

export const toNotificationResponse = (notification: NotificationLike): NotificationResponse => {
  const record =
    typeof (notification as INotification).toObject === "function"
      ? ((notification as INotification).toObject() as Record<string, unknown>)
      : (notification as Record<string, unknown>);

  return {
    id: toIdString(record._id) ?? "",
    title: record.title as string,
    message: record.message as string,
    type: record.type as string,
    severity: record.severity as NotificationResponse["severity"],
    entityType: record.entityType as NotificationResponse["entityType"],
    entityId: record.entityId as string | undefined,
    actionUrl: record.actionUrl as string | undefined,
    isRead: Boolean(record.isRead),
    readAt: toIsoString(record.readAt),
    createdAt: toIsoString(record.createdAt) ?? "",
  };
};
