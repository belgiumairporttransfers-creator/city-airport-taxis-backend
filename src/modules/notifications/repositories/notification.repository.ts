import { Notification } from "@/infrastructure/database/models/Notification";
import type {
  CreateNotificationData,
  GetNotificationsQuery,
} from "@/modules/notifications/types/notification.types";
import APIFeature from "@/shared/utils/APIFeature";

class NotificationRepository {
  create(data: CreateNotificationData) {
    return Notification.create(data);
  }

  createMany(data: CreateNotificationData[]) {
    return Notification.insertMany(data);
  }

  findById(id: string) {
    return Notification.findById(id);
  }

  findByRecipient(recipientId: string, query: GetNotificationsQuery, type?: string) {
    return new APIFeature(Notification, query, {
      initialFilter: {
        recipientIds: recipientId,
        ...(type ? { type } : {}),
      },
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "-createdAt",
        allowedFields: ["createdAt", "readAt", "updatedAt"],
      },
      filterFields: ["isRead", "severity", "entityType"],
      search: {
        searchFields: ["title", "message", "type", "entityType", "entityId"],
      },
      excludeFields: ["__v"],
      lean: true,
    }).execute();
  }

  countUnread(recipientId: string, type?: string) {
    return Notification.countDocuments({
      recipientIds: recipientId,
      isRead: false,
      ...(type ? { type } : {}),
    });
  }

  markAsRead(id: string, recipientId: string) {
    return Notification.findOneAndUpdate(
      { _id: id, recipientIds: recipientId, isRead: false },
      { isRead: true, readAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  markAllAsRead(recipientId: string, type?: string) {
    return Notification.updateMany(
      {
        recipientIds: recipientId,
        isRead: false,
        ...(type ? { type } : {}),
      },
      { isRead: true, readAt: new Date() }
    );
  }

  deleteById(id: string, recipientId: string) {
    return Notification.findOneAndDelete({ _id: id, recipientIds: recipientId });
  }

  deleteOld(olderThan: Date): Promise<{ deletedCount?: number }> {
    return Notification.deleteMany({ createdAt: { $lt: olderThan } });
  }
}

export default new NotificationRepository();
