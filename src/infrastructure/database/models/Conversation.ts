import { Schema, model } from "mongoose";
import type { IConversation } from "@/modules/communication/types/communication.types";
import {
  CONVERSATION_TYPES,
  MESSAGE_STATUSES,
  MESSAGE_TYPES,
  PARTICIPANT_ACCOUNT_TYPES,
  PARTICIPANT_ROLES,
} from "@/modules/communication/types/communication.types";

const conversationParticipantSchema = new Schema(
  {
    accountType: { type: String, enum: PARTICIPANT_ACCOUNT_TYPES, required: true },
    accountId: { type: String, required: true },
    role: { type: String, enum: PARTICIPANT_ROLES, required: true },
    displayName: { type: String, required: true, trim: true },
    avatarUrl: { type: String, trim: true },
    unreadCount: { type: Number, default: 0, min: 0 },
    lastReadMessageId: { type: String },
    lastReadAt: { type: Date },
    isMuted: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const lastMessagePreviewSchema = new Schema(
  {
    messageId: { type: String, required: true },
    type: { type: String, enum: MESSAGE_TYPES, required: true },
    previewText: { type: String, required: true, maxlength: 500 },
    senderAccountType: { type: String, enum: PARTICIPANT_ACCOUNT_TYPES, required: true },
    senderAccountId: { type: String, required: true },
    sentAt: { type: Date, required: true },
    status: { type: String, enum: MESSAGE_STATUSES, default: "sent" },
  },
  { _id: false }
);

const conversationSchema = new Schema<IConversation>(
  {
    type: { type: String, enum: CONVERSATION_TYPES, default: "direct", required: true },
    participantKey: { type: String, required: true, unique: true, index: true },
    participants: { type: [conversationParticipantSchema], required: true },
    lastMessagePreview: { type: lastMessagePreviewSchema },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    isArchived: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

conversationSchema.index({ "participants.accountId": 1, lastActivityAt: -1 });
conversationSchema.index({
  "participants.accountType": 1,
  "participants.accountId": 1,
  lastActivityAt: -1,
});
conversationSchema.index({ "participants.displayName": "text" });

export const Conversation = model<IConversation>("Conversation", conversationSchema);
