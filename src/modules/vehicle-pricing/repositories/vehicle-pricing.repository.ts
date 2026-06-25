import { VehiclePricing } from "@/infrastructure/database/models/VehiclePricing";
import type {
  CreateVehiclePricingData,
  GetVehiclePricingQuery,
  UpdateVehiclePricingData,
} from "@/modules/vehicle-pricing/types/vehicle-pricing.types";
import { distanceMatchesSlab } from "@/modules/vehicle-pricing/utils/pricing.utils";
import APIFeature from "@/shared/utils/APIFeature";
import type { Document, Model } from "mongoose";

class VehiclePricingRepository {
  create(
    data: CreateVehiclePricingData & { createdBy?: string; updatedBy?: string }
  ) {
    return VehiclePricing.create(data);
  }

  findById(id: string) {
    return VehiclePricing.findById(id);
  }

  findWithPagination(query: GetVehiclePricingQuery) {
    return new APIFeature(VehiclePricing as unknown as Model<Document>, query, {
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "sortOrder,minDistance",
        allowedFields: [
          "createdAt",
          "updatedAt",
          "minDistance",
          "maxDistance",
          "sortOrder",
          "status",
          "priceAmount",
        ],
      },
      filterFields: ["status", "categoryId"],
      excludeFields: ["__v"],
      lean: true,
    }).execute();
  }

  async updateById(id: string, data: UpdateVehiclePricingData & { updatedBy?: string }) {
    const doc = await VehiclePricing.findById(id);
    if (!doc) return null;

    doc.set(data);
    return doc.save();
  }

  deleteById(id: string) {
    return VehiclePricing.findByIdAndDelete(id);
  }

  findByCategoryId(categoryId: string, status?: "active" | "inactive") {
    const filter: Record<string, unknown> = { categoryId };

    if (status) {
      filter.status = status;
    }

    return VehiclePricing.find(filter).sort({ sortOrder: 1, minDistance: 1 }).lean();
  }

  async findSlabForDistance(categoryId: string, distanceKm: number) {
    const slabs = await VehiclePricing.find({
      categoryId,
      status: "active",
      minDistance: { $lte: distanceKm },
    })
      .sort({ minDistance: -1 })
      .lean();

    return slabs.find((slab) =>
      distanceMatchesSlab(distanceKm, slab.minDistance, slab.maxDistance)
    );
  }

  async hasOverlappingSlab(
    categoryId: string,
    minDistance: number,
    maxDistance: number | null,
    excludeId?: string
  ) {
    const filter: Record<string, unknown> = { categoryId, status: "active" };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const slabs = await VehiclePricing.find(filter).lean();

    return slabs.some((slab) => {
      const existing = { minDistance: slab.minDistance, maxDistance: slab.maxDistance };
      const aMax = maxDistance === null ? Number.POSITIVE_INFINITY : maxDistance;
      const bMax =
        existing.maxDistance === null ? Number.POSITIVE_INFINITY : existing.maxDistance;

      return minDistance < bMax && existing.minDistance < aMax;
    });
  }

  countByCategoryId(categoryId: string, status?: "active" | "inactive") {
    const filter: Record<string, unknown> = { categoryId };

    if (status) {
      filter.status = status;
    }

    return VehiclePricing.countDocuments(filter);
  }
}

export default new VehiclePricingRepository();
