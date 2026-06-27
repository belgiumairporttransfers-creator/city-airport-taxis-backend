import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import vehicleRepository from "@/modules/vehicles/repositories/vehicle.repository";
import vehiclePricingRepository from "@/modules/vehicle-pricing/repositories/vehicle-pricing.repository";
import vehicleCategoryRepository from "@/modules/vehicle-categories/repositories/vehicle-category.repository";
import { generateCategorySlug } from "@/modules/vehicle-categories/dto";
import type {
  CreateVehicleCategoryData,
  GetVehicleCategoriesQuery,
  UpdateVehicleCategoryData,
} from "@/modules/vehicle-categories/types/vehicle-category.types";

class VehicleCategoryService {
  private logCategoryAudit(
    event: (typeof AuditEvents)[keyof typeof AuditEvents],
    adminId: string,
    categoryId: string,
    metadata?: Record<string, unknown>
  ) {
    auditService.log({
      event,
      actorId: adminId,
      actorType: "admin",
      entityType: "vehicle-category",
      entityId: categoryId,
      metadata,
    });
  }

  private async resolveSlug(name: string, slug?: string) {
    const baseSlug = (slug?.trim().toLowerCase() || generateCategorySlug(name)).replace(
      /^-+|-+$/g,
      ""
    );

    if (!baseSlug) {
      throw new AppError("Unable to generate a valid category slug", 400);
    }

    return baseSlug;
  }

  private async applyDefaultFlag(isDefault: boolean | undefined, categoryId?: string) {
    if (isDefault) {
      await vehicleCategoryRepository.clearDefaultFlag(categoryId);
    }
  }

  async createCategory(data: CreateVehicleCategoryData, adminId: string) {
    const slug = await this.resolveSlug(data.name, data.slug);
    const isDefault = data.isDefault ?? false;

    await this.applyDefaultFlag(isDefault);

    const category = await vehicleCategoryRepository.create({
      ...data,
      slug,
      sortOrder: data.sortOrder ?? 0,
      status: data.status ?? "active",
      isDefault,
      createdBy: adminId,
      updatedBy: adminId,
    });

    this.logCategoryAudit(AuditEvents.VEHICLE_CATEGORY_CREATED, adminId, category._id.toString(), {
      name: category.name,
      slug: category.slug,
    });

    return category;
  }

  async getCategory(id: string) {
    const category = await vehicleCategoryRepository.findById(id);

    if (!category) {
      throw new AppError("Vehicle category not found", 404);
    }

    return category;
  }

  async getCategories(query: GetVehicleCategoriesQuery) {
    const result = await vehicleCategoryRepository.findWithPagination(query);

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

  async updateCategory(id: string, data: UpdateVehicleCategoryData, adminId: string) {
    const existing = await vehicleCategoryRepository.findById(id);

    if (!existing) {
      throw new AppError("Vehicle category not found", 404);
    }

    const name = data.name ?? existing.name;
    const slug = data.slug ? await this.resolveSlug(name, data.slug) : undefined;
    const isDefault = data.isDefault ?? existing.isDefault;

    if (data.isDefault === true) {
      await this.applyDefaultFlag(true, id);
    }

    const category = await vehicleCategoryRepository.updateById(id, {
      ...data,
      ...(slug ? { slug } : {}),
      ...(data.isDefault !== undefined ? { isDefault } : {}),
      updatedBy: adminId,
    });

    if (!category) {
      throw new AppError("Vehicle category not found", 404);
    }

    this.logCategoryAudit(AuditEvents.VEHICLE_CATEGORY_UPDATED, adminId, category._id.toString(), {
      name: category.name,
      slug: category.slug,
    });

    return category;
  }

  async deleteCategory(id: string, adminId: string) {
    const existing = await vehicleCategoryRepository.findById(id);

    if (!existing) {
      throw new AppError("Vehicle category not found", 404);
    }

    const vehicleCount = await vehicleRepository.countByCategoryId(id);
    const pricingCount = await vehiclePricingRepository.countByCategoryId(id);

    if (vehicleCount > 0 && pricingCount > 0) {
      throw new AppError("Cannot delete category because vehicles and pricing slabs exist.", 400);
    }

    if (vehicleCount > 0) {
      throw new AppError("Cannot delete category because vehicles are assigned.", 400);
    }

    if (pricingCount > 0) {
      throw new AppError("Cannot delete category because pricing slabs exist.", 400);
    }

    const deleted = await vehicleCategoryRepository.deleteById(id);

    if (!deleted) {
      throw new AppError("Vehicle category not found", 404);
    }

    this.logCategoryAudit(AuditEvents.VEHICLE_CATEGORY_DELETED, adminId, id, {
      name: existing.name,
      slug: existing.slug,
    });

    return deleted;
  }
}

export default new VehicleCategoryService();
