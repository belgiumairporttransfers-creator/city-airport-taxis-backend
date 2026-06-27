import { Admin } from "@/infrastructure/database/models/Admin";
import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import logger from "@/shared/utils/logger";
import notificationRepository from "@/modules/notifications/repositories/notification.repository";
import { toNotificationResponse } from "@/modules/notifications/dto";
import notificationPubSub from "@/modules/notifications/socket/notification-pubsub";
import type {
  CreateNotificationData,
  GetNotificationsQuery,
  NotificationRecipientType,
} from "@/modules/notifications/types/notification.types";
import { ADMIN_DRIVER_NOTIFICATION_TYPES } from "@/modules/notifications/types/notification.types";

const NOTIFICATION_RETENTION_DAYS = 90;

type NotifyPayload = Omit<CreateNotificationData, "recipientType" | "recipientIds">;

class NotificationService {
  async create(data: CreateNotificationData) {
    const notification = await notificationRepository.create({
      ...data,
      severity: data.severity ?? "info",
    });

    const dto = toNotificationResponse(notification);

    await this.deliver("notification:new", dto, data.recipientType, data.recipientIds);

    auditService.log({
      event: AuditEvents.NOTIFICATION_CREATED,
      actorType: "system",
      entityType: "notification",
      entityId: notification._id.toString(),
      metadata: {
        type: data.type,
        recipientType: data.recipientType,
        recipientIds: data.recipientIds,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    });

    return notification;
  }

  async createMany(items: CreateNotificationData[]) {
    const created = await Promise.all(items.map((item) => this.create(item)));
    return created;
  }

  async notifyAdmins(data: NotifyPayload) {
    const admins = await Admin.find().select("_id").lean();

    if (admins.length === 0) {
      logger.warn("notifyAdmins called but no admins exist");
      return [];
    }

    return this.createMany(
      admins.map((admin) => ({
        ...data,
        recipientType: "admin" as const,
        recipientIds: [admin._id.toString()],
      }))
    );
  }

  async notifyRole(role: string, data: NotifyPayload) {
    return this.create({
      ...data,
      recipientType: "role",
      recipientIds: [role],
    });
  }

  async notifyUser(userId: string, data: NotifyPayload) {
    return this.create({
      ...data,
      recipientType: "user",
      recipientIds: [userId],
    });
  }

  async notifyDriver(driverUserId: string, data: NotifyPayload) {
    return this.create({
      ...data,
      recipientType: "driver",
      recipientIds: [driverUserId],
    });
  }

  async getNotifications(adminId: string, query: GetNotificationsQuery) {
    const result = await notificationRepository.findByRecipient(adminId, query, [
      ...ADMIN_DRIVER_NOTIFICATION_TYPES,
    ]);

    return {
      items: result.data,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    };
  }

  async getUnreadCount(adminId: string) {
    return notificationRepository.countUnread(adminId, [...ADMIN_DRIVER_NOTIFICATION_TYPES]);
  }

  async markAsRead(id: string, adminId: string) {
    const notification = await notificationRepository.markAsRead(id, adminId);

    if (!notification) {
      const existing = await notificationRepository.findById(id);

      if (!existing) {
        throw new AppError("Notification not found", 404);
      }

      if (!existing.recipientIds.includes(adminId)) {
        throw new AppError("You do not have access to this notification", 403);
      }

      return existing;
    }

    const dto = toNotificationResponse(notification);

    await this.deliver("notification:read", dto, notification.recipientType, [adminId]);

    auditService.log({
      event: AuditEvents.NOTIFICATION_READ,
      actorId: adminId,
      actorType: "admin",
      entityType: "notification",
      entityId: id,
    });

    return notification;
  }

  async markAllAsRead(adminId: string) {
    await notificationRepository.markAllAsRead(adminId, [...ADMIN_DRIVER_NOTIFICATION_TYPES]);
    const unreadCount = await notificationRepository.countUnread(adminId, [
      ...ADMIN_DRIVER_NOTIFICATION_TYPES,
    ]);

    await notificationPubSub.publish({
      event: "notification:all-read",
      recipientType: "admin",
      recipientIds: [adminId],
      unreadCount,
    });

    auditService.log({
      event: AuditEvents.NOTIFICATION_READ_ALL,
      actorId: adminId,
      actorType: "admin",
      entityType: "notification",
      metadata: { unreadCount },
    });
  }

  async deleteNotification(id: string, adminId: string) {
    const deleted = await notificationRepository.deleteById(id, adminId);

    if (!deleted) {
      throw new AppError("Notification not found", 404);
    }

    return deleted;
  }

  async deleteExpired() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - NOTIFICATION_RETENTION_DAYS);
    const result = await notificationRepository.deleteOld(cutoff);
    return result.deletedCount ?? 0;
  }

  private async deliver(
    event: "notification:new" | "notification:updated" | "notification:read",
    notification: ReturnType<typeof toNotificationResponse>,
    recipientType: NotificationRecipientType,
    recipientIds: string[]
  ) {
    await notificationPubSub.publish({
      event,
      notification,
      recipientType,
      recipientIds,
    });
  }
}

export default new NotificationService();
