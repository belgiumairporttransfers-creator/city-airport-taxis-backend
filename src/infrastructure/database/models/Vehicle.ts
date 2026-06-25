import { Schema, model } from "mongoose";
import type { IVehicle } from "@/modules/vehicles/types/vehicle.types";
import { VEHICLE_STATUSES } from "@/modules/vehicles/types/vehicle.types";

const vehicleSchema = new Schema<IVehicle>(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "VehicleCategory",
      required: [true, "Vehicle category is required"],
    },
    registrationNumber: {
      type: String,
      required: [true, "Registration number is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    make: {
      type: String,
      required: [true, "Make is required"],
      trim: true,
    },
    model: {
      type: String,
      required: [true, "Model is required"],
      trim: true,
    },
    year: {
      type: Number,
      min: 1900,
      max: 2100,
    },
    color: {
      type: String,
      trim: true,
    },
    passengerCapacity: {
      type: Number,
      required: [true, "Passenger capacity is required"],
      min: 1,
    },
    luggageCapacity: {
      type: Number,
      required: [true, "Luggage capacity is required"],
      min: 0,
    },
    status: {
      type: String,
      enum: VEHICLE_STATUSES,
      default: "active",
    },
    features: {
      type: [String],
      default: [],
    },
    image: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
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

vehicleSchema.index({ categoryId: 1 });
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ make: 1 });
vehicleSchema.index({ model: 1 });
vehicleSchema.index(
  {
    registrationNumber: "text",
    make: "text",
    model: "text",
  },
  {
    name: "vehicle_text_search",
  }
);

export const Vehicle = model<IVehicle>("Vehicle", vehicleSchema);
