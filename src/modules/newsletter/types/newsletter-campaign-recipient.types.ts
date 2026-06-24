import type { Document, Types } from "mongoose";

export const NEWSLETTER_CAMPAIGN_RECIPIENT_STATUSES = ["pending", "sent", "failed"] as const;

export type NewsletterCampaignRecipientStatus =
  (typeof NEWSLETTER_CAMPAIGN_RECIPIENT_STATUSES)[number];

export interface INewsletterCampaignRecipient extends Document {
  campaignId: Types.ObjectId;
  email: string;
  status: NewsletterCampaignRecipientStatus;
  errorMessage?: string;
  sentAt?: Date;
  lastAttemptAt?: Date;
  attemptCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetNewsletterCampaignRecipientsQuery {
  page?: number;
  limit?: number;
  search?: string;
  campaignId?: string;
  status?: NewsletterCampaignRecipientStatus;
  sort?: string;
}
