import { Schema, model } from "mongoose";
import type { IActivity } from "@/modules/auth/types/activity.types";

const activitySchema = new Schema<IActivity>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    userType: {
      type: String,
      enum: ["admin", "user"],
      required: true,
    },
    type: {
      type: String,
      enum: [
        "login",
        "logout",
        "password_change",
        "password_reset",
        "password_reset_request",
        "update_profile",
        "logout_all",
        "email_verified",
        "session_revoked",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    device: {
      type: String,
    },
    browser: {
      type: String,
    },
    os: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

activitySchema.index({ user: 1, userType: 1, timestamp: -1 });
activitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const Activity = model<IActivity>("Activity", activitySchema);
