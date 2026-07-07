import { Contact } from "@/infrastructure/database/models/Contact";
import type { GetContactsQuery } from "@/modules/contact/types/contact.types";
import APIFeature from "@/shared/utils/APIFeature";

class ContactRepository {
  create(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
  }) {
    return Contact.create(data);
  }

  findWithPagination(query: GetContactsQuery) {
    return new APIFeature(Contact, query, {
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "-createdAt",
        allowedFields: ["createdAt", "email", "firstName", "lastName", "subject"],
      },
      search: { searchFields: ["firstName", "lastName", "email", "subject", "message"] },
    }).execute();
  }

  deleteById(id: string) {
    return Contact.findByIdAndDelete(id);
  }

  deleteManyByIds(ids: string[]): Promise<{ deletedCount?: number }> {
    return Contact.deleteMany({ _id: { $in: ids } });
  }
}

export default new ContactRepository();
