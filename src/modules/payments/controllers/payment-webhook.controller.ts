import { Request, Response } from "express";
import paymentService from "../services/payment.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import logger from "@/shared/utils/logger";
import { AppError } from "@/shared/errors/AppError";

class PaymentWebhookController {
  mollieWebhook = asyncHandler(async (req: Request, res: Response) => {
    const providerPaymentId =
      typeof req.body?.id === "string" ? req.body.id.trim() : "";

    if (!providerPaymentId) {
      logger.warn("Mollie webhook received without payment id");
      return sendSuccess(res, { received: true });
    }

    try {
      await paymentService.handleMollieWebhook(providerPaymentId);
    } catch (error) {
      if (error instanceof AppError && error.statusCode >= 500) {
        throw error;
      }

      logger.error("Mollie webhook processing failed", {
        providerPaymentId,
        error,
      });
    }

    return sendSuccess(res, { received: true });
  });
}

export default new PaymentWebhookController();
