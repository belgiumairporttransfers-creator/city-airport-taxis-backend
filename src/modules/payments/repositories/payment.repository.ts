import type { UpdateQuery } from "mongoose";
import { Payment } from "@/infrastructure/database/models/Payment";
import APIFeature from "@/shared/utils/APIFeature";
import type {
  CreatePaymentData,
  GetPaymentsQuery,
  IPayment,
} from "@/modules/payments/types/payment.types";

class PaymentRepository {
  create(data: CreatePaymentData) {
    return Payment.create(data);
  }

  findById(id: string) {
    return Payment.findById(id);
  }

  findByProviderPaymentId(providerPaymentId: string) {
    return Payment.findOne({ providerPaymentId });
  }

  findByBookingId(bookingId: string) {
    return Payment.findOne({ bookingId }).sort({ createdAt: -1 });
  }

  updateById(id: string, data: UpdateQuery<IPayment>) {
    return Payment.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  updateByIdIfNotPaid(id: string, data: UpdateQuery<IPayment>) {
    return Payment.findOneAndUpdate({ _id: id, status: { $ne: "paid" } }, data, {
      new: true,
      runValidators: true,
    });
  }

  findWithPagination(query: GetPaymentsQuery) {
    return new APIFeature(Payment, query, {
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "-createdAt",
        allowedFields: ["createdAt", "updatedAt", "amount", "status", "transactionId"],
      },
      search: {
        searchFields: ["transactionId", "providerPaymentId"],
      },
      filterFields: ["status"],
      excludeFields: ["__v"],
      lean: true,
      populate: { path: "bookingId", select: "customer bookingNumber" },
    }).execute();
  }

  deleteById(id: string) {
    return Payment.findByIdAndDelete(id);
  }

  deleteManyByIds(ids: string[]) {
    return Payment.deleteMany({ _id: { $in: ids } });
  }

  deleteByBookingIds(bookingIds: string[]) {
    return Payment.deleteMany({ bookingId: { $in: bookingIds } });
  }
}

export default new PaymentRepository();
