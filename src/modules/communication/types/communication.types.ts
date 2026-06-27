import type { Document, Types } from "mongoose";

export const CONVERSATION_TYPES = ["direct"] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

export const PARTICIPANT_ACCOUNT_TYPES = ["admin", "user"] as const;
export type ParticipantAccountType = (typeof PARTICIPANT_ACCOUNT_TYPES)[number];

export const PARTICIPANT_ROLES = ["admin", "driver", "customer", "staff", "dispatcher"] as const;
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];

export const PRESENCE_STATUSES = ["online", "offline", "away", "busy"] as const;
export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];

export const MESSAGE_TYPES = ["text", "image", "document", "voice", "location", "system"] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const MESSAGE_STATUSES = ["sent", "delivered", "seen"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const ATTACHMENT_KINDS = ["image", "document", "voice"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const CALL_TYPES = ["voice", "video"] as const;
export type CallType = (typeof CALL_TYPES)[number];

export const CALL_STATUSES = [
  "initiated",
  "ringing",
  "accepted",
  "rejected",
  "busy",
  "missed",
  "ended",
  "cancelled",
  "failed",
] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

export interface ConversationParticipant {
  accountType: ParticipantAccountType;
  accountId: string;
  role: ParticipantRole;
  displayName: string;
  avatarUrl?: string;
  unreadCount: number;
  lastReadMessageId?: string;
  lastReadAt?: Date;
  isMuted: boolean;
  joinedAt: Date;
}

export interface LastMessagePreview {
  messageId: string;
  type: MessageType;
  previewText: string;
  senderAccountType: ParticipantAccountType;
  senderAccountId: string;
  sentAt: Date;
  status?: MessageStatus;
}

export interface IConversation extends Document {
  _id: Types.ObjectId;
  type: ConversationType;
  participantKey: string;
  participants: ConversationParticipant[];
  lastMessagePreview?: LastMessagePreview;
  lastActivityAt: Date;
  isArchived: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderAccountType: ParticipantAccountType;
  senderAccountId: string;
  type: MessageType;
  content?: string;
  attachmentId?: Types.ObjectId;
  replyToMessageId?: Types.ObjectId;
  status: MessageStatus;
  deliveredAt?: Date;
  seenAt?: Date;
  clientMessageId?: string;
  deletedAt?: Date;
  deletedByAccountType?: ParticipantAccountType;
  deletedByAccountId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageAttachment extends Document {
  _id: Types.ObjectId;
  messageId?: Types.ObjectId;
  conversationId: Types.ObjectId;
  uploadedByAccountType: ParticipantAccountType;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface ICallSession extends Document {
  _id: Types.ObjectId;
  conversationId?: Types.ObjectId;
  callerAccountType: ParticipantAccountType;
  callerAccountId: string;
  receiverAccountType: ParticipantAccountType;
  receiverAccountId: string;
  callType: CallType;
  status: CallStatus;
  startedAt: Date;
  ringingAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  duration?: number;
  endReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationActor {
  accountType: ParticipantAccountType;
  accountId: string;
  role: ParticipantRole;
  displayName: string;
  avatarUrl?: string;
}

export interface GetConversationsQuery {
  page?: number;
  limit?: number;
  search?: string;
  isArchived?: boolean;
}

export interface GetMessagesQuery {
  limit?: number;
  before?: string;
  after?: string;
}

export interface SendMessageData {
  conversationId: string;
  type: MessageType;
  content?: string;
  attachmentId?: string;
  replyToMessageId?: string;
  clientMessageId?: string;
}

export interface CreateConversationData {
  participantAccountType: ParticipantAccountType;
  participantAccountId: string;
}

export interface SearchQuery {
  q: string;
  scope?: "conversations" | "messages" | "all";
  conversationId?: string;
  page?: number;
  limit?: number;
}

export interface InitiateCallData {
  receiverAccountType: ParticipantAccountType;
  receiverAccountId: string;
  callType: CallType;
  conversationId?: string;
}

export type CommunicationSocketEvent =
  | "message:new"
  | "message:delivered"
  | "message:read"
  | "message:deleted"
  | "message:typing"
  | "message:stop-typing"
  | "conversation:update"
  | "presence:update"
  | "user:online"
  | "user:offline"
  | "attachment:uploaded"
  | "call:ringing"
  | "call:accept"
  | "call:reject"
  | "call:busy"
  | "call:end"
  | "call:offer"
  | "call:answer"
  | "call:ice-candidate";

export interface CommunicationPubSubMessage {
  event: CommunicationSocketEvent;
  conversationId?: string;
  callId?: string;
  payload: unknown;
  recipientAccountType?: ParticipantAccountType;
  recipientAccountIds?: string[];
  excludeSocketId?: string;
}

export interface ConversationListItemResponse {
  id: string;
  type: ConversationType;
  participant: {
    accountType: ParticipantAccountType;
    accountId: string;
    role: ParticipantRole;
    displayName: string;
    avatarUrl?: string;
    presence: PresenceStatus;
    lastSeenAt?: string;
  };
  lastMessage?: {
    id: string;
    type: MessageType;
    previewText: string;
    senderAccountId: string;
    sentAt: string;
    status: MessageStatus;
  };
  unreadCount: number;
  isTyping: boolean;
  lastActivityAt: string;
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  type: MessageType;
  content?: string;
  attachment?: AttachmentResponse;
  replyTo?: {
    id: string;
    previewText: string;
    senderAccountId: string;
  };
  sender: {
    accountType: ParticipantAccountType;
    accountId: string;
    displayName: string;
    avatarUrl?: string;
  };
  status: MessageStatus;
  deliveredAt?: string;
  seenAt?: string;
  isDeleted: boolean;
  clientMessageId?: string;
  createdAt: string;
}

export interface AttachmentResponse {
  id: string;
  kind: AttachmentKind;
  url: string;
  publicId: string;
  mimeType: string;
  size: number;
  filename: string;
  duration?: number;
  waveform?: number[];
  thumbnailUrl?: string;
}

export interface CallSessionResponse {
  id: string;
  conversationId?: string;
  caller: { accountType: ParticipantAccountType; accountId: string };
  receiver: { accountType: ParticipantAccountType; accountId: string };
  callType: CallType;
  status: CallStatus;
  startedAt: string;
  ringingAt?: string;
  answeredAt?: string;
  endedAt?: string;
  duration?: number;
  endReason?: string;
}

export const COMMUNICATION_NOTIFICATION_TYPES = [
  "communication.message.received",
  "communication.call.missed",
  "communication.call.incoming",
] as const;
