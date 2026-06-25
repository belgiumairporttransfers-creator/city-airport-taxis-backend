import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import customerRepository from "@/modules/customers/repositories/customer.repository";
import type {
  CreateCustomerData,
  GetCustomersQuery,
  UpdateCustomerData,
} from "@/modules/customers/types/customer.types";

class CustomerService {
  private logCustomerAudit(
    event: (typeof AuditEvents)[keyof typeof AuditEvents],
    adminId: string,
    customerId: string,
    metadata?: Record<string, unknown>
  ) {
    auditService.log({
      event,
      actorId: adminId,
      actorType: "admin",
      entityType: "customer",
      entityId: customerId,
      metadata,
    });
  }

  async createCustomer(data: CreateCustomerData, adminId: string) {
    const email = data.email.trim().toLowerCase();

    const customer = await customerRepository.create({
      ...data,
      email,
      tier: data.tier ?? "standard",
      tags: data.tags ?? [],
      marketingOptIn: data.marketingOptIn ?? false,
      createdBy: adminId,
      updatedBy: adminId,
    });

    this.logCustomerAudit(AuditEvents.CUSTOMER_CREATED, adminId, customer._id.toString(), {
      customerType: customer.customerType,
      email: customer.email,
    });

    return customer;
  }

  async getCustomer(id: string) {
    const customer = await customerRepository.findById(id);

    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    return customer;
  }

  async getCustomers(query: GetCustomersQuery) {
    const result = await customerRepository.findWithPagination(query);

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

  async updateCustomer(id: string, data: UpdateCustomerData, adminId: string) {
    const existing = await customerRepository.findById(id);

    if (!existing) {
      throw new AppError("Customer not found", 404);
    }

    const { status: _status, ...updateData } = data;

    const email = (updateData.email ?? existing.email).trim().toLowerCase();

    const customer = await customerRepository.updateById(id, {
      ...updateData,
      email,
      updatedBy: adminId,
      ...(updateData.userId === null ? { userId: undefined } : {}),
    });

    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    this.logCustomerAudit(AuditEvents.CUSTOMER_UPDATED, adminId, customer._id.toString(), {
      customerType: customer.customerType,
      email: customer.email,
    });

    return customer;
  }

  async archiveCustomer(id: string, adminId: string) {
    const existing = await customerRepository.findById(id);

    if (!existing) {
      throw new AppError("Customer not found", 404);
    }

    if (!["active", "suspended"].includes(existing.status)) {
      throw new AppError("Only active or suspended customers can be archived", 400);
    }

    const customer = await customerRepository.archiveById(id, adminId);

    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    this.logCustomerAudit(AuditEvents.CUSTOMER_ARCHIVED, adminId, customer._id.toString(), {
      previousStatus: existing.status,
    });

    return customer;
  }

  async restoreCustomer(id: string, adminId: string) {
    const existing = await customerRepository.findById(id);

    if (!existing) {
      throw new AppError("Customer not found", 404);
    }

    if (!["archived", "suspended"].includes(existing.status)) {
      throw new AppError("Only archived or suspended customers can be restored", 400);
    }

    const customer = await customerRepository.restoreById(id, adminId);

    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    this.logCustomerAudit(AuditEvents.CUSTOMER_RESTORED, adminId, customer._id.toString(), {
      previousStatus: existing.status,
    });

    return customer;
  }

  async countCustomersByStatus() {
    return customerRepository.countByStatus();
  }
}

export default new CustomerService();
