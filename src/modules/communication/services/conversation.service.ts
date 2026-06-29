import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import { buildParticipantKey } from "@/modules/communication/utils/participant-key";
import conversationRepository from "@/modules/communication/repositories/conversation.repository";
import participantService from "@/modules/communication/services/participant.service";
import presenceService from "@/modules/communication/services/presence.service";
import typingService from "@/modules/communication/services/typing.service";
import { ensureConversationPreview } from "@/modules/communication/services/conversation-preview.service";
import { toConversationListItem } from "@/modules/communication/dto";
import type {
  CommunicationActor,
  CreateConversationData,
  GetConversationsQuery,
  IConversation,
} from "@/modules/communication/types/communication.types";

class ConversationService {
  async assertParticipant(
    conversationId: string,
    actor: CommunicationActor
  ) {
    const conversation = await conversationRepository.findById(conversationId);

    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    const isParticipant = conversation.participants.some(
      (p) => p.accountType === actor.accountType && p.accountId === actor.accountId
    );

    if (!isParticipant) {
      throw new AppError("You are not a participant in this conversation", 403);
    }

    return conversation;
  }

  async create(actor: CommunicationActor, data: CreateConversationData) {
    const target = await participantService.resolveParticipant(
      data.participantAccountType,
      data.participantAccountId
    );

    participantService.validateConversationCreation(actor, target);

    if (target.role === "driver") {
      await participantService.assertDriverEligible(target.accountId);
    }

    const participantKey = buildParticipantKey(
      { accountType: actor.accountType, accountId: actor.accountId },
      { accountType: target.accountType, accountId: target.accountId }
    );

    const existing = await conversationRepository.findByParticipantKey(participantKey);
    if (existing) {
      return existing;
    }

    const conversation = await conversationRepository.create({
      participantKey,
      participants: [participantService.getActorParticipant(actor), target],
    });

    auditService.log({
      event: AuditEvents.CONVERSATION_CREATED,
      actorId: actor.accountId,
      actorType: actor.accountType === "admin" ? "admin" : "user",
      entityType: "conversation",
      entityId: conversation._id.toString(),
      metadata: { participantKey },
    });

    return conversation;
  }

  async getById(conversationId: string, actor: CommunicationActor) {
    const conversation = await this.assertParticipant(conversationId, actor);
    const syncedConversation = await ensureConversationPreview(conversation);
    const other = this.getOtherParticipant(syncedConversation, actor);
    const presence = await presenceService.getStatus(other.accountType, other.accountId);
    const isTyping = await typingService.isTyping(
      conversationId,
      other.accountType,
      other.accountId
    );

    return {
      ...toConversationListItem(syncedConversation, actor.accountId, {
        presence: presence.status,
        lastSeenAt: presence.lastSeenAt,
        isTyping,
      }),
      participants: syncedConversation.participants,
    };
  }

  async list(actor: CommunicationActor, query: GetConversationsQuery) {
    const result = await conversationRepository.findByParticipant(
      actor.accountType,
      actor.accountId,
      query
    );

    const items = await Promise.all(
      result.data.map(async (conversation) => {
        const syncedConversation = await ensureConversationPreview(conversation);
        const other = this.getOtherParticipant(syncedConversation, actor);
        const presence = await presenceService.getStatus(other.accountType, other.accountId);
        const isTyping = await typingService.isTyping(
          syncedConversation._id.toString(),
          other.accountType,
          other.accountId
        );

        return toConversationListItem(syncedConversation, actor.accountId, {
          presence: presence.status,
          lastSeenAt: presence.lastSeenAt,
          isTyping,
        });
      })
    );

    return {
      items,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    };
  }

  getOtherParticipant(conversation: IConversation, actor: CommunicationActor) {
    const other = conversation.participants.find(
      (p) => !(p.accountType === actor.accountType && p.accountId === actor.accountId)
    );

    if (!other) {
      throw new AppError("Conversation participant not found", 404);
    }

    return other;
  }

  async getUnreadCount(actor: CommunicationActor) {
    const total = await conversationRepository.getTotalUnread(actor.accountType, actor.accountId);
    return { total };
  }
}

export default new ConversationService();
