import type { GetNewsletterCampaignsQuery } from "@/modules/newsletter/types/newsletter-campaign.types";
import newsletterCampaignRepository from "@/modules/newsletter/repositories/newsletter-campaign.repository";
import newsletterCampaignRecipientRepository from "@/modules/newsletter/repositories/newsletter-campaign-recipient.repository";
import { AppError } from "@/shared/errors/AppError";

class NewsletterCampaignService {
  async getCampaigns(query: GetNewsletterCampaignsQuery) {
    const result = await newsletterCampaignRepository.findWithPagination(query);

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

  async getCampaignById(id: string) {
    return newsletterCampaignRepository.findById(id);
  }

  async deleteCampaign(id: string) {
    const campaign = await newsletterCampaignRepository.findById(id);
    if (!campaign) {
      throw new AppError("Newsletter campaign not found", 404);
    }

    await newsletterCampaignRecipientRepository.deleteByCampaignId(id);
    const deleted = await newsletterCampaignRepository.deleteById(id);

    if (!deleted) {
      throw new AppError("Newsletter campaign not found", 404);
    }

    return deleted;
  }
}

export default new NewsletterCampaignService();
