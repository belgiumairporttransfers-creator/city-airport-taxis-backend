import { Schema, model } from "mongoose";
import type { ISession } from "@/modules/auth/types/session.types";

const sessionSchema = new Schema<ISession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userType: {
      type: String,
      enum: ["admin", "user"],
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    device: String,
    browser: String,
    os: String,
    isValid: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ user: 1, userType: 1 });
sessionSchema.index({ refreshToken: 1, userType: 1, isValid: 1, user: 1 });

export const Session = model<ISession>("Session", sessionSchema);
