import type { Document } from "mongoose";

export const NEWSLETTER_SOURCES = ["coming-soon", "website"] as const;
export type NewsletterSource = (typeof NEWSLETTER_SOURCES)[number];

export interface INewsletter extends Document {
  email: string;
  source: NewsletterSource;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscribeNewsletterData {
  email: string;
  source?: NewsletterSource;
}

export interface GetNewslettersQuery {
  page?: number;
  limit?: number;
  search?: string;
  source?: string;
  sort?: string;
}

export interface BulkDeleteNewslettersData {
  ids: string[];
}
