import { MessageAttachment } from "@/infrastructure/database/models/MessageAttachment";
import type { AttachmentKind } from "@/modules/communication/types/communication.types";

class MessageAttachmentRepository {
  create(data: {
    conversationId: string;
    uploadedByAccountType: string;
    uploadedByAccountId: string;
    kind: AttachmentKind;
    url: string;
    publicId: string;
    mimeType: string;
    size: number;
    filename: string;
    duration?: number;
    waveform?: number[];
    thumbnailUrl?: string;
  }) {
    return MessageAttachment.create(data);
  }

  findById(id: string) {
    return MessageAttachment.findById(id);
  }

  linkMessage(id: string, messageId: string) {
    return MessageAttachment.findByIdAndUpdate(id, { messageId }, { new: true });
  }

  async findByConversation(
    conversationId: string,
    options?: { kind?: AttachmentKind; page?: number; limit?: number }
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { conversationId };

    if (options?.kind) {
      filter.kind = options.kind;
    }

    const [data, total] = await Promise.all([
      MessageAttachment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MessageAttachment.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    return {
      data,
      page,
      limit,
      total,
      pages,
      hasNextPage: page < pages,
      hasPrevPage: page > 1,
    };
  }
}

export default new MessageAttachmentRepository();
