import { env } from "@/config/env";
import emailService from "@/infrastructure/email/email.service";
import { getNewsletterEmailTemplate } from "@/infrastructure/email/templates/newsletter.template";
import logger from "@/shared/utils/logger";
import newsletterRepository from "@/modules/newsletter/repositories/newsletter.repository";
import newsletterCampaignRepository from "@/modules/newsletter/repositories/newsletter-campaign.repository";
import newsletterCampaignRecipientRepository from "@/modules/newsletter/repositories/newsletter-campaign-recipient.repository";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildFromAddress = (fromName: string) => {
  const match = env.EMAIL_FROM.match(/<([^>]+)>/);
  const email = match?.[1] ?? env.EMAIL_FROM;
  const safeName = fromName.replace(/"/g, "").trim() || "City Airport Taxis";
  return `"${safeName}" <${email}>`;
};

export type NewsletterDeliveryProgress = {
  sentCount: number;
  failedCount: number;
  processedCount: number;
  recipientCount: number;
  percent: number;
};

export async function processNewsletterDelivery(
  campaignId: string,
  onProgress?: (progress: NewsletterDeliveryProgress) => Promise<void>
) {
  const campaign = await newsletterCampaignRepository.findById(campaignId);
  if (!campaign) {
    throw new Error(`Newsletter campaign not found: ${campaignId}`);
  }

  const subscribers = await newsletterRepository.findEmailsByAudience(campaign.audience);
  const recipients = subscribers.map((subscriber) => subscriber.email);

  if (recipients.length === 0) {
    await newsletterCampaignRepository.updateById(campaignId, {
      status: "failed",
      sentCount: 0,
      failedCount: 0,
      recipientCount: 0,
    });
    return;
  }

  await newsletterCampaignRecipientRepository.resetForCampaign(campaignId, recipients);

  const html = getNewsletterEmailTemplate({
    preheader: campaign.preheader,
    message: campaign.message,
    imageUrl: campaign.imageUrl || undefined,
    ctaText: campaign.ctaText || undefined,
    ctaUrl: campaign.ctaUrl || undefined,
  });

  const from = buildFromAddress(campaign.fromName);
  const batchSize = Math.max(1, env.NEWSLETTER_BATCH_SIZE);
  const progressEvery = Math.max(1, env.NEWSLETTER_PROGRESS_UPDATE_EVERY);

  const publishProgress = async (force = false) => {
    const counts = await newsletterCampaignRecipientRepository.countByCampaign(campaignId);
    const processedCount = counts.sent + counts.failed;
    const shouldUpdate =
      force ||
      processedCount % progressEvery === 0 ||
      processedCount === recipients.length;

    if (!shouldUpdate) return;

    await newsletterCampaignRepository.updateById(campaignId, {
      sentCount: counts.sent,
      failedCount: counts.failed,
      recipientCount: recipients.length,
      status: counts.pending > 0 ? "sending" : counts.failed === counts.total ? "failed" : "sent",
    });

    if (onProgress) {
      await onProgress({
        sentCount: counts.sent,
        failedCount: counts.failed,
        processedCount,
        recipientCount: recipients.length,
        percent:
          recipients.length > 0
            ? Math.min(100, Math.round((processedCount / recipients.length) * 100))
            : 0,
      });
    }
  };

  for (let index = 0; index < recipients.length; index += batchSize) {
    const batch = recipients.slice(index, index + batchSize);

    const results = await Promise.all(
      batch.map((email) =>
        emailService.sendEmail({
          to: email,
          subject: campaign.subject,
          html,
          from,
          replyTo: campaign.replyTo,
        })
      )
    );

    await Promise.all(
      batch.map((email, resultIndex) =>
        newsletterCampaignRecipientRepository.updateDeliveryResult(campaignId, email, {
          success: results[resultIndex],
          errorMessage: results[resultIndex] ? undefined : "Email delivery failed",
        })
      )
    );

    await publishProgress();

    if (index + batchSize < recipients.length && env.NEWSLETTER_BATCH_DELAY_MS > 0) {
      await sleep(env.NEWSLETTER_BATCH_DELAY_MS);
    }
  }

  const counts = await newsletterCampaignRecipientRepository.countByCampaign(campaignId);
  const status = counts.failed === recipients.length ? "failed" : "sent";

  await newsletterCampaignRepository.updateById(campaignId, {
    status,
    sentCount: counts.sent,
    failedCount: counts.failed,
    recipientCount: recipients.length,
    sentAt: new Date(),
  });

  await publishProgress(true);

  logger.info("Newsletter campaign delivered", {
    campaignId,
    recipientCount: recipients.length,
    sentCount: counts.sent,
    failedCount: counts.failed,
    status,
    provider: "smtp",
  });
}
