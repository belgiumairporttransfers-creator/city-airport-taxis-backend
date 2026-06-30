import type { Document, Types } from "mongoose";

export const WALLET_TRANSACTION_TYPES = [
  "trip_earning",
  "withdrawal",
  "adjustment",
] as const;

export type WalletTransactionType = (typeof WALLET_TRANSACTION_TYPES)[number];

export const WALLET_TRANSACTION_DIRECTIONS = ["credit", "debit"] as const;
export type WalletTransactionDirection = (typeof WALLET_TRANSACTION_DIRECTIONS)[number];

export const WALLET_TRANSACTION_STATUSES = ["completed", "pending", "failed"] as const;
export type WalletTransactionStatus = (typeof WALLET_TRANSACTION_STATUSES)[number];

export interface IDriverWallet extends Document {
  driverId: Types.ObjectId;
  driverUserId: Types.ObjectId;
  currency: string;
  availableBalance: number;
  totalEarned: number;
  totalTrips: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWalletTransaction extends Document {
  walletId: Types.ObjectId;
  driverId: Types.ObjectId;
  driverUserId: Types.ObjectId;
  bookingId?: Types.ObjectId;
  bookingNumber?: string;
  type: WalletTransactionType;
  direction: WalletTransactionDirection;
  status: WalletTransactionStatus;
  grossAmount: number;
  commissionPercent: number;
  amount: number;
  currency: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetWalletTransactionsQuery {
  page?: number;
  limit?: number;
  type?: WalletTransactionType;
  sort?: string;
}
