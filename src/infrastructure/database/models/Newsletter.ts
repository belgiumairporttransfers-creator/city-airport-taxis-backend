import { Schema, model } from "mongoose";
import type { INewsletter } from "@/modules/newsletter/types/newsletter.types";
import { NEWSLETTER_SOURCES } from "@/modules/newsletter/types/newsletter.types";

const newsletterSchema = new Schema<INewsletter>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    source: {
      type: String,
      enum: NEWSLETTER_SOURCES,
      default: "coming-soon",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Newsletter = model<INewsletter>("Newsletter", newsletterSchema);
