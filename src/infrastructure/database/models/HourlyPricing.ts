import { Schema, model } from "mongoose";
import type { IHourlyPricing } from "@/modules/vehicle-pricing/types/hourly-pricing.types";
import { HOURLY_SERVICE_TYPES } from "@/modules/vehicle-pricing/types/hourly-pricing.types";
import { VEHICLE_PRICING_STATUSES } from "@/modules/vehicle-pricing/types/vehicle-pricing.types";

const hourlyPricingSchema = new Schema<IHourlyPricing>(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "VehicleCategory",
      required: [true, "Vehicle category is required"],
      index: true,
    },
    serviceType: {
      type: String,
      enum: HOURLY_SERVICE_TYPES,
      default: "hourly",
      required: [true, "Service type is required"],
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [1, "Duration must be at least 1"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be at least 0"],
    },
    includedDistance: {
      type: Number,
      required: [true, "Included distance is required"],
      min: [0, "Included distance must be at least 0"],
    },
    extraDistancePrice: {
      type: Number,
      required: [true, "Extra distance price is required"],
      min: [0, "Extra distance price must be at least 0"],
    },
    status: {
      type: String,
      enum: VEHICLE_PRICING_STATUSES,
      default: "active",
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
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

hourlyPricingSchema.index({ categoryId: 1, duration: 1 }, { unique: true });
hourlyPricingSchema.index({ categoryId: 1, status: 1, duration: 1 });

export const HourlyPricing = model<IHourlyPricing>("HourlyPricing", hourlyPricingSchema);
