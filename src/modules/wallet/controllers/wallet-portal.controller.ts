import { Request, Response } from "express";
import walletService from "../services/wallet.service";
import {
  toDriverWalletSummaryResponse,
  toWalletTransactionResponse,
} from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import { DRIVER_ROLE } from "@/modules/auth/types/auth.types";
import type { GetWalletTransactionsQuery } from "../types/wallet.types";

class WalletPortalController {
  private assertDriver(req: Request) {
    if (!req.user || req.user.role !== DRIVER_ROLE) {
      throw new AppError("This endpoint is for driver accounts only", 403);
    }

    return req.user._id.toString();
  }

  getSummary = asyncHandler(async (req: Request, res: Response) => {
    const driverUserId = this.assertDriver(req);
    const summary = await walletService.getDriverWalletSummary(driverUserId);

    return sendSuccess(res, toDriverWalletSummaryResponse(summary));
  });

  getTransactions = asyncHandler(async (req: Request, res: Response) => {
    const driverUserId = this.assertDriver(req);
    const result = await walletService.getDriverTransactions(
      driverUserId,
      req.query as GetWalletTransactionsQuery
    );

    return sendSuccess(res, {
      items: result.items.map((item) => toWalletTransactionResponse(item)),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    });
  });
}

export default new WalletPortalController();
