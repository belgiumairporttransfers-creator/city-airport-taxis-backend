import { buildLastMessagePreview } from "@/modules/communication/dto";
import { buildMessagePreview } from "@/modules/communication/utils/actor";
import conversationRepository from "@/modules/communication/repositories/conversation.repository";
import messageRepository from "@/modules/communication/repositories/message.repository";
import type { IConversation } from "@/modules/communication/types/communication.types";

export const syncConversationPreview = async (conversationId: string) => {
  const latest = await messageRepository.findLatestNonDeleted(conversationId);

  if (!latest) {
    await conversationRepository.clearPreview(conversationId);
    return;
  }

  const preview = buildLastMessagePreview(
    latest._id.toString(),
    latest.type,
    buildMessagePreview(latest.type, latest.content),
    { accountType: latest.senderAccountType, accountId: latest.senderAccountId },
    latest.createdAt,
    latest.status
  );

  await conversationRepository.updatePreview(conversationId, preview);
};

export const ensureConversationPreview = async (conversation: IConversation): Promise<IConversation> => {
  const preview = conversation.lastMessagePreview;
  if (!preview) return conversation;

  const message = await messageRepository.findById(preview.messageId);
  if (message && !message.deletedAt) {
    if (preview.status !== message.status) {
      await conversationRepository.updatePreviewStatus(
        conversation._id.toString(),
        preview.messageId,
        message.status
      );
      return (await conversationRepository.findById(conversation._id.toString())) ?? conversation;
    }
    return conversation;
  }

  await syncConversationPreview(conversation._id.toString());
  return (await conversationRepository.findById(conversation._id.toString())) ?? conversation;
};
