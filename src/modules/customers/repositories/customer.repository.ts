import { Customer } from "@/infrastructure/database/models/Customer";
import type {
  CreateCustomerData,
  CustomerStatus,
  GetCustomersQuery,
  UpdateCustomerData,
} from "@/modules/customers/types/customer.types";
import APIFeature from "@/shared/utils/APIFeature";

class CustomerRepository {
  create(data: CreateCustomerData & { createdBy?: string; updatedBy?: string }) {
    return Customer.create(data);
  }

  findById(id: string) {
    return Customer.findById(id);
  }

  findByEmail(email: string) {
    return Customer.findOne({ email: email.trim().toLowerCase() });
  }

  findWithPagination(query: GetCustomersQuery) {
    return new APIFeature(Customer, query, {
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "-createdAt",
        allowedFields: [
          "createdAt",
          "updatedAt",
          "firstName",
          "lastName",
          "companyName",
          "email",
          "status",
          "tier",
          "customerType",
          "lastBookingAt",
          "totalBookings",
          "totalSpend",
        ],
      },
      search: {
        searchFields: ["firstName", "lastName", "companyName", "email", "phone"],
      },
      filterFields: ["status", "customerType", "tier"],
      excludeFields: ["__v"],
      lean: true,
    }).execute();
  }

  updateById(id: string, data: UpdateCustomerData & { updatedBy?: string }) {
    return Customer.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  archiveById(id: string, updatedBy?: string) {
    return Customer.findByIdAndUpdate(
      id,
      { status: "archived", updatedBy },
      { new: true, runValidators: true }
    );
  }

  restoreById(id: string, updatedBy?: string) {
    return Customer.findByIdAndUpdate(
      id,
      { status: "active", updatedBy },
      { new: true, runValidators: true }
    );
  }

  async countByStatus() {
    const results = await Customer.aggregate<{ _id: CustomerStatus; count: number }>([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    return results.map((item) => ({
      status: item._id,
      count: item.count,
    }));
  }
}

export default new CustomerRepository();
