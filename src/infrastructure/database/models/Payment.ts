import { Schema, model } from "mongoose";
import { PAYMENT_STATUSES, type IPayment } from "@/modules/payments/types/payment.types";

const paymentSchema = new Schema<IPayment>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    status: { type: String, enum: PAYMENT_STATUSES, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "EUR", uppercase: true, trim: true },
    transactionId: { type: String, trim: true, index: true },
    providerPaymentId: { type: String, trim: true, index: true },
    providerResponse: { type: Schema.Types.Mixed },
    cardLastDigits: { type: String, trim: true, maxlength: 4 },
    paidAt: { type: Date },
    refundedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

paymentSchema.pre("save", function (next) {
  if (!this.transactionId) {
    const randomId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    this.transactionId = randomId;
  }

  next();
});

paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ createdAt: -1 });

export const Payment = model<IPayment>("Payment", paymentSchema);
