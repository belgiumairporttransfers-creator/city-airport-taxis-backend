import { Request, Response } from "express";
import newsletterSendService from "../services/newsletter-send.service";
import newsletterCampaignService from "../services/newsletter-campaign.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";

const toCampaignResponse = (campaign: { toObject?: () => unknown } | Record<string, unknown>) =>
  typeof campaign.toObject === "function"
    ? (campaign.toObject() as Record<string, unknown>)
    : campaign;

class NewsletterCampaignController {
  send = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const { campaign, queued } = await newsletterSendService.sendNewsletter(
      req.body,
      req.admin._id.toString()
    );

    const message =
      req.body.sendMode === "scheduled"
        ? "Newsletter scheduled successfully"
        : queued
          ? "Newsletter queued successfully. Emails are being sent in the background."
          : campaign.status === "sending"
            ? "Newsletter is being sent"
            : campaign.status === "sent"
              ? "Newsletter sent successfully"
              : "Newsletter send completed with some failures";

    return sendSuccess(res, { ...toCampaignResponse(campaign), queued }, { message });
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await newsletterCampaignService.getCampaigns(req.query as any);

    return sendSuccess(res, {
      items: result.items.map((item) =>
        typeof (item as { toObject?: () => unknown }).toObject === "function"
          ? (item as { toObject: () => unknown }).toObject()
          : item
      ),
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

    const campaign = await newsletterCampaignService.getCampaignById(req.params.id);
    if (!campaign) {
      throw new AppError("Newsletter campaign not found", 404);
    }

    return sendSuccess(res, campaign.toObject());
  });

  resend = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const { campaign, queued } = await newsletterSendService.resendCampaign(req.params.id);

    const message = queued
      ? "Newsletter resend queued successfully. Track live progress in Sent Campaigns."
      : campaign.status === "sending"
        ? "Newsletter resend started"
        : campaign.status === "sent"
          ? "Newsletter resent successfully"
          : "Newsletter resend completed with failures";

    return sendSuccess(res, { ...toCampaignResponse(campaign), queued }, { message });
  });

  deleteOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const deleted = await newsletterCampaignService.deleteCampaign(req.params.id);

    return sendSuccess(res, typeof deleted.toObject === "function" ? deleted.toObject() : deleted, {
      message: "Campaign deleted successfully",
    });
  });
}

export default new NewsletterCampaignController();
