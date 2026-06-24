import { NewsletterDraft } from "@/infrastructure/database/models/NewsletterDraft";
import type {
  GetNewsletterDraftsQuery,
  SaveNewsletterDraftData,
  UpdateNewsletterDraftData,
} from "@/modules/newsletter/types/newsletter-draft.types";
import APIFeature from "@/shared/utils/APIFeature";

class NewsletterDraftRepository {
  create(data: SaveNewsletterDraftData & { createdBy?: string }) {
    return NewsletterDraft.create(data);
  }

  findById(id: string) {
    return NewsletterDraft.findById(id);
  }

  findWithPagination(query: GetNewsletterDraftsQuery) {
    return new APIFeature(NewsletterDraft, query, {
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "-updatedAt",
        allowedFields: ["updatedAt", "createdAt", "campaignName", "subject"],
      },
      search: { searchFields: ["campaignName", "subject"] },
    }).execute();
  }

  updateById(id: string, data: UpdateNewsletterDraftData) {
    return NewsletterDraft.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  deleteById(id: string) {
    return NewsletterDraft.findByIdAndDelete(id);
  }

  deleteManyByIds(ids: string[]): Promise<{ deletedCount?: number }> {
    return NewsletterDraft.deleteMany({ _id: { $in: ids } });
  }
}

export default new NewsletterDraftRepository();
