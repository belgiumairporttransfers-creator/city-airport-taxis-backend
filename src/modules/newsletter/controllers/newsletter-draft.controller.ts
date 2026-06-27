import { Request, Response } from "express";
import newsletterDraftService from "../services/newsletter-draft.service";
import type { GetNewsletterDraftsQuery } from "@/modules/newsletter/types/newsletter-draft.types";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";

class NewsletterDraftController {
  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const draft = await newsletterDraftService.createDraft(req.body, req.admin._id.toString());

    return sendSuccess(res, draft.toObject(), {
      message: "Newsletter draft saved successfully",
    });
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await newsletterDraftService.getDrafts(
      req.query as unknown as GetNewsletterDraftsQuery
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

  getOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const draft = await newsletterDraftService.getDraftById(req.params.id);
    if (!draft) {
      throw new AppError("Newsletter draft not found", 404);
    }

    return sendSuccess(res, draft.toObject());
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const draft = await newsletterDraftService.updateDraft(req.params.id, req.body);
    if (!draft) {
      throw new AppError("Newsletter draft not found", 404);
    }

    return sendSuccess(res, draft.toObject(), {
      message: "Newsletter draft updated successfully",
    });
  });

  deleteOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const deleted = await newsletterDraftService.deleteDraft(req.params.id);
    if (!deleted) {
      throw new AppError("Newsletter draft not found", 404);
    }

    return sendSuccess(res, deleted.toObject(), {
      message: "Draft deleted successfully",
    });
  });

  bulkDelete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await newsletterDraftService.bulkDeleteDrafts(req.body);
    if (result.deletedCount === 0) {
      throw new AppError("No newsletter drafts found to delete", 404);
    }

    return sendSuccess(res, result, {
      message:
        result.deletedCount === 1
          ? "Draft deleted successfully"
          : `${result.deletedCount} drafts deleted successfully`,
    });
  });
}

export default new NewsletterDraftController();
