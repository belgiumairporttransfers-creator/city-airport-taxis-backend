import { VehiclePricing } from "@/infrastructure/database/models/VehiclePricing";
import { VehicleCategory } from "@/infrastructure/database/models/VehicleCategory";
import type {
  CreateVehiclePricingData,
  GetVehiclePricingQuery,
  UpdateVehiclePricingData,
} from "@/modules/vehicle-pricing/types/vehicle-pricing.types";
import { distanceMatchesSlab } from "@/modules/vehicle-pricing/utils/pricing.utils";
import APIFeature from "@/shared/utils/APIFeature";
import { escapeRegex } from "@/shared/utils/escape-regex";
import type { Document, FilterQuery, Model } from "mongoose";

class VehiclePricingRepository {
  private async buildSearchFilter(search: string) {
    const term = search.trim();
    if (!term) {
      return {};
    }

    const searchRegex = { $regex: escapeRegex(term), $options: "i" };
    const orConditions: FilterQuery<Document>[] = [{ pricingType: searchRegex }];

    const matchingCategories = await VehicleCategory.find({ name: searchRegex })
      .select("_id")
      .lean();

    if (matchingCategories.length > 0) {
      orConditions.push({
        categoryId: { $in: matchingCategories.map((category) => category._id) },
      });
    }

    const numericValue = Number(term);
    if (Number.isFinite(numericValue)) {
      orConditions.push(
        { minDistance: numericValue },
        { maxDistance: numericValue },
        { priceAmount: numericValue },
        { sortOrder: numericValue }
      );
    }

    return { $or: orConditions };
  }

  create(data: CreateVehiclePricingData & { createdBy?: string; updatedBy?: string }) {
    return VehiclePricing.create(data);
  }

  findById(id: string) {
    return VehiclePricing.findById(id);
  }

  async findWithPagination(query: GetVehiclePricingQuery) {
    const { search, ...queryRest } = query;
    const initialFilter = search?.trim() ? await this.buildSearchFilter(search) : undefined;

    return new APIFeature(VehiclePricing as unknown as Model<Document>, queryRest, {
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
      initialFilter,
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

  deleteByCategoryId(categoryId: string): Promise<{ deletedCount?: number }> {
    return VehiclePricing.deleteMany({ categoryId });
  }

  findByCategoryId(categoryId: string, status?: "active" | "inactive") {
    const filter: Record<string, unknown> = { categoryId };

    if (status) {
      filter.status = status;
    }

    return VehiclePricing.find(filter).sort({ sortOrder: 1, minDistance: 1 }).lean();
  }

  async findSlabForDistance(categoryId: string, distance: number) {
    const slabs = await VehiclePricing.find({
      categoryId,
      status: "active",
      minDistance: { $lte: distance },
    })
      .sort({ minDistance: -1 })
      .lean();

    return slabs.find((slab) =>
      distanceMatchesSlab(distance, slab.minDistance, slab.maxDistance)
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
      const bMax = existing.maxDistance === null ? Number.POSITIVE_INFINITY : existing.maxDistance;

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
