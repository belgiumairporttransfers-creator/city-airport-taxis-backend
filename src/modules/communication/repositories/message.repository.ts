import { Message } from "@/infrastructure/database/models/Message";
import type { GetMessagesQuery, IMessage } from "@/modules/communication/types/communication.types";
import type { ClientSession } from "mongoose";

class MessageRepository {
  create(
    data: {
      conversationId: string;
      senderAccountType: string;
      senderAccountId: string;
      type: string;
      content?: string;
      attachmentId?: string;
      replyToMessageId?: string;
      clientMessageId?: string;
      metadata?: Record<string, unknown>;
    },
    session?: ClientSession
  ) {
    return Message.create(
      [
        {
          ...data,
          status: "sent",
        },
      ],
      session ? { session } : undefined
    ).then((docs) => docs[0]);
  }

  findById(id: string) {
    return Message.findById(id);
  }

  findByClientMessageId(clientMessageId: string) {
    return Message.findOne({ clientMessageId });
  }

  async findByConversation(conversationId: string, query: GetMessagesQuery) {
    const limit = query.limit ?? 30;
    const filter: Record<string, unknown> = {
      conversationId,
      deletedAt: { $exists: false },
    };

    if (query.before) {
      filter._id = { $lt: query.before };
    } else if (query.after) {
      filter._id = { $gt: query.after };
    }

    const items = await Message.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = items.length > limit;
    const data = (hasMore ? items.slice(0, limit) : items) as unknown as IMessage[];

    return {
      data: data.reverse(),
      hasMore,
      nextCursor: hasMore ? String(data[0]?._id) : undefined,
    };
  }

  markDelivered(id: string) {
    return Message.findOneAndUpdate(
      { _id: id, status: "sent" },
      { status: "delivered", deliveredAt: new Date() },
      { new: true }
    );
  }

  markSeenUpTo(conversationId: string, messageId: string, recipientAccountId: string) {
    return Message.updateMany(
      {
        conversationId,
        _id: { $lte: messageId },
        senderAccountId: { $ne: recipientAccountId },
        status: { $in: ["sent", "delivered"] },
        deletedAt: { $exists: false },
      },
      { status: "seen", seenAt: new Date() }
    );
  }

  hardDelete(id: string) {
    return Message.findOneAndDelete({ _id: id }).lean();
  }

  softDelete(id: string, deletedBy: { accountType: string; accountId: string }) {
    return Message.findOneAndUpdate(
      { _id: id, deletedAt: { $exists: false } },
      {
        deletedAt: new Date(),
        deletedByAccountType: deletedBy.accountType,
        deletedByAccountId: deletedBy.accountId,
        content: undefined,
      },
      { new: true }
    );
  }

  findLatestNonDeleted(conversationId: string) {
    return Message.findOne({
      conversationId,
      deletedAt: { $exists: false },
    })
      .sort({ _id: -1 })
      .lean();
  }

  searchInConversations(conversationIds: string[], search: string, limit: number) {
    if (conversationIds.length === 0) return Promise.resolve([]);

    return Message.find({
      conversationId: { $in: conversationIds },
      deletedAt: { $exists: false },
      content: { $regex: search, $options: "i" },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  getConversationIdsForParticipant(accountType: string, accountId: string) {
    return Message.distinct("conversationId", {
      $or: [],
    }).then(async () => {
      const { Conversation } = await import("@/infrastructure/database/models/Conversation");
      const conversations = await Conversation.find({
        "participants.accountType": accountType,
        "participants.accountId": accountId,
      })
        .select("_id")
        .lean();
      return conversations.map((c) => String(c._id));
    });
  }
}

export default new MessageRepository();
