import type { Document, Types } from "mongoose";

export const NEWSLETTER_DRAFT_AUDIENCES = ["all", "coming-soon", "website"] as const;
export type NewsletterDraftAudience = (typeof NEWSLETTER_DRAFT_AUDIENCES)[number];

export const NEWSLETTER_DRAFT_SEND_MODES = ["immediate", "scheduled"] as const;
export type NewsletterDraftSendMode = (typeof NEWSLETTER_DRAFT_SEND_MODES)[number];

export interface INewsletterDraft extends Document {
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
  ctaText: string;
  ctaUrl: string;
  imageUrl: string;
  imagePublicId: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveNewsletterDraftData {
  campaignName: string;
  subject?: string;
  preheader?: string;
  message?: string;
  fromName?: string;
  replyTo?: string;
  audience?: NewsletterDraftAudience;
  sendMode?: NewsletterDraftSendMode;
  scheduledDate?: string;
  scheduledTime?: string;
  ctaText?: string;
  ctaUrl?: string;
  imageUrl?: string;
  imagePublicId?: string;
}

export type UpdateNewsletterDraftData = Partial<SaveNewsletterDraftData>;

export interface GetNewsletterDraftsQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}

export interface BulkDeleteNewsletterDraftsData {
  ids: string[];
}
