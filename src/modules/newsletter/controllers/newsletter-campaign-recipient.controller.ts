import { Request, Response } from "express";
import newsletterCampaignRecipientService from "../services/newsletter-campaign-recipient.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";

const toPlainRecord = (item: unknown): Record<string, unknown> => {
  if (typeof (item as { toObject?: () => unknown }).toObject === "function") {
    return (item as { toObject: () => unknown }).toObject() as Record<string, unknown>;
  }

  return item as unknown as Record<string, unknown>;
};

class NewsletterCampaignRecipientController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await newsletterCampaignRecipientService.getRecipients(req.query as any);

    return sendSuccess(res, {
      items: result.items.map((item) => {
        const record = toPlainRecord(item);
        const campaign = record.campaignId as
          | { _id?: { toString(): string }; campaignName?: string; subject?: string; status?: string }
          | string
          | undefined;

        return {
          ...record,
          campaignId:
            campaign && typeof campaign === "object" && campaign._id
              ? campaign._id.toString()
              : String(record.campaignId),
          campaignName:
            campaign && typeof campaign === "object" ? campaign.campaignName : undefined,
          campaignSubject:
            campaign && typeof campaign === "object" ? campaign.subject : undefined,
          campaignStatus:
            campaign && typeof campaign === "object" ? campaign.status : undefined,
        };
      }),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  resendOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await newsletterCampaignRecipientService.resendToRecipient(req.params.id);

    return sendSuccess(res, result.recipient?.toObject(), {
      message: result.success
        ? "Email resent successfully"
        : "Email resend failed. Please try again.",
    });
  });

  resendFailed = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await newsletterCampaignRecipientService.resendAllFailed(req.body.campaignId);

    return sendSuccess(res, result, {
      message: `Resent ${result.resent} of ${result.total} failed emails`,
    });
  });
}

export default new NewsletterCampaignRecipientController();
