import { Request, Response } from "express";
import walletService from "../services/wallet.service";
import {
  toAdminPayoutResponse,
  toDriverWalletSummaryResponse,
  toWalletTransactionResponse,
} from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import type { GetWalletTransactionsQuery } from "../types/wallet.types";

class WalletAdminController {
  getSummary = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const summary = await walletService.getAdminDriverWalletSummary(req.params.id);

    return sendSuccess(res, toDriverWalletSummaryResponse(summary));
  });

  getAllPayouts = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await walletService.getAllAdminPayouts(
      req.query as GetWalletTransactionsQuery
    );

    return sendSuccess(res, {
      items: result.items.map((item) => toAdminPayoutResponse(item)),
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

  getTransactions = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await walletService.getAdminDriverTransactions(
      req.params.id,
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

  getPayouts = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await walletService.getAdminDriverPayouts(
      req.params.id,
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

  getEarningsReport = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const driverId =
      typeof req.params.id === "string" && req.params.id.length === 24
        ? req.params.id
        : typeof req.query.driverId === "string"
          ? req.query.driverId
          : undefined;

    const report = await walletService.getDriverEarningsReport(driverId);

    return sendSuccess(res, report);
  });

  approvePayout = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const transaction = await walletService.approvePayout(
      req.params.id,
      req.params.transactionId,
      req.admin._id.toString()
    );

    return sendSuccess(res, toWalletTransactionResponse(transaction), {
      message: "Payout approved",
    });
  });

  rejectPayout = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const transaction = await walletService.rejectPayout(
      req.params.id,
      req.params.transactionId,
      req.admin._id.toString(),
      typeof req.body?.adminNotes === "string" ? req.body.adminNotes : undefined
    );

    return sendSuccess(res, toWalletTransactionResponse(transaction), {
      message: "Payout rejected",
    });
  });
}

export default new WalletAdminController();
