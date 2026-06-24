import type {
  BulkDeleteNewsletterDraftsData,
  GetNewsletterDraftsQuery,
  SaveNewsletterDraftData,
  UpdateNewsletterDraftData,
} from "@/modules/newsletter/types/newsletter-draft.types";
import newsletterDraftRepository from "@/modules/newsletter/repositories/newsletter-draft.repository";

class NewsletterDraftService {
  async createDraft(data: SaveNewsletterDraftData, adminId?: string) {
    return newsletterDraftRepository.create({
      ...data,
      createdBy: adminId,
    });
  }

  async getDrafts(query: GetNewsletterDraftsQuery) {
    const result = await newsletterDraftRepository.findWithPagination(query);

    return {
      items: result.data,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    };
  }

  async getDraftById(id: string) {
    return newsletterDraftRepository.findById(id);
  }

  async updateDraft(id: string, data: UpdateNewsletterDraftData) {
    return newsletterDraftRepository.updateById(id, data);
  }

  async deleteDraft(id: string) {
    return newsletterDraftRepository.deleteById(id);
  }

  async bulkDeleteDrafts(data: BulkDeleteNewsletterDraftsData) {
    const result = await newsletterDraftRepository.deleteManyByIds(data.ids);

    return {
      deletedCount: result.deletedCount ?? 0,
    };
  }
}

export default new NewsletterDraftService();
