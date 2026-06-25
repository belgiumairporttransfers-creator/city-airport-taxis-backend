import { Schema, model } from "mongoose";
import type { ICustomer } from "@/modules/customers/types/customer.types";
import {
  CUSTOMER_STATUSES,
  CUSTOMER_TIERS,
  CUSTOMER_TYPES,
} from "@/modules/customers/types/customer.types";

const billingAddressSchema = new Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    postcode: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false }
);

const customerSchema = new Schema<ICustomer>(
  {
    customerType: {
      type: String,
      enum: CUSTOMER_TYPES,
      required: [true, "Customer type is required"],
    },
    tier: {
      type: String,
      enum: CUSTOMER_TIERS,
      default: "standard",
    },
    status: {
      type: String,
      enum: CUSTOMER_STATUSES,
      default: "active",
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    billingAddress: {
      type: billingAddressSchema,
      default: undefined,
    },
    vatNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    marketingOptIn: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    totalBookings: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpend: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastBookingAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

customerSchema.index({ phone: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ customerType: 1 });
customerSchema.index({ tier: 1 });
customerSchema.index({ userId: 1 }, { sparse: true });
customerSchema.index(
  {
    firstName: "text",
    lastName: "text",
    companyName: "text",
    email: "text",
    phone: "text",
  },
  {
    name: "customer_text_search",
  }
);

export const Customer = model<ICustomer>("Customer", customerSchema);
