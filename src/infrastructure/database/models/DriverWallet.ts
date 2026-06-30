import { Schema, model } from "mongoose";
import type { IDriverWallet } from "@/modules/wallet/types/wallet.types";

const driverWalletSchema = new Schema<IDriverWallet>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      unique: true,
      index: true,
    },
    driverUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    currency: {
      type: String,
      default: "EUR",
      trim: true,
    },
    availableBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalTrips: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const DriverWallet = model<IDriverWallet>("DriverWallet", driverWalletSchema);
