import mongoose from "mongoose";
import { VehicleCategory } from "@/infrastructure/database/models/VehicleCategory";
import { VehiclePricing } from "@/infrastructure/database/models/VehiclePricing";
import { env } from "@/config/env";
import logger from "@/shared/utils/logger";
import { sampleVehiclePricing } from "@/scripts/data/vehicle-pricing.samples";

const seedVehiclePricing = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info("Connected to MongoDB for vehicle pricing seeding");

    const categories = await VehicleCategory.find().lean();
    const categoryIdBySlug = new Map(
      categories.map((category) => [category.slug, category._id.toString()])
    );

    const skippedCategories = new Set<string>();
    const checkedCategories = new Set<string>();

    for (const slab of sampleVehiclePricing) {
      const categoryId = categoryIdBySlug.get(slab.categorySlug);

      if (!categoryId) {
        logger.warn(`Skipping pricing slab: category not found for slug "${slab.categorySlug}"`);
        continue;
      }

      if (skippedCategories.has(slab.categorySlug)) {
        continue;
      }

      if (!checkedCategories.has(slab.categorySlug)) {
        checkedCategories.add(slab.categorySlug);
        const existingCount = await VehiclePricing.countDocuments({ categoryId });

        if (existingCount > 0) {
          skippedCategories.add(slab.categorySlug);
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

    logger.info("Vehicle pricing seeding completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error seeding vehicle pricing:", error);
    process.exit(1);
  }
};

seedVehiclePricing();
