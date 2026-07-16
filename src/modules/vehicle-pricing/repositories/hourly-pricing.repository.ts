import { HourlyPricing } from "@/infrastructure/database/models/HourlyPricing";
import { VehicleCategory } from "@/infrastructure/database/models/VehicleCategory";
import type {
  CreateHourlyPricingData,
  GetHourlyPricingQuery,
  UpdateHourlyPricingData,
} from "@/modules/vehicle-pricing/types/hourly-pricing.types";
import APIFeature from "@/shared/utils/APIFeature";
import { escapeRegex } from "@/shared/utils/escape-regex";
import type { Document, FilterQuery, Model } from "mongoose";

class HourlyPricingRepository {
  private async buildSearchFilter(search: string) {
    const term = search.trim();
    if (!term) {
      return {};
    }

    const searchRegex = { $regex: escapeRegex(term), $options: "i" };
    const orConditions: FilterQuery<Document>[] = [{ serviceType: searchRegex }];

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
        { duration: numericValue },
        { price: numericValue },
        { includedDistance: numericValue },
        { extraDistancePrice: numericValue },
        { sortOrder: numericValue }
      );
    }

    return { $or: orConditions };
  }

  create(data: CreateHourlyPricingData & { createdBy?: string; updatedBy?: string }) {
    return HourlyPricing.create(data);
  }

  findById(id: string) {
    return HourlyPricing.findById(id);
  }

  findByCategoryAndDuration(categoryId: string, duration: number, excludeId?: string) {
    const filter: Record<string, unknown> = { categoryId, duration };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    return HourlyPricing.findOne(filter);
  }

  findActiveByCategoryAndDuration(categoryId: string, duration: number) {
    return HourlyPricing.findOne({
      categoryId,
      duration,
      status: "active",
    }).lean();
  }

  async findWithPagination(query: GetHourlyPricingQuery) {
    const { search, ...queryRest } = query;
    const initialFilter = search?.trim() ? await this.buildSearchFilter(search) : undefined;

    return new APIFeature(HourlyPricing as unknown as Model<Document>, queryRest, {
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "sortOrder,duration",
        allowedFields: [
          "createdAt",
          "updatedAt",
          "duration",
          "price",
          "includedDistance",
          "extraDistancePrice",
          "sortOrder",
          "status",
        ],
      },
      filterFields: ["status", "categoryId"],
      initialFilter,
      excludeFields: ["__v"],
      lean: true,
    }).execute();
  }

  async updateById(id: string, data: UpdateHourlyPricingData & { updatedBy?: string }) {
    const doc = await HourlyPricing.findById(id);
    if (!doc) return null;

    doc.set(data);
    return doc.save();
  }

  deleteById(id: string) {
    return HourlyPricing.findByIdAndDelete(id);
  }

  deleteByCategoryId(categoryId: string): Promise<{ deletedCount?: number }> {
    return HourlyPricing.deleteMany({ categoryId });
  }

  findByCategoryId(categoryId: string, status?: "active" | "inactive") {
    const filter: Record<string, unknown> = { categoryId };

    if (status) {
      filter.status = status;
    }

    return HourlyPricing.find(filter).sort({ sortOrder: 1, duration: 1 }).lean();
  }

  async findDistinctActiveDurations(): Promise<number[]> {
    const durations = await HourlyPricing.distinct("duration", { status: "active" });

    return durations
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);
  }
}

export default new HourlyPricingRepository();
