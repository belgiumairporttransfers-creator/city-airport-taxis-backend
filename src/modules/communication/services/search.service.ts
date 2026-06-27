import {
  toAttachmentResponse,
  toConversationListItem,
  toMessageResponse,
} from "@/modules/communication/dto";
import { buildMessagePreview } from "@/modules/communication/utils/actor";
import conversationRepository from "@/modules/communication/repositories/conversation.repository";
import messageRepository from "@/modules/communication/repositories/message.repository";
import messageAttachmentRepository from "@/modules/communication/repositories/message-attachment.repository";
import conversationService from "@/modules/communication/services/conversation.service";
import presenceService from "@/modules/communication/services/presence.service";
import typingService from "@/modules/communication/services/typing.service";
import type {
  CommunicationActor,
  SearchQuery,
} from "@/modules/communication/types/communication.types";

class SearchService {
  async search(actor: CommunicationActor, query: SearchQuery) {
    const scope = query.scope ?? "all";
    const limit = query.limit ?? 20;

    let conversations: ReturnType<typeof toConversationListItem>[] = [];
    let messages: ReturnType<typeof toMessageResponse>[] = [];

    if (scope === "conversations" || scope === "all") {
      const rows = await conversationRepository.searchByParticipantName(
        actor.accountType,
        actor.accountId,
        query.q,
        limit
      );

      conversations = await Promise.all(
        rows.map(async (conversation) => {
          const other = conversationService.getOtherParticipant(
            conversation as unknown as import("@/modules/communication/types/communication.types").IConversation,
            actor
          );
          const presence = await presenceService.getStatus(other.accountType, other.accountId);
          const isTyping = await typingService.isTyping(
            conversation._id.toString(),
            other.accountType,
            other.accountId
          );

          return toConversationListItem(
            conversation as unknown as import("@/modules/communication/types/communication.types").IConversation,
            actor.accountId,
            {
              presence: presence.status,
              lastSeenAt: presence.lastSeenAt,
              isTyping,
            }
          );
        })
      );
    }

    if (scope === "messages" || scope === "all") {
      const conversationIds = query.conversationId
        ? [query.conversationId]
        : await messageRepository.getConversationIdsForParticipant(
            actor.accountType,
            actor.accountId
          );

      const rows = await messageRepository.searchInConversations(conversationIds, query.q, limit);

      messages = await Promise.all(
        rows.map(async (message) => {
          const attachmentDoc = message.attachmentId
            ? await messageAttachmentRepository.findById(String(message.attachmentId))
            : null;

          return toMessageResponse(message, {
            sender: { displayName: "", avatarUrl: undefined },
            attachment: attachmentDoc ? toAttachmentResponse(attachmentDoc) : undefined,
            replyTo: message.replyToMessageId
              ? {
                  id: String(message.replyToMessageId),
                  previewText: buildMessagePreview(message.type, message.content),
                  senderAccountId: message.senderAccountId,
                }
              : undefined,
          });
        })
      );
    }

    return { conversations, messages };
  }
}

export default new SearchService();
