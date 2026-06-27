import { VehicleCategory } from "@/infrastructure/database/models/VehicleCategory";
import type {
  CreateVehicleCategoryData,
  GetVehicleCategoriesQuery,
  UpdateVehicleCategoryData,
} from "@/modules/vehicle-categories/types/vehicle-category.types";
import APIFeature from "@/shared/utils/APIFeature";

class VehicleCategoryRepository {
  create(
    data: CreateVehicleCategoryData & { createdBy?: string; updatedBy?: string; slug: string }
  ) {
    return VehicleCategory.create(data);
  }

  findById(id: string) {
    return VehicleCategory.findById(id);
  }

  findBySlug(slug: string) {
    return VehicleCategory.findOne({ slug: slug.trim().toLowerCase() });
  }

  findWithPagination(query: GetVehicleCategoriesQuery) {
    return new APIFeature(VehicleCategory, query, {
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "sortOrder,-createdAt",
        allowedFields: ["createdAt", "updatedAt", "name", "slug", "sortOrder", "status"],
      },
      search: {
        searchFields: ["name", "description"],
      },
      filterFields: ["status"],
      excludeFields: ["__v"],
      lean: true,
    }).execute();
  }

  updateById(id: string, data: UpdateVehicleCategoryData & { updatedBy?: string; slug?: string }) {
    return VehicleCategory.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  deleteById(id: string) {
    return VehicleCategory.findByIdAndDelete(id);
  }

  count() {
    return VehicleCategory.countDocuments();
  }

  findActive() {
    return VehicleCategory.find({ status: "active" }).sort({ sortOrder: 1, name: 1 }).lean();
  }

  clearDefaultFlag(excludeId?: string) {
    const filter = excludeId ? { _id: { $ne: excludeId } } : {};
    return VehicleCategory.updateMany(filter, { isDefault: false });
  }
}

export default new VehicleCategoryRepository();
