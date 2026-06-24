import { Schema, model } from "mongoose";
import type { INewsletterCampaignRecipient } from "@/modules/newsletter/types/newsletter-campaign-recipient.types";
import { NEWSLETTER_CAMPAIGN_RECIPIENT_STATUSES } from "@/modules/newsletter/types/newsletter-campaign-recipient.types";

const newsletterCampaignRecipientSchema = new Schema<INewsletterCampaignRecipient>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "NewsletterCampaign",
      required: true,
      index: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true },
    status: {
      type: String,
      enum: NEWSLETTER_CAMPAIGN_RECIPIENT_STATUSES,
      default: "pending",
    },
    errorMessage: { type: String, default: "" },
    sentAt: { type: Date },
    lastAttemptAt: { type: Date },
    attemptCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

newsletterCampaignRecipientSchema.index({ campaignId: 1, email: 1 }, { unique: true });
newsletterCampaignRecipientSchema.index({ campaignId: 1, status: 1 });
newsletterCampaignRecipientSchema.index({ status: 1, createdAt: -1 });
newsletterCampaignRecipientSchema.index({ createdAt: -1 });

export const NewsletterCampaignRecipient = model<INewsletterCampaignRecipient>(
  "NewsletterCampaignRecipient",
  newsletterCampaignRecipientSchema
);
