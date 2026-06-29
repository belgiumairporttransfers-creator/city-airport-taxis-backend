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

  private async getCategoryById(categoryId: string) {
    const category = await vehicleCategoryRepository.findById(categoryId);

    if (!category) {
      throw new AppError("Vehicle category not found", 404);
    }

    return category;
  }

  private async assertActiveCategory(categoryId: string) {
    const category = await this.getCategoryById(categoryId);

    if (category.status !== "active") {
      throw new AppError("Vehicle category is not active", 400);
    }

    return category;
  }

  private resolveCapacitiesFromCategory(category: {
    passengerCapacity?: number;
    luggageCapacity?: number;
  }) {
    const passengerCapacity = Number(category.passengerCapacity ?? 0);
    const luggageCapacity = Number(category.luggageCapacity ?? 0);

    if (passengerCapacity < 1) {
      throw new AppError(
        "Category must have passenger capacity configured before assigning vehicles",
        400
      );
    }

    return { passengerCapacity, luggageCapacity };
  }

  private stripClientCapacities<T extends UpdateVehicleData>(data: T) {
    const { passengerCapacity: _passengerCapacity, luggageCapacity: _luggageCapacity, ...rest } =
      data;

    return rest;
  }

  async createVehicle(data: CreateVehicleData, adminId: string) {
    const category = await this.assertActiveCategory(data.categoryId);
    const capacities = this.resolveCapacitiesFromCategory(category);
    const { passengerCapacity: _passengerCapacity, luggageCapacity: _luggageCapacity, ...rest } =
      data;

    const registrationNumber = normalizeRegistrationNumber(rest.registrationNumber);

    const vehicle = await vehicleRepository.create({
      ...rest,
      ...capacities,
      registrationNumber,
      features: rest.features ?? [],
      status: rest.status ?? "active",
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

    if (data.categoryId && data.categoryId !== existing.categoryId.toString()) {
      await this.assertActiveCategory(data.categoryId);
    }

    const effectiveCategoryId = data.categoryId ?? existing.categoryId.toString();
    const category = await this.getCategoryById(effectiveCategoryId);
    const capacities = this.resolveCapacitiesFromCategory(category);
    const rest = this.stripClientCapacities(data);

    const registrationNumber = rest.registrationNumber
      ? normalizeRegistrationNumber(rest.registrationNumber)
      : undefined;

    const vehicle = await vehicleRepository.updateById(id, {
      ...rest,
      ...capacities,
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
