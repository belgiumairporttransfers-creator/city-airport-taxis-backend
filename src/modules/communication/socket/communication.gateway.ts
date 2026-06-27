import { getSocketServer } from "@/infrastructure/socket/server";
import { SocketRooms } from "@/infrastructure/socket/rooms";
import type {
  CommunicationPubSubMessage,
  ParticipantAccountType,
} from "@/modules/communication/types/communication.types";
import logger from "@/shared/utils/logger";

export const CommunicationSocketRooms = {
  conversation: (id: string) => `conversation:${id}`,
  call: (id: string) => `call:${id}`,
} as const;

class CommunicationGateway {
  handleMessage(message: CommunicationPubSubMessage): void {
    const io = getSocketServer();
    if (!io) {
      return;
    }

    const rooms = this.resolveRooms(message);

    if (rooms.length === 0) {
      return;
    }

    for (const room of rooms) {
      if (message.excludeSocketId) {
        io.to(room).except(message.excludeSocketId).emit(message.event, message.payload);
      } else {
        io.to(room).emit(message.event, message.payload);
      }
    }
  }

  private resolveRooms(message: CommunicationPubSubMessage): string[] {
    if (message.conversationId) {
      return [CommunicationSocketRooms.conversation(message.conversationId)];
    }

    if (message.callId) {
      return [CommunicationSocketRooms.call(message.callId)];
    }

    if (message.recipientAccountType && message.recipientAccountIds?.length) {
      return message.recipientAccountIds.flatMap((id) =>
        this.accountRoom(message.recipientAccountType!, id)
      );
    }

    logger.warn("Communication pub/sub message had no target rooms", { event: message.event });
    return [];
  }

  private accountRoom(accountType: ParticipantAccountType, accountId: string): string[] {
    if (accountType === "admin") {
      return [SocketRooms.admin(accountId), SocketRooms.user(accountId)];
    }
    return [SocketRooms.user(accountId)];
  }

  emitToConversation(
    conversationId: string,
    event: CommunicationPubSubMessage["event"],
    payload: unknown,
    excludeSocketId?: string
  ) {
    return this.handleMessage({ event, conversationId, payload, excludeSocketId });
  }

  emitToAccounts(
    accountType: ParticipantAccountType,
    accountIds: string[],
    event: CommunicationPubSubMessage["event"],
    payload: unknown,
    excludeSocketId?: string
  ) {
    return this.handleMessage({
      event,
      payload,
      recipientAccountType: accountType,
      recipientAccountIds: accountIds,
      excludeSocketId,
    });
  }
}

export default new CommunicationGateway();
