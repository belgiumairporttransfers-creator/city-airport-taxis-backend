import { Schema, model } from "mongoose";
import type { IMessageAttachment } from "@/modules/communication/types/communication.types";
import {
  ATTACHMENT_KINDS,
  PARTICIPANT_ACCOUNT_TYPES,
} from "@/modules/communication/types/communication.types";

const messageAttachmentSchema = new Schema<IMessageAttachment>(
  {
    messageId: { type: Schema.Types.ObjectId, ref: "Message" },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    uploadedByAccountType: { type: String, enum: PARTICIPANT_ACCOUNT_TYPES, required: true },
    uploadedByAccountId: { type: String, required: true, index: true },
    kind: { type: String, enum: ATTACHMENT_KINDS, required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    filename: { type: String, required: true, trim: true },
    duration: { type: Number, min: 0, max: 600 },
    waveform: { type: [Number], validate: [(v: number[]) => v.length <= 100, "Max 100 waveform samples"] },
    thumbnailUrl: { type: String },
  },
  { timestamps: true }
);

messageAttachmentSchema.index({ messageId: 1 }, { sparse: true });
messageAttachmentSchema.index({ conversationId: 1, kind: 1, createdAt: -1 });

export const MessageAttachment = model<IMessageAttachment>("MessageAttachment", messageAttachmentSchema);
