import { onlineUsersRegistry } from "@/infrastructure/socket/registry/online-users.registry";
import notificationService from "@/modules/notifications/services/notification.service";
import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import logger from "@/shared/utils/logger";
import {
  buildLastMessagePreview,
  toAttachmentResponse,
  toMessageResponse,
} from "@/modules/communication/dto";
import { buildMessagePreview } from "@/modules/communication/utils/actor";
import conversationRepository from "@/modules/communication/repositories/conversation.repository";
import messageRepository from "@/modules/communication/repositories/message.repository";
import messageAttachmentRepository from "@/modules/communication/repositories/message-attachment.repository";
import conversationService from "@/modules/communication/services/conversation.service";
import attachmentService from "@/modules/communication/services/attachment.service";
import communicationPubSub from "@/modules/communication/socket/communication-pubsub";
import { toConversationListItem } from "@/modules/communication/dto";
import presenceService from "@/modules/communication/services/presence.service";
import typingService from "@/modules/communication/services/typing.service";
import { syncConversationPreview } from "@/modules/communication/services/conversation-preview.service";
import type {
  CommunicationActor,
  GetMessagesQuery,
  SendMessageData,
} from "@/modules/communication/types/communication.types";

class MessageService {
  private async buildMessageDto(message: Awaited<ReturnType<typeof messageRepository.findById>>) {
    if (!message) return null;

    const attachmentDoc = message.attachmentId
      ? await messageAttachmentRepository.findById(message.attachmentId.toString())
      : null;

    let replyTo;
    if (message.replyToMessageId) {
      const reply = await messageRepository.findById(message.replyToMessageId.toString());
      if (reply) {
        replyTo = {
          id: reply._id.toString(),
          previewText: buildMessagePreview(reply.type, reply.content),
          senderAccountId: reply.senderAccountId,
        };
      }
    }

    const conversation = await conversationRepository.findById(message.conversationId.toString());
    const senderParticipant = conversation?.participants.find(
      (p) => p.accountId === message.senderAccountId
    );

    return toMessageResponse(message, {
      sender: {
        displayName: senderParticipant?.displayName ?? "",
        avatarUrl: senderParticipant?.avatarUrl,
      },
      attachment: attachmentDoc ? toAttachmentResponse(attachmentDoc) : undefined,
      replyTo,
    });
  }

  private async syncLastMessagePreviewStatus(
    conversationId: string,
    messageId?: string,
    status?: "delivered" | "seen"
  ) {
    const conversation = await conversationRepository.findById(conversationId);
    const preview = conversation?.lastMessagePreview;
    if (!preview) return;

    const targetMessageId = messageId ?? preview.messageId;
    if (preview.messageId !== targetMessageId) return;

    let nextStatus = status;
    if (!nextStatus) {
      const message = await messageRepository.findById(preview.messageId);
      if (!message || message.status === "sent") return;
      nextStatus = message.status as "delivered" | "seen";
    }

    if (preview.status === nextStatus) return;

    await conversationRepository.updatePreviewStatus(conversationId, preview.messageId, nextStatus);
  }

  async send(actor: CommunicationActor, data: SendMessageData, excludeSocketId?: string) {
    await conversationService.assertParticipant(data.conversationId, actor);

    if (data.clientMessageId) {
      const existing = await messageRepository.findByClientMessageId(data.clientMessageId);
      if (existing) {
        const dto = await this.buildMessageDto(existing);
        return dto!;
      }
    }

    if (data.attachmentId) {
      await attachmentService.assertAttachmentForConversation(
        data.attachmentId,
        data.conversationId
      );
    }

    const message = await messageRepository.create({
      conversationId: data.conversationId,
      senderAccountType: actor.accountType,
      senderAccountId: actor.accountId,
      type: data.type,
      content: data.content,
      attachmentId: data.attachmentId,
      replyToMessageId: data.replyToMessageId,
      clientMessageId: data.clientMessageId,
    });

    if (data.attachmentId) {
      await messageAttachmentRepository.linkMessage(data.attachmentId, message._id.toString());
    }

    const preview = buildLastMessagePreview(
      message._id.toString(),
      message.type,
      buildMessagePreview(message.type, message.content),
      { accountType: actor.accountType, accountId: actor.accountId },
      message.createdAt,
      "sent"
    );

    await conversationRepository.updatePreview(data.conversationId, preview);
    await conversationRepository.incrementUnread(data.conversationId, actor.accountId);

    const dto = (await this.buildMessageDto(message))!;

    auditService.log({
      event: AuditEvents.MESSAGE_SENT,
      actorId: actor.accountId,
      actorType: actor.accountType === "admin" ? "admin" : "user",
      entityType: "message",
      entityId: message._id.toString(),
      metadata: { conversationId: data.conversationId, type: data.type },
    });

    await communicationPubSub.publish({
      event: "message:new",
      conversationId: data.conversationId,
      payload: dto,
      excludeSocketId,
    });

    const conversation = await conversationRepository.findById(data.conversationId);
    if (conversation) {
      const other = conversationService.getOtherParticipant(conversation, actor);
      const presence = await presenceService.getStatus(other.accountType, other.accountId);
      const isTyping = await typingService.isTyping(
        data.conversationId,
        other.accountType,
        other.accountId
      );

      await communicationPubSub.publish({
        event: "conversation:update",
        recipientAccountType: other.accountType,
        recipientAccountIds: [other.accountId],
        payload: toConversationListItem(conversation, other.accountId, {
          presence: presence.status,
          lastSeenAt: presence.lastSeenAt,
          isTyping,
        }),
      });

      const isOnline = await onlineUsersRegistry.isUserOnline(other.accountId);
      if (isOnline) {
        try {
          await this.markDelivered(message._id.toString(), {
            accountType: other.accountType,
            accountId: other.accountId,
            role: other.role,
            displayName: other.displayName,
          });
        } catch (error) {
          logger.warn("Auto mark delivered failed", { error, messageId: message._id.toString() });
        }
      } else {
        try {
          if (other.accountType === "admin") {
            await notificationService.notifyAdmins({
              title: `New message from ${actor.displayName}`,
              message: preview.previewText,
              type: "communication.message.received",
              severity: "info",
              entityType: "communication",
              entityId: data.conversationId,
              actionUrl: `/chat?conversationId=${data.conversationId}`,
            });
          } else {
            await notificationService.notifyUser(other.accountId, {
              title: `New message from ${actor.displayName}`,
              message: preview.previewText,
              type: "communication.message.received",
              severity: "info",
              entityType: "communication",
              entityId: data.conversationId,
              actionUrl: `/chat?conversationId=${data.conversationId}`,
            });
          }
        } catch (error) {
          logger.error("Failed to send communication notification", { error });
        }
      }
    }

    return (await this.buildMessageDto(await messageRepository.findById(message._id.toString())))!;
  }

