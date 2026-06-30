import { Schema, model } from "mongoose";
import { ASSIGNMENT_STATUSES, type IAssignment } from "@/modules/assignments/types/assignment.types";

const assignmentSchema = new Schema<IAssignment>(
  {
    assignmentNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    bookingNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },
    driverUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    status: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
      required: true,
      index: true,
    },
    assignedAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    expiredAt: { type: Date },
    completedAt: { type: Date },
    rejectReason: { type: String, trim: true },
    adminNotes: { type: String, trim: true },
    expiresAt: { type: Date, index: true },
    chatConversationId: { type: Schema.Types.ObjectId, ref: "Conversation", default: null },
    callSessionId: { type: Schema.Types.ObjectId, ref: "CallSession", default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

assignmentSchema.index({ assignmentNumber: 1 }, { unique: true });
assignmentSchema.index({ status: 1, createdAt: -1 });
assignmentSchema.index({ driverId: 1, status: 1 });
assignmentSchema.index({ bookingId: 1, createdAt: -1 });
assignmentSchema.index({ expiresAt: 1, status: 1 });

export const Assignment = model<IAssignment>("Assignment", assignmentSchema);
