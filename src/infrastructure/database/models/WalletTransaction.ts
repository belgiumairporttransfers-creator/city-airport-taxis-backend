import { Schema, model } from "mongoose";
import {
  WALLET_TRANSACTION_DIRECTIONS,
  WALLET_TRANSACTION_STATUSES,
  WALLET_TRANSACTION_TYPES,
  type IWalletTransaction,
} from "@/modules/wallet/types/wallet.types";

const walletTransactionSchema = new Schema<IWalletTransaction>(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: "DriverWallet",
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },
    driverUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      index: true,
    },
    bookingNumber: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: WALLET_TRANSACTION_TYPES,
      required: true,
    },
    direction: {
      type: String,
      enum: WALLET_TRANSACTION_DIRECTIONS,
      required: true,
    },
    status: {
      type: String,
      enum: WALLET_TRANSACTION_STATUSES,
      default: "completed",
    },
    grossAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "EUR",
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    requestNote: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    processedAt: {
      type: Date,
    },
    processedBy: {
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

walletTransactionSchema.index(
  { driverId: 1, bookingId: 1, type: 1 },
  {
    unique: true,
    name: "wallet_tx_driver_booking_type_unique",
    partialFilterExpression: { bookingId: { $type: "objectId" } },
  }
);

export const WalletTransaction = model<IWalletTransaction>(
  "WalletTransaction",
  walletTransactionSchema
);
