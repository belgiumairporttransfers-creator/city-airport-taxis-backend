import { AppError } from "@/shared/errors/AppError";
import paymentRepository from "@/modules/payments/repositories/payment.repository";
import type { GetPaymentsQuery } from "@/modules/payments/types/payment.types";

class PaymentAdminService {
  async getPayments(query: GetPaymentsQuery) {
    const result = await paymentRepository.findWithPagination(query);

    return {
      items: result.data,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    };
  }

  async deletePayment(paymentId: string) {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    const deleted = await paymentRepository.deleteById(paymentId);
    if (!deleted) {
      throw new AppError("Failed to delete payment", 500);
    }

    return deleted;
  }

  async bulkDeletePayments(paymentIds: string[]) {
    const uniqueIds = [...new Set(paymentIds)];
    const result = await paymentRepository.deleteManyByIds(uniqueIds);

    if ((result.deletedCount ?? 0) === 0) {
      throw new AppError("No payments found to delete", 404);
    }

    return { deletedCount: result.deletedCount ?? 0 };
  }
}

export default new PaymentAdminService();
