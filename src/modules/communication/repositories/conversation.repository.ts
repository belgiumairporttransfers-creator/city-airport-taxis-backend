import { Conversation } from "@/infrastructure/database/models/Conversation";
import type {
  ConversationParticipant,
  GetConversationsQuery,
  IConversation,
  LastMessagePreview,
} from "@/modules/communication/types/communication.types";

class ConversationRepository {
  create(data: {
    participantKey: string;
    participants: ConversationParticipant[];
    metadata?: Record<string, unknown>;
  }) {
    return Conversation.create({
      type: "direct",
      participantKey: data.participantKey,
      participants: data.participants,
      lastActivityAt: new Date(),
      metadata: data.metadata,
    });
  }

  findByParticipantKey(participantKey: string) {
    return Conversation.findOne({ participantKey });
  }

  findById(id: string) {
    return Conversation.findById(id);
  }

  async findByParticipant(accountType: string, accountId: string, query: GetConversationsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      "participants.accountType": accountType,
      "participants.accountId": accountId,
      isArchived: query.isArchived ?? false,
    };

    if (query.search?.trim()) {
      filter["participants.displayName"] = { $regex: query.search.trim(), $options: "i" };
    }

    const [data, total] = await Promise.all([
      Conversation.find(filter).sort({ lastActivityAt: -1 }).skip(skip).limit(limit).lean(),
      Conversation.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    return {
      data: data as unknown as IConversation[],
      page,
      limit,
      total,
      pages,
      hasNextPage: page < pages,
      hasPrevPage: page > 1,
    };
  }

  updatePreview(id: string, preview: LastMessagePreview) {
    return Conversation.findByIdAndUpdate(
      id,
      { lastMessagePreview: preview, lastActivityAt: preview.sentAt },
      { new: true }
    );
  }

  updatePreviewStatus(id: string, messageId: string, status: string) {
    return Conversation.findOneAndUpdate(
      { _id: id, "lastMessagePreview.messageId": messageId },
      { $set: { "lastMessagePreview.status": status } },
      { new: true }
    );
  }

  clearPreview(id: string) {
    return Conversation.findByIdAndUpdate(
      id,
      { $unset: { lastMessagePreview: "" } },
      { new: true }
    );
  }

  async incrementUnread(id: string, exceptAccountId: string) {
    const conversation = await Conversation.findById(id);
    if (!conversation) return null;

    for (const participant of conversation.participants) {
      if (participant.accountId !== exceptAccountId) {
        participant.unreadCount += 1;
      }
    }

    conversation.lastActivityAt = new Date();
    return conversation.save();
  }

  async resetUnread(id: string, accountId: string, lastReadMessageId: string) {
    const conversation = await Conversation.findById(id);
    if (!conversation) return null;

    const participant = conversation.participants.find((p) => p.accountId === accountId);
    if (!participant) return null;

    participant.unreadCount = 0;
    participant.lastReadMessageId = lastReadMessageId;
    participant.lastReadAt = new Date();

    return conversation.save();
  }

  getTotalUnread(accountType: string, accountId: string) {
    return Conversation.aggregate<{ total: number }>([
      { $match: { "participants.accountType": accountType, "participants.accountId": accountId } },
      { $unwind: "$participants" },
      {
        $match: {
          "participants.accountType": accountType,
          "participants.accountId": accountId,
        },
      },
      { $group: { _id: null, total: { $sum: "$participants.unreadCount" } } },
    ]).then((rows) => rows[0]?.total ?? 0);
  }

  searchByParticipantName(accountType: string, accountId: string, search: string, limit: number) {
    return Conversation.find({
      "participants.accountType": accountType,
      "participants.accountId": accountId,
      "participants.displayName": { $regex: search, $options: "i" },
    })
      .sort({ lastActivityAt: -1 })
      .limit(limit)
      .lean();
  }
}

export default new ConversationRepository();
