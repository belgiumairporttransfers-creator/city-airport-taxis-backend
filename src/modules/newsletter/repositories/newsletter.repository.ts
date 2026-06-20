import { Newsletter } from "@/infrastructure/database/models/Newsletter";
import type { GetNewslettersQuery } from "@/modules/newsletter/types/newsletter.types";
import APIFeature from "@/shared/utils/APIFeature";

class NewsletterRepository {
  findByEmail(email: string) {
    return Newsletter.findOne({ email });
  }

  create(data: { email: string; source: string }) {
    return Newsletter.create(data);
  }

  findWithPagination(query: GetNewslettersQuery) {
    return new APIFeature(Newsletter, query, {
      pagination: { defaultLimit: 20 },
      sort: { defaultSort: "-createdAt", allowedFields: ["createdAt", "email", "source"] },
      search: { searchFields: ["email"] },
      filterFields: ["source"],
    }).execute();
  }

  deleteById(id: string) {
    return Newsletter.findByIdAndDelete(id);
  }

  deleteManyByIds(ids: string[]): Promise<{ deletedCount?: number }> {
    return Newsletter.deleteMany({ _id: { $in: ids } });
  }
}

export default new NewsletterRepository();
