import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import vehicleCategoryRepository from "@/modules/vehicle-categories/repositories/vehicle-category.repository";
import hourlyPricingRepository from "@/modules/vehicle-pricing/repositories/hourly-pricing.repository";
import type {
  CreateHourlyPricingData,
  GetHourlyPricingQuery,
  UpdateHourlyPricingData,
} from "@/modules/vehicle-pricing/types/hourly-pricing.types";

class HourlyPricingService {
  private logAudit(
    event: (typeof AuditEvents)[keyof typeof AuditEvents],
    adminId: string,
    pricingId: string,
    metadata?: Record<string, unknown>
  ) {
    auditService.log({
      event,
      actorId: adminId,
      actorType: "admin",
      entityType: "hourly-pricing",
      entityId: pricingId,
      metadata,
    });
  }

  private async assertActiveCategory(categoryId: string) {
    const category = await vehicleCategoryRepository.findById(categoryId);

    if (!category) {
      throw new AppError("Vehicle category not found", 404);
    }

    if (category.status !== "active") {
      throw new AppError("Vehicle category is not active", 400);
    }

    return category;
  }

  private async assertUniqueDuration(categoryId: string, duration: number, excludeId?: string) {
    const existing = await hourlyPricingRepository.findByCategoryAndDuration(
      categoryId,
      duration,
      excludeId
    );

    if (existing) {
      throw new AppError("Hourly pricing already exists for this category and duration", 400);
    }
  }

  async create(data: CreateHourlyPricingData, adminId: string) {
    await this.assertActiveCategory(data.categoryId);
    await this.assertUniqueDuration(data.categoryId, data.duration);

    const pricing = await hourlyPricingRepository.create({
      ...data,
      serviceType: data.serviceType ?? "hourly",
      status: data.status ?? "active",
      sortOrder: data.sortOrder ?? 0,
      createdBy: adminId,
      updatedBy: adminId,
    });

    this.logAudit(AuditEvents.HOURLY_PRICING_CREATED, adminId, pricing._id.toString(), {
      categoryId: data.categoryId,
      duration: pricing.duration,
      price: pricing.price,
    });

    return pricing;
  }

  async getOne(id: string) {
    const pricing = await hourlyPricingRepository.findById(id);

    if (!pricing) {
      throw new AppError("Hourly pricing not found", 404);
    }

    return pricing;
  }

  async getAll(query: GetHourlyPricingQuery) {
    const result = await hourlyPricingRepository.findWithPagination(query);

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

  async getByCategory(categoryId: string) {
    const category = await vehicleCategoryRepository.findById(categoryId);

    if (!category) {
      throw new AppError("Vehicle category not found", 404);
    }

    return hourlyPricingRepository.findByCategoryId(categoryId);
  }

  async update(id: string, data: UpdateHourlyPricingData, adminId: string) {
    const existing = await hourlyPricingRepository.findById(id);

    if (!existing) {
      throw new AppError("Hourly pricing not found", 404);
    }

    const nextDuration = data.duration ?? existing.duration;

    if (data.duration !== undefined && data.duration !== existing.duration) {
      await this.assertUniqueDuration(existing.categoryId.toString(), nextDuration, id);
    }

    const pricing = await hourlyPricingRepository.updateById(id, {
      ...data,
      updatedBy: adminId,
    });

    if (!pricing) {
      throw new AppError("Hourly pricing not found", 404);
    }

    this.logAudit(AuditEvents.HOURLY_PRICING_UPDATED, adminId, id, {
      categoryId: pricing.categoryId.toString(),
      duration: pricing.duration,
      changes: Object.keys(data),
    });

    return pricing;
  }

  async deleteOne(id: string, adminId: string) {
    const existing = await hourlyPricingRepository.findById(id);

    if (!existing) {
      throw new AppError("Hourly pricing not found", 404);
    }

    const deleted = await hourlyPricingRepository.deleteById(id);

    if (!deleted) {
      throw new AppError("Hourly pricing not found", 404);
    }

    this.logAudit(AuditEvents.HOURLY_PRICING_DELETED, adminId, id, {
      categoryId: existing.categoryId.toString(),
      duration: existing.duration,
    });

    return deleted;
  }

  async getPublicDurations() {
    const durations = await hourlyPricingRepository.findDistinctActiveDurations();

    return {
      items: durations.map((duration) => ({ duration })),
    };
  }
}

export default new HourlyPricingService();
