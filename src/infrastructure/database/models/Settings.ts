import { Schema, model } from "mongoose";
import type { ISettings } from "@/modules/settings/types/settings.types";
import { PAYMENT_MODES } from "@/modules/settings/types/settings.types";

const settingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
      immutable: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    comingSoonMode: {
      type: Boolean,
      default: false,
    },
    paymentMode: {
      type: String,
      enum: PAYMENT_MODES,
      default: "test",
    },
    minBookingMinutes: {
      type: Number,
      default: 120,
      min: 0,
    },
    stopFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    cardProcessingFee: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    airportPickup: {
      type: Number,
      default: 0,
      min: 0,
    },
    trainPickup: {
      type: Number,
      default: 0,
      min: 0,
    },
    meetAndGreet: {
      type: Number,
      default: 0,
      min: 0,
    },
    returnMeetAndGreet: {
      type: Number,
      default: 0,
      min: 0,
    },
    waitingTimePricePerMinute: {
      type: Number,
      default: 0,
      min: 0,
    },
    waitingTimePricePerHour: {
      type: Number,
      default: 0,
      min: 0,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Settings = model<ISettings>("Settings", settingsSchema);
