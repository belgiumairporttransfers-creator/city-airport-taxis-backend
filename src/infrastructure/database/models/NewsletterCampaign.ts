import { Schema, model } from "mongoose";
import type { INewsletterCampaign } from "@/modules/newsletter/types/newsletter-campaign.types";
import { NEWSLETTER_CAMPAIGN_STATUSES } from "@/modules/newsletter/types/newsletter-campaign.types";
import {
  NEWSLETTER_DRAFT_AUDIENCES,
  NEWSLETTER_DRAFT_SEND_MODES,
} from "@/modules/newsletter/types/newsletter-draft.types";

const newsletterCampaignSchema = new Schema<INewsletterCampaign>(
  {
    campaignName: { type: String, required: true, trim: true, maxlength: 120 },
    subject: { type: String, required: true, trim: true },
    preheader: { type: String, default: "", trim: true, maxlength: 150 },
    message: { type: String, required: true },
    fromName: { type: String, required: true, trim: true, maxlength: 80 },
    replyTo: { type: String, required: true, trim: true, lowercase: true },
    audience: {
      type: String,
      enum: NEWSLETTER_DRAFT_AUDIENCES,
      required: true,
    },
    sendMode: {
      type: String,
      enum: NEWSLETTER_DRAFT_SEND_MODES,
      required: true,
    },
    scheduledDate: { type: String, default: "" },
    scheduledTime: { type: String, default: "" },
    scheduledAt: { type: Date },
    ctaText: { type: String, default: "", trim: true, maxlength: 40 },
    ctaUrl: { type: String, default: "", trim: true },
    imageUrl: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
    status: {
      type: String,
      enum: NEWSLETTER_CAMPAIGN_STATUSES,
      default: "scheduled",
    },
    recipientCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    sentAt: { type: Date },
    draftId: { type: Schema.Types.ObjectId, ref: "NewsletterDraft" },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

newsletterCampaignSchema.index({ status: 1, scheduledAt: 1 });
newsletterCampaignSchema.index({ createdAt: -1 });

export const NewsletterCampaign = model<INewsletterCampaign>(
  "NewsletterCampaign",
  newsletterCampaignSchema
);
