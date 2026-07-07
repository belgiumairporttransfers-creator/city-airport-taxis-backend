import type {
  BulkDeleteContactsData,
  GetContactsQuery,
  SubmitContactData,
} from "@/modules/contact/types/contact.types";
import contactRepository from "@/modules/contact/repositories/contact.repository";
import { normalizeEmail } from "@/modules/auth/utils/email";
import emailService from "@/infrastructure/email/email.service";
import logger from "@/shared/utils/logger";

class ContactService {
  private normalizePayload(data: SubmitContactData): SubmitContactData {
    return {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: normalizeEmail(data.email),
      phone: data.phone.trim(),
      subject: data.subject.trim(),
      message: data.message.trim(),
    };
  }

  async submit(data: SubmitContactData) {
    const payload = this.normalizePayload(data);
    const contact = await contactRepository.create(payload);

    try {
      await emailService.sendContactFormAdminNotification(payload);
      await emailService.sendContactFormConfirmationEmail({
        firstName: payload.firstName,
        email: payload.email,
      });
    } catch (error) {
      logger.error("Failed to send contact form emails", { error });
    }

    return contact;
  }

  async getContacts(query: GetContactsQuery) {
    const result = await contactRepository.findWithPagination(query);

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

  async deleteContact(id: string) {
    const deleted = await contactRepository.deleteById(id);

    if (!deleted) {
      return null;
    }

    return deleted;
  }

  async bulkDeleteContacts(data: BulkDeleteContactsData) {
    const result = await contactRepository.deleteManyByIds(data.ids);

    return {
      deletedCount: result.deletedCount ?? 0,
    };
  }
}

export default new ContactService();
