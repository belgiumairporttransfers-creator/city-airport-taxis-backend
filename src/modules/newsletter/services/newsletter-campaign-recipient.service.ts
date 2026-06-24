import { env } from "@/config/env";
import emailService from "@/infrastructure/email/email.service";
import { getNewsletterEmailTemplate } from "@/infrastructure/email/templates/newsletter.template";
import { AppError } from "@/shared/errors/AppError";
import newsletterCampaignRepository from "@/modules/newsletter/repositories/newsletter-campaign.repository";
import newsletterCampaignRecipientRepository from "@/modules/newsletter/repositories/newsletter-campaign-recipient.repository";
import type { GetNewsletterCampaignRecipientsQuery } from "@/modules/newsletter/types/newsletter-campaign-recipient.types";
import type { INewsletterCampaign } from "@/modules/newsletter/types/newsletter-campaign.types";

const buildFromAddress = (fromName: string) => {
  const match = env.EMAIL_FROM.match(/<([^>]+)>/);
  const email = match?.[1] ?? env.EMAIL_FROM;
  const safeName = fromName.replace(/"/g, "").trim() || "City Airport Taxis";
  return `"${safeName}" <${email}>`;
};

const buildCampaignHtml = (campaign: INewsletterCampaign) =>
  getNewsletterEmailTemplate({
    preheader: campaign.preheader,
    message: campaign.message,
    imageUrl: campaign.imageUrl || undefined,
    ctaText: campaign.ctaText || undefined,
    ctaUrl: campaign.ctaUrl || undefined,
  });

class NewsletterCampaignRecipientService {
  async getRecipients(query: GetNewsletterCampaignRecipientsQuery) {
    const result = await newsletterCampaignRecipientRepository.findWithPagination(query);

    return {
      items: result.data,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    };
  }

  private async syncCampaignCounts(campaignId: string) {
    const counts = await newsletterCampaignRecipientRepository.countByCampaign(campaignId);
    const campaign = await newsletterCampaignRepository.findById(campaignId);

    if (!campaign) return;

    let status = campaign.status;

    if (counts.pending === 0 && counts.total > 0) {
      status = counts.failed === counts.total ? "failed" : "sent";
    } else if (counts.pending > 0) {
      status = "sending";
    }

    await newsletterCampaignRepository.updateById(campaignId, {
      status,
      sentCount: counts.sent,
      failedCount: counts.failed,
      recipientCount: counts.total,
      ...(status === "sent" || status === "failed" ? { sentAt: new Date() } : {}),
    });
  }

  private async deliverToEmail(campaign: INewsletterCampaign, email: string) {
    const html = buildCampaignHtml(campaign);
    const from = buildFromAddress(campaign.fromName);

    const success = await emailService.sendEmail({
      to: email,
      subject: campaign.subject,
      html,
      from,
      replyTo: campaign.replyTo,
    });

    await newsletterCampaignRecipientRepository.updateDeliveryResult(
      campaign._id.toString(),
      email,
      {
        success,
        errorMessage: success ? undefined : "Email delivery failed",
      }
    );

    await this.syncCampaignCounts(campaign._id.toString());

    return success;
  }

  async resendToRecipient(recipientId: string) {
    const recipient = await newsletterCampaignRecipientRepository.findById(recipientId);
    if (!recipient) {
      throw new AppError("Campaign recipient not found", 404);
    }

    if (recipient.status !== "failed") {
      throw new AppError("Only failed deliveries can be resent manually", 400);
    }

    const campaignId = recipient.campaignId.toString();

    const campaign = await newsletterCampaignRepository.findById(campaignId);
    if (!campaign) {
      throw new AppError("Newsletter campaign not found", 404);
    }

    await newsletterCampaignRecipientRepository.markPending(campaignId, recipient.email);
    await newsletterCampaignRepository.updateById(campaignId, { status: "sending" });

    const success = await this.deliverToEmail(campaign, recipient.email);
    const updated = await newsletterCampaignRecipientRepository.findByIdPopulated(recipientId);

    return { success, recipient: updated };
  }

  async resendAllFailed(campaignId: string) {
    const campaign = await newsletterCampaignRepository.findById(campaignId);
    if (!campaign) {
      throw new AppError("Newsletter campaign not found", 404);
    }

    const failedRecipients =
      await newsletterCampaignRecipientRepository.findFailedByCampaign(campaignId);

    if (failedRecipients.length === 0) {
      throw new AppError("No failed recipients found for this campaign", 400);
    }

    await newsletterCampaignRepository.updateById(campaignId, { status: "sending" });

    let resent = 0;
    let stillFailed = 0;

    for (const recipient of failedRecipients) {
      await newsletterCampaignRecipientRepository.markPending(campaignId, recipient.email);
      const success = await this.deliverToEmail(campaign, recipient.email);
      if (success) resent += 1;
      else stillFailed += 1;
    }

    return { resent, stillFailed, total: failedRecipients.length };
  }
}

export default new NewsletterCampaignRecipientService();
