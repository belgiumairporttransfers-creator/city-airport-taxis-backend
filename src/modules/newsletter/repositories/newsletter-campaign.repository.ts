import { NewsletterCampaign } from "@/infrastructure/database/models/NewsletterCampaign";
import type {
  GetNewsletterCampaignsQuery,
  SendNewsletterData,
} from "@/modules/newsletter/types/newsletter-campaign.types";
import APIFeature from "@/shared/utils/APIFeature";

class NewsletterCampaignRepository {
  create(data: {
    campaignName: string;
    subject: string;
    preheader?: string;
    message: string;
    fromName: string;
    replyTo: string;
    audience: SendNewsletterData["audience"];
    sendMode: SendNewsletterData["sendMode"];
    scheduledDate?: string;
    scheduledTime?: string;
    scheduledAt?: Date;
    ctaText?: string;
    ctaUrl?: string;
    imageUrl?: string;
    imagePublicId?: string;
    draftId?: string;
    status: string;
    recipientCount: number;
    sentCount?: number;
    failedCount?: number;
    createdBy?: string;
  }) {
    return NewsletterCampaign.create(data);
  }

  findById(id: string) {
    return NewsletterCampaign.findById(id);
  }

  findWithPagination(query: GetNewsletterCampaignsQuery) {
    return new APIFeature(NewsletterCampaign, query, {
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "-createdAt",
        allowedFields: ["createdAt", "updatedAt", "campaignName", "subject", "status", "sentAt"],
      },
      search: { searchFields: ["campaignName", "subject"] },
      filterFields: ["status"],
      excludeFields: ["message", "__v"],
      lean: true,
    }).execute();
  }

  findDueScheduled(now: Date) {
    return NewsletterCampaign.find({
      status: "scheduled",
      scheduledAt: { $lte: now },
    });
  }

  updateById(id: string, data: Record<string, unknown>) {
    return NewsletterCampaign.findByIdAndUpdate(id, data, { new: true });
  }

  deleteById(id: string) {
    return NewsletterCampaign.findByIdAndDelete(id);
  }
}

export default new NewsletterCampaignRepository();
