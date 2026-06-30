import { Request, Response } from "express";
import paymentAdminService from "../services/payment-admin.service";
import { toAdminPaymentListItemResponse } from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import type { GetPaymentsQuery } from "../types/payment.types";

class PaymentAdminController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await paymentAdminService.getPayments(req.query as GetPaymentsQuery);

    return sendSuccess(res, {
      items: result.items.map((item) => toAdminPaymentListItemResponse(item)),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  deleteOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const deleted = await paymentAdminService.deletePayment(req.params.id);

    return sendSuccess(res, { id: deleted._id.toString() }, {
      message: "Payment deleted successfully",
    });
  });

  bulkDelete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await paymentAdminService.bulkDeletePayments(req.body.ids as string[]);

    return sendSuccess(res, result, {
      message:
        result.deletedCount === 1
          ? "Payment deleted successfully"
          : `${result.deletedCount} payments deleted successfully`,
    });
  });
}

export default new PaymentAdminController();
