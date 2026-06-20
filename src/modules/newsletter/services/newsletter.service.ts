import type {
  BulkDeleteNewslettersData,
  GetNewslettersQuery,
  SubscribeNewsletterData,
} from "@/modules/newsletter/types/newsletter.types";
import newsletterRepository from "@/modules/newsletter/repositories/newsletter.repository";

class NewsletterService {
  async subscribe(data: SubscribeNewsletterData) {
    const email = data.email.trim().toLowerCase();
    const source = data.source ?? "coming-soon";

    const existing = await newsletterRepository.findByEmail(email);

    if (existing) {
      return existing;
    }

    return newsletterRepository.create({ email, source });
  }

  async getNewsletters(query: GetNewslettersQuery) {
    const result = await newsletterRepository.findWithPagination(query);

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

  async deleteNewsletter(id: string) {
    const deleted = await newsletterRepository.deleteById(id);

    if (!deleted) {
      return null;
    }

    return deleted;
  }

  async bulkDeleteNewsletters(data: BulkDeleteNewslettersData) {
    const result = await newsletterRepository.deleteManyByIds(data.ids);

    return {
      deletedCount: result.deletedCount ?? 0,
    };
  }
}

export default new NewsletterService();
