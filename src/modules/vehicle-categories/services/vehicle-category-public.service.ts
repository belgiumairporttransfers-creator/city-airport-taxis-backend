import { AppError } from "@/shared/errors/AppError";
import vehicleCategoryRepository from "@/modules/vehicle-categories/repositories/vehicle-category.repository";
import vehiclePricingRepository from "@/modules/vehicle-pricing/repositories/vehicle-pricing.repository";
import vehicleRepository from "@/modules/vehicles/repositories/vehicle.repository";
import {
  toVehicleCategoryPublicDetailResponse,
  toVehicleCategoryPublicResponse,
} from "@/modules/vehicle-categories/dto";

class VehicleCategoryPublicService {
  async getActiveCategories() {
    const [categories, vehicles] = await Promise.all([
      vehicleCategoryRepository.findActive(),
      vehicleRepository.findActive(),
    ]);

    const vehiclesByCategory = new Map<string, typeof vehicles>();

    for (const vehicle of vehicles) {
      const categoryId = vehicle.categoryId.toString();
      const existing = vehiclesByCategory.get(categoryId) ?? [];
      existing.push(vehicle);
      vehiclesByCategory.set(categoryId, existing);
    }

    return categories.map((category) =>
      toVehicleCategoryPublicResponse(
        category,
        vehiclesByCategory.get(category._id.toString()) ?? []
      )
    );
  }

  async getCategoryBySlug(slug: string) {
    const category = await vehicleCategoryRepository.findBySlug(slug);

    if (!category || category.status !== "active") {
      throw new AppError("Vehicle category not found", 404);
    }

    const categoryId = category._id.toString();
    const [vehicles, activePricingSlabCount] = await Promise.all([
      vehicleRepository.findActiveByCategoryId(categoryId),
      vehiclePricingRepository.countByCategoryId(categoryId, "active"),
    ]);

    return toVehicleCategoryPublicDetailResponse(category, {
      vehicles,
      activePricingSlabCount,
    });
  }
}

export default new VehicleCategoryPublicService();