  async list(conversationId: string, actor: CommunicationActor, query: GetMessagesQuery) {
    await conversationService.assertParticipant(conversationId, actor);
    const result = await messageRepository.findByConversation(conversationId, query);

    const items = await Promise.all(
      result.data.map(async (message) => (await this.buildMessageDto(message as never))!)
    );

    return {
      items,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    };
  }

  async markRead(messageId: string, conversationId: string, actor: CommunicationActor) {
    await conversationService.assertParticipant(conversationId, actor);

    const message = await messageRepository.findById(messageId);
    if (!message || message.conversationId.toString() !== conversationId) {
      throw new AppError("Message not found", 404);
    }

    await messageRepository.markSeenUpTo(conversationId, messageId, actor.accountId);
    await conversationRepository.resetUnread(conversationId, actor.accountId, messageId);
    await this.syncLastMessagePreviewStatus(conversationId);

    auditService.log({
      event: AuditEvents.MESSAGE_READ,
      actorId: actor.accountId,
      actorType: actor.accountType === "admin" ? "admin" : "user",
      entityType: "message",
      entityId: messageId,
      metadata: { conversationId },
    });

    const payload = {
      conversationId,
      messageId,
      readAt: new Date().toISOString(),
      readerAccountId: actor.accountId,
      readerAccountType: actor.accountType,
    };

    await communicationPubSub.publish({
      event: "message:read",
      conversationId,
      payload,
    });

    return payload;
  }

  async markDelivered(messageId: string, actor: CommunicationActor) {
    const message = await messageRepository.findById(messageId);
    if (!message) {
      throw new AppError("Message not found", 404);
    }

    await conversationService.assertParticipant(message.conversationId.toString(), actor);

    if (message.senderAccountId === actor.accountId) {
      return null;
    }

    const updated = await messageRepository.markDelivered(messageId);
    if (!updated) return null;

    await this.syncLastMessagePreviewStatus(
      message.conversationId.toString(),
      messageId,
      "delivered"
    );

    const payload = {
      messageId,
      conversationId: message.conversationId.toString(),
      deliveredAt: updated.deliveredAt?.toISOString(),
    };

    await communicationPubSub.publish({
      event: "message:delivered",
      conversationId: message.conversationId.toString(),
      payload,
    });

    return payload;
  }

  async deleteMessage(messageId: string, actor: CommunicationActor) {
    const message = await messageRepository.findById(messageId);
    if (!message) {
      throw new AppError("Message not found", 404);
    }

    await conversationService.assertParticipant(message.conversationId.toString(), actor);

    const conversationId = message.conversationId.toString();
    const deleted = await messageRepository.hardDelete(messageId);

    if (!deleted) {
      throw new AppError("Message not found", 404);
    }

    await syncConversationPreview(conversationId);

    auditService.log({
      event: AuditEvents.MESSAGE_DELETED,
      actorId: actor.accountId,
      actorType: actor.accountType === "admin" ? "admin" : "user",
      entityType: "message",
      entityId: messageId,
      metadata: { conversationId },
    });

    await communicationPubSub.publish({
      event: "message:deleted",
      conversationId,
      payload: { messageId, conversationId },
    });

    await communicationPubSub.publish({
      event: "conversation:update",
      conversationId,
      payload: { conversationId },
    });

    return { messageId };
  }

  /** @deprecated use deleteMessage */
  async softDelete(messageId: string, actor: CommunicationActor) {
    return this.deleteMessage(messageId, actor);
  }
}

export default new MessageService();
