import mongoose from "mongoose";
import { VehicleCategory } from "@/infrastructure/database/models/VehicleCategory";
import { Vehicle } from "@/infrastructure/database/models/Vehicle";
import { VehiclePricing } from "@/infrastructure/database/models/VehiclePricing";
import { generateCategorySlug } from "@/modules/vehicle-categories/dto";
import { normalizeRegistrationNumber } from "@/modules/vehicles/dto";
import { env } from "@/config/env";
import logger from "@/shared/utils/logger";
import { sampleVehicleCategories, sampleVehicles } from "@/scripts/data/vehicle-fleet.samples";
import { sampleVehiclePricing } from "@/scripts/data/vehicle-pricing.samples";

const seedVehicleFleet = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info("Connected to MongoDB for vehicle fleet seeding");

    const deletedPricing = await VehiclePricing.deleteMany({});
    const deletedVehicles = await Vehicle.deleteMany({});
    const deletedCategories = await VehicleCategory.deleteMany({});

    logger.info("Cleared existing vehicle fleet data", {
      pricing: deletedPricing.deletedCount ?? 0,
      vehicles: deletedVehicles.deletedCount ?? 0,
      categories: deletedCategories.deletedCount ?? 0,
    });

    const categoryIdBySlug = new Map<string, string>();

    for (const category of sampleVehicleCategories) {
      const slug = category.slug || generateCategorySlug(category.name);

      if (category.isDefault) {
        await VehicleCategory.updateMany({ isDefault: true }, { isDefault: false });
      }

      const created = await VehicleCategory.create({
        ...category,
        slug,
      });

      categoryIdBySlug.set(slug, created._id.toString());
      logger.info(`Category created: ${category.name}`);
    }

    for (const vehicle of sampleVehicles) {
      const categoryId = categoryIdBySlug.get(vehicle.categorySlug);

      if (!categoryId) {
        logger.warn(`Skipping vehicle ${vehicle.registrationNumber}: category not found`);
        continue;
      }

      const registrationNumber = normalizeRegistrationNumber(vehicle.registrationNumber);
      const { categorySlug: _categorySlug, ...vehicleData } = vehicle;

      await Vehicle.create({
        ...vehicleData,
        categoryId,
        registrationNumber,
        features: vehicleData.features ?? [],
      });

      logger.info(`Vehicle created: ${registrationNumber}`);
    }

    for (const slab of sampleVehiclePricing) {
      const categoryId = categoryIdBySlug.get(slab.categorySlug);

      if (!categoryId) {
        logger.warn(`Skipping pricing slab: category not found for slug "${slab.categorySlug}"`);
        continue;
      }

      const { categorySlug: _categorySlug, ...slabData } = slab;

      await VehiclePricing.create({
        ...slabData,
        categoryId,
      });
    }

    logger.info(
      `Vehicle fleet seeding completed — ${sampleVehicleCategories.length} categories, ${sampleVehicles.length} vehicles, ${sampleVehiclePricing.length} pricing slabs`
    );
    process.exit(0);
  } catch (error) {
    logger.error("Error seeding vehicle fleet:", error);
    process.exit(1);
  }
};

seedVehicleFleet();
