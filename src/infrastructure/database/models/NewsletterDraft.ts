import { Schema, model } from "mongoose";
import type { INewsletterDraft } from "@/modules/newsletter/types/newsletter-draft.types";
import {
  NEWSLETTER_DRAFT_AUDIENCES,
  NEWSLETTER_DRAFT_SEND_MODES,
} from "@/modules/newsletter/types/newsletter-draft.types";

const newsletterDraftSchema = new Schema<INewsletterDraft>(
  {
    campaignName: {
      type: String,
      required: [true, "Campaign name is required"],
      trim: true,
      maxlength: 120,
    },
    subject: { type: String, default: "", trim: true },
    preheader: { type: String, default: "", trim: true, maxlength: 150 },
    message: { type: String, default: "" },
    fromName: { type: String, default: "", trim: true, maxlength: 80 },
    replyTo: { type: String, default: "", trim: true, lowercase: true },
    audience: {
      type: String,
      enum: NEWSLETTER_DRAFT_AUDIENCES,
      default: "all",
    },
    sendMode: {
      type: String,
      enum: NEWSLETTER_DRAFT_SEND_MODES,
      default: "immediate",
    },
    scheduledDate: { type: String, default: "" },
    scheduledTime: { type: String, default: "" },
    ctaText: { type: String, default: "", trim: true, maxlength: 40 },
    ctaUrl: { type: String, default: "", trim: true },
    imageUrl: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const NewsletterDraft = model<INewsletterDraft>(
  "NewsletterDraft",
  newsletterDraftSchema
);
