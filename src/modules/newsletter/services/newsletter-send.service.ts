import { env } from "@/config/env";
import { AppError } from "@/shared/errors/AppError";
import logger from "@/shared/utils/logger";
import newsletterRepository from "@/modules/newsletter/repositories/newsletter.repository";
import newsletterCampaignRepository from "@/modules/newsletter/repositories/newsletter-campaign.repository";
import newsletterDraftRepository from "@/modules/newsletter/repositories/newsletter-draft.repository";
import {
  enqueueNewsletterDelivery,
  runNewsletterDeliveryFallback,
} from "@/modules/newsletter/queues/newsletter-delivery.queue";
import type { SendNewsletterData } from "@/modules/newsletter/types/newsletter-campaign.types";

class NewsletterSendService {
  private async queueCampaignDelivery(campaignId: string): Promise<boolean> {
    const queued = await enqueueNewsletterDelivery(campaignId);

    if (queued) {
      return true;
    }

    if (env.NEWSLETTER_QUEUE_ENABLED) {
      throw new AppError(
        "Newsletter delivery queue is unavailable. Check Redis and try again.",
        503
      );
    }

    logger.warn("Newsletter queue disabled — processing delivery in-process", { campaignId });
    runNewsletterDeliveryFallback(campaignId);
    return false;
  }

  async sendNewsletter(data: SendNewsletterData, adminId?: string) {
    const subscribers = await newsletterRepository.findEmailsByAudience(data.audience);

    if (subscribers.length === 0) {
      throw new AppError("No subscribers found for the selected audience", 400);
    }

    const scheduledAtDate = data.scheduledAt ? new Date(data.scheduledAt) : undefined;

    const campaignPayload = {
      campaignName: data.campaignName,
      subject: data.subject,
      preheader: data.preheader ?? "",
      message: data.message,
      fromName: data.fromName,
      replyTo: data.replyTo,
      audience: data.audience,
      sendMode: data.sendMode,
      scheduledDate: data.scheduledDate ?? "",
      scheduledTime: data.scheduledTime ?? "",
      ctaText: data.ctaText ?? "",
      ctaUrl: data.ctaUrl ?? "",
      imageUrl: data.imageUrl ?? "",
      imagePublicId: data.imagePublicId ?? "",
      recipientCount: subscribers.length,
      createdBy: adminId,
      draftId: data.draftId,
    };

    if (data.sendMode === "scheduled") {
      const campaign = await newsletterCampaignRepository.create({
        ...campaignPayload,
        status: "scheduled",
        scheduledAt: scheduledAtDate,
      });

      if (data.draftId) {
        await newsletterDraftRepository.deleteById(data.draftId);
      }

      return { campaign, queued: false };
    }

    const campaign = await newsletterCampaignRepository.create({
      ...campaignPayload,
      status: "sending",
      sentCount: 0,
      failedCount: 0,
    });

    const queued = await this.queueCampaignDelivery(campaign._id.toString());

    if (data.draftId) {
      await newsletterDraftRepository.deleteById(data.draftId);
    }

    return { campaign, queued };
  }

  async resendCampaign(campaignId: string) {
    const campaign = await newsletterCampaignRepository.findById(campaignId);
    if (!campaign) {
      throw new AppError("Newsletter campaign not found", 404);
    }

    if (!["failed", "sending"].includes(campaign.status)) {
      throw new AppError("Only failed or stuck sending campaigns can be resent", 400);
    }

    const subscribers = await newsletterRepository.findEmailsByAudience(campaign.audience);
    if (subscribers.length === 0) {
      throw new AppError("No subscribers found for the selected audience", 400);
    }

    const sending = await newsletterCampaignRepository.updateById(campaignId, {
      status: "sending",
      sentCount: 0,
      failedCount: 0,
      recipientCount: subscribers.length,
      sentAt: undefined,
    });

    if (!sending) {
      throw new AppError("Newsletter campaign not found", 404);
    }

    const queued = await this.queueCampaignDelivery(campaignId);

    return { campaign: sending, queued };
  }

  async processDueScheduledCampaigns() {
    const dueCampaigns = await newsletterCampaignRepository.findDueScheduled(new Date());

    for (const campaign of dueCampaigns) {
      try {
        const claimed = await newsletterCampaignRepository.updateById(campaign._id.toString(), {
          status: "sending",
          sentCount: 0,
          failedCount: 0,
        });

        if (!claimed || claimed.status !== "sending") continue;

        const subscribers = await newsletterRepository.findEmailsByAudience(campaign.audience);

        if (subscribers.length === 0) {
          await newsletterCampaignRepository.updateById(campaign._id.toString(), {
            status: "failed",
            failedCount: 0,
            sentCount: 0,
          });
          continue;
        }

        await newsletterCampaignRepository.updateById(campaign._id.toString(), {
          recipientCount: subscribers.length,
        });

        await this.queueCampaignDelivery(campaign._id.toString());
      } catch (error) {
        logger.error("Scheduled newsletter send failed", {
          campaignId: campaign._id.toString(),
          error,
        });
        await newsletterCampaignRepository.updateById(campaign._id.toString(), {
          status: "failed",
        });
      }
    }
  }
}

export default new NewsletterSendService();
