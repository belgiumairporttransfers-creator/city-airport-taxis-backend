import { Schema, model } from "mongoose";
import type { IMessage } from "@/modules/communication/types/communication.types";
import {
  MESSAGE_STATUSES,
  MESSAGE_TYPES,
  PARTICIPANT_ACCOUNT_TYPES,
} from "@/modules/communication/types/communication.types";

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderAccountType: { type: String, enum: PARTICIPANT_ACCOUNT_TYPES, required: true },
    senderAccountId: { type: String, required: true, index: true },
    type: { type: String, enum: MESSAGE_TYPES, required: true },
    content: { type: String, maxlength: 10000, trim: true },
    attachmentId: { type: Schema.Types.ObjectId, ref: "MessageAttachment" },
    replyToMessageId: { type: Schema.Types.ObjectId, ref: "Message" },
    status: { type: String, enum: MESSAGE_STATUSES, default: "sent" },
    deliveredAt: { type: Date },
    seenAt: { type: Date },
    clientMessageId: { type: String, trim: true },
    deletedAt: { type: Date },
    deletedByAccountType: { type: String, enum: PARTICIPANT_ACCOUNT_TYPES },
    deletedByAccountId: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, _id: -1 });
messageSchema.index({ conversationId: 1, deletedAt: 1, createdAt: -1 });
messageSchema.index({ content: "text" });
messageSchema.index(
  { clientMessageId: 1 },
  { sparse: true, unique: true, name: "message_client_message_id_unique" }
);

export const Message = model<IMessage>("Message", messageSchema);
