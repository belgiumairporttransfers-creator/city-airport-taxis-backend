import { Schema, model } from "mongoose";
import type { IVehiclePricing } from "@/modules/vehicle-pricing/types/vehicle-pricing.types";
import {
  VEHICLE_PRICING_STATUSES,
  VEHICLE_PRICING_TYPES,
} from "@/modules/vehicle-pricing/types/vehicle-pricing.types";

const vehiclePricingSchema = new Schema<IVehiclePricing>(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "VehicleCategory",
      required: [true, "Vehicle category is required"],
      index: true,
    },
    minDistance: {
      type: Number,
      required: [true, "Minimum distance is required"],
      min: 0,
    },
    maxDistance: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator(this: IVehiclePricing, value: number | null) {
          if (value === null || value === undefined) {
            return true;
          }

          const minDistance = this.minDistance;
          if (minDistance === undefined || minDistance === null) {
            return true;
          }

          return value > minDistance;
        },
        message: "Maximum distance must be greater than minimum distance",
      },
    },
    pricingType: {
      type: String,
      enum: VEHICLE_PRICING_TYPES,
      required: [true, "Pricing type is required"],
    },
    priceAmount: {
      type: Number,
      required: [true, "Price amount is required"],
      min: 0,
    },
    perUnitRate: {
      type: Number,
      min: 0,
    },
    increasePercentage: {
      type: Number,
      min: -100,
      max: 100,
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

vehiclePricingSchema.index({ categoryId: 1, status: 1, minDistance: 1 });
vehiclePricingSchema.index({ categoryId: 1, minDistance: 1, maxDistance: 1 });

export const VehiclePricing = model<IVehiclePricing>("VehiclePricing", vehiclePricingSchema);
