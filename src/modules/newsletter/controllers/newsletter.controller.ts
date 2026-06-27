import { Request, Response } from "express";
import newsletterService from "../services/newsletter.service";
import type { GetNewslettersQuery } from "@/modules/newsletter/types/newsletter.types";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";

class NewsletterController {
  subscribe = asyncHandler(async (req: Request, res: Response) => {
    const subscriber = await newsletterService.subscribe(req.body);

    return sendSuccess(res, subscriber.toObject(), {
      message: "You have been subscribed successfully",
    });
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await newsletterService.getNewsletters(
      req.query as unknown as GetNewslettersQuery
    );

    return sendSuccess(res, {
      items: result.items.map((item) => item.toObject()),
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

    const deleted = await newsletterService.deleteNewsletter(req.params.id);
    if (!deleted) {
      throw new AppError("Newsletter subscriber not found", 404);
    }

    return sendSuccess(res, deleted.toObject(), {
      message: "Subscriber removed successfully",
    });
  });

  bulkDelete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await newsletterService.bulkDeleteNewsletters(req.body);
    if (result.deletedCount === 0) {
      throw new AppError("No newsletter subscribers found to delete", 404);
    }

    return sendSuccess(res, result, {
      message:
        result.deletedCount === 1
          ? "Subscriber removed successfully"
          : `${result.deletedCount} subscribers removed successfully`,
    });
  });
}

export default new NewsletterController();
