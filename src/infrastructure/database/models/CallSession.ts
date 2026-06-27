import { Schema, model } from "mongoose";
import type { ICallSession } from "@/modules/communication/types/communication.types";
import {
  CALL_STATUSES,
  CALL_TYPES,
  PARTICIPANT_ACCOUNT_TYPES,
} from "@/modules/communication/types/communication.types";

const callSessionSchema = new Schema<ICallSession>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", index: true },
    callerAccountType: { type: String, enum: PARTICIPANT_ACCOUNT_TYPES, required: true },
    callerAccountId: { type: String, required: true, index: true },
    receiverAccountType: { type: String, enum: PARTICIPANT_ACCOUNT_TYPES, required: true },
    receiverAccountId: { type: String, required: true, index: true },
    callType: { type: String, enum: CALL_TYPES, required: true },
    status: { type: String, enum: CALL_STATUSES, default: "initiated", index: true },
    startedAt: { type: Date, default: Date.now },
    ringingAt: { type: Date },
    answeredAt: { type: Date },
    endedAt: { type: Date },
    duration: { type: Number, min: 0 },
    endReason: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

callSessionSchema.index({ callerAccountId: 1, createdAt: -1 });
callSessionSchema.index({ receiverAccountId: 1, createdAt: -1 });
callSessionSchema.index({ conversationId: 1, createdAt: -1 });
callSessionSchema.index({ status: 1, startedAt: -1 });

export const CallSession = model<ICallSession>("CallSession", callSessionSchema);
