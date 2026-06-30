import { Schema, model } from "mongoose";
import type { IDriver } from "@/modules/drivers/types/driver.types";
import {
  DRIVER_STATUSES,
  DRIVER_ACTIVE_STATUSES,
  DRIVER_DOCUMENT_FIELDS,
  DRIVER_SHIFT_TYPES,
} from "@/modules/drivers/types/driver.types";

const documentSchema = new Schema(
  Object.fromEntries(DRIVER_DOCUMENT_FIELDS.map((field) => [field, { type: String, trim: true }])),
  { _id: false }
);

const driverReviewSchema = new Schema(
  {
    passengerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const driverSchema = new Schema<IDriver>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: DRIVER_STATUSES,
      default: "pending",
    },
    operatingCountry: {
      type: String,
      required: true,
      trim: true,
    },
    operatingCity: {
      type: String,
      required: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    homeAddress: {
      type: String,
      required: true,
      trim: true,
    },
    carType: {
      type: String,
      required: true,
      trim: true,
    },
    carColor: {
      type: String,
      required: true,
      trim: true,
    },
    licensePlate: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    carYearModel: {
      type: String,
      required: true,
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      required: true,
      min: 0,
    },
    shiftType: {
      type: String,
      enum: DRIVER_SHIFT_TYPES,
      required: true,
    },
    availableFrom: {
      type: String,
      required: true,
      trim: true,
    },
    availableTo: {
      type: String,
      required: true,
      trim: true,
    },
    profilePhoto: {
      type: String,
      trim: true,
      default: "",
    },
    about: {
      type: String,
      trim: true,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    reviews: {
      type: [driverReviewSchema],
      default: [],
    },
    documents: {
      type: documentSchema,
      required: true,
    },
    reviewNotes: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    reviewedAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

driverSchema.index({ status: 1 });
driverSchema.index({ email: 1 });
driverSchema.index({ licensePlate: 1 });
driverSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: DRIVER_ACTIVE_STATUSES },
    },
    name: "driver_active_email_unique",
  }
);
driverSchema.index(
  {
    firstName: "text",
    lastName: "text",
    email: "text",
    applicationNumber: "text",
    licensePlate: "text",
  },
  { name: "driver_text_search" }
);

export const Driver = model<IDriver>("Driver", driverSchema);
