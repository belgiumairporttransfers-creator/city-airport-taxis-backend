import type { Document, Types } from "mongoose";

export const PAYMENT_MODES = ["test", "live"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface ISettings extends Document {
  key: string;
  maintenanceMode: boolean;
  comingSoonMode: boolean;
  paymentMode: PaymentMode;
  minBookingMinutes: number;
  stopFee: number;
  cardProcessingFee: number;
  airportPickup: number;
  trainPickup: number;
  meetAndGreet: number;
  returnMeetAndGreet: number;
  waitingTimePricePerMinute: number;
  waitingTimePricePerHour: number;
  driverCommissionPercent: number;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
