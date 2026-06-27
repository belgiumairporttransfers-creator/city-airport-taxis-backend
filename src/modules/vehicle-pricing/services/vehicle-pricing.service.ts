import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import vehicleCategoryRepository from "@/modules/vehicle-categories/repositories/vehicle-category.repository";
import vehiclePricingRepository from "@/modules/vehicle-pricing/repositories/vehicle-pricing.repository";
import vehicleRepository from "@/modules/vehicles/repositories/vehicle.repository";
import {
  toVehicleCategoryResponse,
  resolveCategoryCapacities,
} from "@/modules/vehicle-categories/dto";
import { toVehicleResponse } from "@/modules/vehicles/dto";
import { toVehiclePricingResponse } from "@/modules/vehicle-pricing/dto";
import {
  analyzePricingStructure,
  buildResolvedFareResult,
  countOpenEndedSlabs,
} from "@/modules/vehicle-pricing/utils/pricing.utils";
import type {
  CreateVehiclePricingData,
  GetVehiclePricingQuery,
  PricingStructureValidationResult,
  ResolvedFareResult,
  UpdateVehiclePricingData,
  VehiclePricingQuotesResult,
  VehiclePricingPublicQuote,
} from "@/modules/vehicle-pricing/types/vehicle-pricing.types";

class VehiclePricingService {
  private logPricingAudit(
    event: (typeof AuditEvents)[keyof typeof AuditEvents],
    adminId: string,
    slabId: string,
    metadata?: Record<string, unknown>
  ) {
    auditService.log({
      event,
      actorId: adminId,
      actorType: "admin",
      entityType: "vehicle-pricing",
      entityId: slabId,
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

  private async validateSlabRules(
    categoryId: string,
    minDistance: number,
    maxDistance: number | null,
    excludeId?: string
  ) {
    if (maxDistance !== null && maxDistance <= minDistance) {
      throw new AppError("Maximum distance must be greater than minimum distance unless null", 400);
    }

    const overlaps = await vehiclePricingRepository.hasOverlappingSlab(
      categoryId,
      minDistance,
      maxDistance,
      excludeId
    );

    if (overlaps) {
      throw new AppError("Pricing slab overlaps with an existing slab for this category", 400);
    }

    if (maxDistance === null) {
      const slabs = await vehiclePricingRepository.findByCategoryId(categoryId, "active");
      const openEndedCount = countOpenEndedSlabs(
        slabs
          .filter((slab) => slab._id.toString() !== excludeId)
          .map((slab) => ({ maxDistance: slab.maxDistance }))
      );

      if (openEndedCount > 0) {
        throw new AppError("Only one open-ended pricing slab is allowed per category", 400);
      }
    }
  }

  async createSlab(data: CreateVehiclePricingData, adminId: string) {
    await this.assertActiveCategory(data.categoryId);
    await this.validateSlabRules(data.categoryId, data.minDistance, data.maxDistance);

    const slab = await vehiclePricingRepository.create({
      ...data,
      status: data.status ?? "active",
      sortOrder: data.sortOrder ?? 0,
      createdBy: adminId,
      updatedBy: adminId,
    });

    this.logPricingAudit(AuditEvents.VEHICLE_PRICING_CREATED, adminId, slab._id.toString(), {
      categoryId: data.categoryId,
      minDistance: slab.minDistance,
      maxDistance: slab.maxDistance,
      pricingType: slab.pricingType,
    });

    return slab;
  }

  async getSlab(id: string) {
    const slab = await vehiclePricingRepository.findById(id);

    if (!slab) {
      throw new AppError("Vehicle pricing slab not found", 404);
    }

    return slab;
  }

  async getSlabs(query: GetVehiclePricingQuery) {
    const result = await vehiclePricingRepository.findWithPagination(query);

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

  async getCategorySlabs(categoryId: string) {
    const category = await vehicleCategoryRepository.findById(categoryId);

    if (!category) {
      throw new AppError("Vehicle category not found", 404);
    }

    return vehiclePricingRepository.findByCategoryId(categoryId);
  }

  async updateSlab(id: string, data: UpdateVehiclePricingData, adminId: string) {
    const existing = await vehiclePricingRepository.findById(id);

    if (!existing) {
      throw new AppError("Vehicle pricing slab not found", 404);
    }

    await this.assertActiveCategory(existing.categoryId.toString());

    const minDistance = data.minDistance ?? existing.minDistance;
    const maxDistance = data.maxDistance !== undefined ? data.maxDistance : existing.maxDistance;
    const pricingType = data.pricingType ?? existing.pricingType;
    const perKmRate = data.perKmRate !== undefined ? data.perKmRate : existing.perKmRate;

    if (pricingType === "base_plus_per_unit" && (perKmRate === undefined || perKmRate === null)) {
      throw new AppError("Per km rate is required for base_plus_per_unit pricing", 400);
    }

    await this.validateSlabRules(existing.categoryId.toString(), minDistance, maxDistance, id);

    const slab = await vehiclePricingRepository.updateById(id, {
      ...data,
      updatedBy: adminId,
    });

    if (!slab) {
      throw new AppError("Vehicle pricing slab not found", 404);
    }

    this.logPricingAudit(AuditEvents.VEHICLE_PRICING_UPDATED, adminId, slab._id.toString(), {
      categoryId: slab.categoryId.toString(),
      minDistance: slab.minDistance,
      maxDistance: slab.maxDistance,
      pricingType: slab.pricingType,
    });

    return slab;
  }

  async deleteSlab(id: string, adminId: string) {
    const existing = await vehiclePricingRepository.findById(id);

    if (!existing) {
      throw new AppError("Vehicle pricing slab not found", 404);
    }

    const deleted = await vehiclePricingRepository.deleteById(id);

    if (!deleted) {
      throw new AppError("Vehicle pricing slab not found", 404);
    }

    this.logPricingAudit(AuditEvents.VEHICLE_PRICING_DELETED, adminId, id, {
      categoryId: existing.categoryId.toString(),
      minDistance: existing.minDistance,
      maxDistance: existing.maxDistance,
    });

    return deleted;
  }

  async resolveFare(categoryId: string, distanceKm: number): Promise<ResolvedFareResult> {
    if (distanceKm < 0) {
      throw new AppError("Distance must be a non-negative number", 400);
    }

    await this.assertActiveCategory(categoryId);

    const slab = await vehiclePricingRepository.findSlabForDistance(categoryId, distanceKm);

    if (!slab) {
      throw new AppError("No active pricing slab found for the given distance", 404);
    }

    return buildResolvedFareResult(toVehiclePricingResponse(slab), distanceKm);
  }

  async getDistanceQuotes(distanceKm: number): Promise<VehiclePricingQuotesResult> {
    if (distanceKm < 0) {
      throw new AppError("Distance must be a non-negative number", 400);
    }

    const [categories, vehicles] = await Promise.all([
      vehicleCategoryRepository.findActive(),
      vehicleRepository.findActive(),
    ]);

    const vehiclesByCategory = new Map<string, ReturnType<typeof toVehicleResponse>[]>();

    for (const vehicle of vehicles) {
      const categoryId = vehicle.categoryId.toString();
      const mappedVehicle = toVehicleResponse(vehicle);
      const existing = vehiclesByCategory.get(categoryId) ?? [];
      existing.push(mappedVehicle);
      vehiclesByCategory.set(categoryId, existing);
    }

    const items = await Promise.all(
      categories.map(async (category) => {
        const categoryId = category._id.toString();
        let fare: ResolvedFareResult | null = null;

        try {
          fare = await this.resolveFare(categoryId, distanceKm);
        } catch (error) {
          if (!(error instanceof AppError && error.statusCode === 404)) {
            throw error;
          }
        }

        return {
          category: toVehicleCategoryResponse(category),
          fare,
          vehicles: vehiclesByCategory.get(categoryId) ?? [],
        };
      })
    );

    return {
      distanceKm,
      items,
    };
  }

  async getPublicDistanceQuotes(distanceKm: number): Promise<VehiclePricingPublicQuote[]> {
    const result = await this.getDistanceQuotes(distanceKm);

    return result.items
      .filter((item) => item.fare !== null)
      .map((item) => {
        const capacities = resolveCategoryCapacities(item.category, item.vehicles);

        return {
          categoryId: item.category._id,
          categoryName: item.category.name,
          categorySlug: item.category.slug,
          passengerCapacity: capacities.passengerCapacity,
          luggageCapacity: capacities.luggageCapacity,
          price: item.fare!.amount,
        };
      });
  }

  async validateCategoryCoverage(
    categoryId: string,
    adminId?: string
  ): Promise<PricingStructureValidationResult> {
    const category = await vehicleCategoryRepository.findById(categoryId);

    if (!category) {
      throw new AppError("Vehicle category not found", 404);
    }

    const slabs = await vehiclePricingRepository.findByCategoryId(categoryId, "active");
    const result = analyzePricingStructure(
      slabs.map((slab) => ({
        _id: slab._id.toString(),
        minDistance: slab.minDistance,
        maxDistance: slab.maxDistance,
        pricingType: slab.pricingType,
        priceAmount: slab.priceAmount,
        increasePercentage: slab.increasePercentage,
      }))
    );

    if (adminId) {
      this.logPricingAudit(AuditEvents.VEHICLE_PRICING_VALIDATED, adminId, categoryId, {
        categoryId,
        isComplete: result.isComplete,
        overlapCount: result.overlaps.length,
        gapCount: result.gaps.length,
        openEndedCount: result.openEndedCount,
      });
    }

    return result;
  }
}

export default new VehiclePricingService();
