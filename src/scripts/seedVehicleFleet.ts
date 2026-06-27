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

    const categoryIdBySlug = new Map<string, string>();

    for (const category of sampleVehicleCategories) {
      const slug = category.slug || generateCategorySlug(category.name);
      const existing = await VehicleCategory.findOne({ slug });

      if (existing) {
        categoryIdBySlug.set(slug, existing._id.toString());
        logger.info(`Category already exists: ${category.name}`);
        continue;
      }

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
      const existing = await Vehicle.findOne({ registrationNumber });

      if (existing) {
        logger.info(`Vehicle already exists: ${registrationNumber}`);
        continue;
      }

      const { categorySlug: _categorySlug, ...vehicleData } = vehicle;

      await Vehicle.create({
        ...vehicleData,
        categoryId,
        registrationNumber,
        features: vehicleData.features ?? [],
      });

      logger.info(`Vehicle created: ${registrationNumber}`);
    }

    const skippedPricingCategories = new Set<string>();
    const checkedPricingCategories = new Set<string>();

    for (const slab of sampleVehiclePricing) {
      const categoryId = categoryIdBySlug.get(slab.categorySlug);

      if (!categoryId) {
        logger.warn(`Skipping pricing slab: category not found for slug "${slab.categorySlug}"`);
        continue;
      }

      if (skippedPricingCategories.has(slab.categorySlug)) {
        continue;
      }

      if (!checkedPricingCategories.has(slab.categorySlug)) {
        checkedPricingCategories.add(slab.categorySlug);
        const existingCount = await VehiclePricing.countDocuments({ categoryId });

        if (existingCount > 0) {
          skippedPricingCategories.add(slab.categorySlug);
          logger.info(`Pricing already exists for category: ${slab.categorySlug}`);
          continue;
        }
      }

      const { categorySlug: _categorySlug, ...slabData } = slab;

      await VehiclePricing.create({
        ...slabData,
        categoryId,
      });

      logger.info(
        `Pricing slab created: ${slab.categorySlug} (${slab.minDistance}–${slab.maxDistance ?? "∞"} km)`
      );
    }

    logger.info("Vehicle fleet seeding completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error seeding vehicle fleet:", error);
    process.exit(1);
  }
};

seedVehicleFleet();
