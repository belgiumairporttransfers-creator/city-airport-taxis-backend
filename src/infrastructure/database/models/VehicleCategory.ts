import { Schema, model } from "mongoose";
import type { IVehicleCategory } from "@/modules/vehicle-categories/types/vehicle-category.types";
import { VEHICLE_CATEGORY_STATUSES } from "@/modules/vehicle-categories/types/vehicle-category.types";

const vehicleCategorySchema = new Schema<IVehicleCategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Category slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    passengerCapacity: {
      type: Number,
      min: 0,
      default: 0,
    },
    luggageCapacity: {
      type: Number,
      min: 0,
      default: 0,
    },
    handLuggageCapacity: {
      type: Number,
      min: 0,
      default: 0,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: VEHICLE_CATEGORY_STATUSES,
      default: "active",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
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

vehicleCategorySchema.index({ status: 1 });
vehicleCategorySchema.index(
  {
    name: "text",
    description: "text",
  },
  {
    name: "vehicle_category_text_search",
  }
);

export const VehicleCategory = model<IVehicleCategory>("VehicleCategory", vehicleCategorySchema);
