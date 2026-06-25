import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import vehicleRepository from "@/modules/vehicles/repositories/vehicle.repository";
import vehicleCategoryRepository from "@/modules/vehicle-categories/repositories/vehicle-category.repository";
import { normalizeRegistrationNumber } from "@/modules/vehicles/dto";
import type {
  CreateVehicleData,
  GetVehiclesQuery,
  UpdateVehicleData,
} from "@/modules/vehicles/types/vehicle.types";

class VehicleService {
  private logVehicleAudit(
    event: (typeof AuditEvents)[keyof typeof AuditEvents],
    adminId: string,
    vehicleId: string,
    metadata?: Record<string, unknown>
  ) {
    auditService.log({
      event,
      actorId: adminId,
      actorType: "admin",
      entityType: "vehicle",
      entityId: vehicleId,
      metadata,
    });
  }

  private async assertCategoryExists(categoryId: string) {
    const category = await vehicleCategoryRepository.findById(categoryId);

    if (!category) {
      throw new AppError("Vehicle category not found", 404);
    }

    if (category.status !== "active") {
      throw new AppError("Vehicle category is not active", 400);
    }

    return category;
  }

  async createVehicle(data: CreateVehicleData, adminId: string) {
    await this.assertCategoryExists(data.categoryId);

    const registrationNumber = normalizeRegistrationNumber(data.registrationNumber);

    const vehicle = await vehicleRepository.create({
      ...data,
      registrationNumber,
      features: data.features ?? [],
      status: data.status ?? "active",
      createdBy: adminId,
      updatedBy: adminId,
    });

    this.logVehicleAudit(AuditEvents.VEHICLE_CREATED, adminId, vehicle._id.toString(), {
      registrationNumber: vehicle.registrationNumber,
      categoryId: vehicle.categoryId.toString(),
    });

    return vehicle;
  }

  async getVehicle(id: string) {
    const vehicle = await vehicleRepository.findById(id);

    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    return vehicle;
  }

  async getVehicles(query: GetVehiclesQuery) {
    const result = await vehicleRepository.findWithPagination(query);

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

  async updateVehicle(id: string, data: UpdateVehicleData, adminId: string) {
    const existing = await vehicleRepository.findById(id);

    if (!existing) {
      throw new AppError("Vehicle not found", 404);
    }

    if (data.categoryId) {
      await this.assertCategoryExists(data.categoryId);
    }

    const registrationNumber = data.registrationNumber
      ? normalizeRegistrationNumber(data.registrationNumber)
      : undefined;

    const vehicle = await vehicleRepository.updateById(id, {
      ...data,
      ...(registrationNumber ? { registrationNumber } : {}),
      updatedBy: adminId,
    });

    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    this.logVehicleAudit(AuditEvents.VEHICLE_UPDATED, adminId, vehicle._id.toString(), {
      registrationNumber: vehicle.registrationNumber,
      categoryId: vehicle.categoryId.toString(),
    });

    return vehicle;
  }

  async deleteVehicle(id: string, adminId: string) {
    const existing = await vehicleRepository.findById(id);

    if (!existing) {
      throw new AppError("Vehicle not found", 404);
    }

    const deleted = await vehicleRepository.deleteById(id);

    if (!deleted) {
      throw new AppError("Vehicle not found", 404);
    }

    this.logVehicleAudit(AuditEvents.VEHICLE_DELETED, adminId, id, {
      registrationNumber: existing.registrationNumber,
      categoryId: existing.categoryId.toString(),
    });

    return deleted;
  }
}

export default new VehicleService();
