import { Types } from "mongoose";
import { NewsletterCampaignRecipient } from "@/infrastructure/database/models/NewsletterCampaignRecipient";
import type {
  GetNewsletterCampaignRecipientsQuery,
  NewsletterCampaignRecipientStatus,
} from "@/modules/newsletter/types/newsletter-campaign-recipient.types";
import APIFeature from "@/shared/utils/APIFeature";

class NewsletterCampaignRecipientRepository {
  async resetForCampaign(campaignId: string, emails: string[]) {
    await NewsletterCampaignRecipient.deleteMany({
      campaignId: new Types.ObjectId(campaignId),
    });

    if (emails.length === 0) return [];

    return NewsletterCampaignRecipient.insertMany(
      emails.map((email) => ({
        campaignId: new Types.ObjectId(campaignId),
        email,
        status: "pending" as const,
        attemptCount: 0,
      })),
      { ordered: false }
    );
  }

  findById(id: string) {
    return NewsletterCampaignRecipient.findById(id);
  }

  findByIdPopulated(id: string) {
    return NewsletterCampaignRecipient.findById(id).populate(
      "campaignId",
      "campaignName subject status"
    );
  }

  findWithPagination(query: GetNewsletterCampaignRecipientsQuery) {
    return new APIFeature(NewsletterCampaignRecipient as never, query, {
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "-createdAt",
        allowedFields: ["createdAt", "updatedAt", "email", "status", "sentAt"],
      },
      search: { searchFields: ["email"] },
      filterFields: ["campaignId", "status"],
      populate: [{ path: "campaignId", select: "campaignName subject status" }],
      lean: true,
    }).execute();
  }

  findFailedByCampaign(campaignId: string) {
    return NewsletterCampaignRecipient.find({
      campaignId: new Types.ObjectId(campaignId),
      status: "failed",
    });
  }

  updateDeliveryResult(
    campaignId: string,
    email: string,
    result: { success: boolean; errorMessage?: string }
  ) {
    return NewsletterCampaignRecipient.findOneAndUpdate(
      { campaignId: new Types.ObjectId(campaignId), email },
      {
        status: result.success ? "sent" : "failed",
        errorMessage: result.success ? "" : (result.errorMessage ?? "Delivery failed"),
        sentAt: result.success ? new Date() : undefined,
        lastAttemptAt: new Date(),
        $inc: { attemptCount: 1 },
      },
      { new: true }
    );
  }

  async countByCampaign(campaignId: string) {
    const campaignObjectId = new Types.ObjectId(campaignId);
    const [sent, failed, pending] = await Promise.all([
      NewsletterCampaignRecipient.countDocuments({
        campaignId: campaignObjectId,
        status: "sent",
      }),
      NewsletterCampaignRecipient.countDocuments({
        campaignId: campaignObjectId,
        status: "failed",
      }),
      NewsletterCampaignRecipient.countDocuments({
        campaignId: campaignObjectId,
        status: "pending",
      }),
    ]);

    return { sent, failed, pending, total: sent + failed + pending };
  }

  markPending(campaignId: string, email: string) {
    return NewsletterCampaignRecipient.findOneAndUpdate(
      { campaignId: new Types.ObjectId(campaignId), email },
      {
        status: "pending" as NewsletterCampaignRecipientStatus,
        errorMessage: "",
        lastAttemptAt: new Date(),
      },
      { new: true }
    );
  }

  deleteByCampaignId(campaignId: string): Promise<{ deletedCount?: number }> {
    return NewsletterCampaignRecipient.deleteMany({
      campaignId: new Types.ObjectId(campaignId),
    });
  }
}

export default new NewsletterCampaignRecipientRepository();
