import { getSocketServer } from "@/infrastructure/socket/server";
import { SocketRooms } from "@/infrastructure/socket/rooms";
import type {
  NotificationPubSubMessage,
  NotificationRecipientType,
  NotificationResponse,
} from "@/modules/notifications/types/notification.types";
import logger from "@/shared/utils/logger";

class NotificationGateway {
  handleMessage(message: NotificationPubSubMessage): void {
    const io = getSocketServer();
    if (!io) {
      return;
    }

    const rooms = this.resolveRooms(message.recipientType, message.recipientIds);
    if (rooms.length === 0) {
      return;
    }

    switch (message.event) {
      case "notification:new":
      case "notification:updated":
        if (!message.notification) {
          return;
        }
        this.emitToRooms(io, message.event, message.notification, rooms);
        break;
      case "notification:read":
        if (!message.notification) {
          return;
        }
        this.emitToRooms(io, message.event, message.notification, rooms);
        break;
      case "notification:all-read":
        this.emitToRooms(io, message.event, { unreadCount: message.unreadCount ?? 0 }, rooms);
        break;
      default:
        logger.warn("Unknown notification socket event", { event: message.event });
    }
  }

  private resolveRooms(recipientType: NotificationRecipientType, recipientIds: string[]): string[] {
    switch (recipientType) {
      case "admin":
        return recipientIds.map((id) => SocketRooms.admin(id));
      case "user":
      case "driver":
        return recipientIds.map((id) => SocketRooms.user(id));
      case "role":
        return recipientIds.map((role) => SocketRooms.role(role));
      case "all_admins":
        return [SocketRooms.role("admin")];
      default:
        return [];
    }
  }

  private emitToRooms(
    io: NonNullable<ReturnType<typeof getSocketServer>>,
    event: string,
    payload: NotificationResponse | { unreadCount: number },
    rooms: string[]
  ): void {
    for (const room of rooms) {
      io.to(room).emit(event, payload);
    }
  }
}

export default new NotificationGateway();
