import type {
  ConversationParticipant,
  IConversation,
  LastMessagePreview,
} from "@/modules/communication/types/communication.types";

const toIdString = (value: unknown): string => {
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
};

const toIsoString = (value?: Date | string | null): string | undefined => {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : String(value);
};

export const toAttachmentResponse = (attachment: {
  _id: unknown;
  kind: string;
  url: string;
  publicId: string;
  mimeType: string;
  size: number;
  filename: string;
  duration?: number;
  waveform?: number[];
  thumbnailUrl?: string;
}) => ({
  id: toIdString(attachment._id),
  kind: attachment.kind as "image" | "document" | "voice",
  url: attachment.url,
  publicId: attachment.publicId,
  mimeType: attachment.mimeType,
  size: attachment.size,
  filename: attachment.filename,
  duration: attachment.duration,
  waveform: attachment.waveform,
  thumbnailUrl: attachment.thumbnailUrl,
});

export const toMessageResponse = (
  message: {
    _id: unknown;
    conversationId: unknown;
    type: string;
    content?: string;
    senderAccountType: string;
    senderAccountId: string;
    status: string;
    deliveredAt?: Date;
    seenAt?: Date;
    clientMessageId?: string;
    deletedAt?: Date;
    createdAt: Date;
  },
  options?: {
    sender?: { displayName: string; avatarUrl?: string };
    attachment?: ReturnType<typeof toAttachmentResponse>;
    replyTo?: { id: string; previewText: string; senderAccountId: string };
  }
) => ({
  id: toIdString(message._id),
  conversationId: toIdString(message.conversationId),
  type: message.type,
  content: message.deletedAt ? undefined : message.content,
  attachment: message.deletedAt ? undefined : options?.attachment,
  replyTo: message.deletedAt ? undefined : options?.replyTo,
  sender: {
    accountType: message.senderAccountType,
    accountId: message.senderAccountId,
    displayName: options?.sender?.displayName ?? "",
    avatarUrl: options?.sender?.avatarUrl,
  },
  status: message.status,
  deliveredAt: toIsoString(message.deliveredAt),
  seenAt: toIsoString(message.seenAt),
  isDeleted: Boolean(message.deletedAt),
  clientMessageId: message.clientMessageId,
  createdAt: toIsoString(message.createdAt)!,
});

export const toConversationListItem = (
  conversation: IConversation,
  actorAccountId: string,
  options?: {
    presence?: string;
    lastSeenAt?: string;
    isTyping?: boolean;
  }
) => {
  const other = conversation.participants.find((p) => p.accountId !== actorAccountId)!;
  const self = conversation.participants.find((p) => p.accountId === actorAccountId)!;
  const preview = conversation.lastMessagePreview;

  return {
    id: toIdString(conversation._id),
    type: conversation.type,
    participant: {
      accountType: other.accountType,
      accountId: other.accountId,
      role: other.role,
      displayName: other.displayName,
      avatarUrl: other.avatarUrl,
      presence: (options?.presence ?? "offline") as "online" | "offline" | "away" | "busy",
      lastSeenAt: options?.lastSeenAt,
    },
    lastMessage: preview
      ? {
          id: preview.messageId,
          type: preview.type,
          previewText: preview.previewText,
          senderAccountId: preview.senderAccountId,
          sentAt: toIsoString(preview.sentAt)!,
          status: preview.status ?? "sent",
        }
      : undefined,
    unreadCount: self.unreadCount,
    isTyping: options?.isTyping ?? false,
    lastActivityAt: toIsoString(conversation.lastActivityAt)!,
  };
};

export const toCallSessionResponse = (call: {
  _id: unknown;
  conversationId?: unknown;
  callerAccountType: string;
  callerAccountId: string;
  receiverAccountType: string;
  receiverAccountId: string;
  callType: string;
  status: string;
  startedAt: Date;
  ringingAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  duration?: number;
  endReason?: string;
}) => ({
  id: toIdString(call._id),
  conversationId: call.conversationId ? toIdString(call.conversationId) : undefined,
  caller: { accountType: call.callerAccountType, accountId: call.callerAccountId },
  receiver: { accountType: call.receiverAccountType, accountId: call.receiverAccountId },
  callType: call.callType,
  status: call.status,
  startedAt: toIsoString(call.startedAt)!,
  ringingAt: toIsoString(call.ringingAt),
  answeredAt: toIsoString(call.answeredAt),
  endedAt: toIsoString(call.endedAt),
  duration: call.duration,
  endReason: call.endReason,
});

export type ConversationListItemResponse = ReturnType<typeof toConversationListItem>;
export type MessageResponse = ReturnType<typeof toMessageResponse>;
export type AttachmentResponse = ReturnType<typeof toAttachmentResponse>;
export type CallSessionResponse = ReturnType<typeof toCallSessionResponse>;

export const mapParticipantSnapshot = (participant: ConversationParticipant) => ({
  accountType: participant.accountType,
  accountId: participant.accountId,
  role: participant.role,
  displayName: participant.displayName,
  avatarUrl: participant.avatarUrl,
});

export const buildLastMessagePreview = (
  messageId: string,
  type: LastMessagePreview["type"],
  previewText: string,
  sender: { accountType: LastMessagePreview["senderAccountType"]; accountId: string },
  sentAt: Date,
  status: LastMessagePreview["status"] = "sent"
): LastMessagePreview => ({
  messageId,
  type,
  previewText,
  senderAccountType: sender.accountType,
  senderAccountId: sender.accountId,
  sentAt,
  status,
});
