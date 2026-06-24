import type { Document, Types } from "mongoose";
import type {
  NewsletterDraftAudience,
  NewsletterDraftSendMode,
} from "./newsletter-draft.types";

export const NEWSLETTER_CAMPAIGN_STATUSES = [
  "scheduled",
  "sending",
  "sent",
  "failed",
  "cancelled",
] as const;

export type NewsletterCampaignStatus = (typeof NEWSLETTER_CAMPAIGN_STATUSES)[number];

export interface INewsletterCampaign extends Document {
  campaignName: string;
  subject: string;
  preheader: string;
  message: string;
  fromName: string;
  replyTo: string;
  audience: NewsletterDraftAudience;
  sendMode: NewsletterDraftSendMode;
  scheduledDate: string;
  scheduledTime: string;
  scheduledAt?: Date;
  ctaText: string;
  ctaUrl: string;
  imageUrl: string;
  imagePublicId: string;
  status: NewsletterCampaignStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentAt?: Date;
  draftId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendNewsletterData {
  campaignName: string;
  subject: string;
  preheader?: string;
  message: string;
  fromName: string;
  replyTo: string;
  audience: NewsletterDraftAudience;
  sendMode: NewsletterDraftSendMode;
  scheduledDate?: string;
  scheduledTime?: string;
  scheduledAt?: string;
  ctaText?: string;
  ctaUrl?: string;
  imageUrl?: string;
  imagePublicId?: string;
  draftId?: string;
}

export interface GetNewsletterCampaignsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort?: string;
}
