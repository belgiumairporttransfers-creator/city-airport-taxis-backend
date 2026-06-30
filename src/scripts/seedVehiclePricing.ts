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

    const deletedPricing = await VehiclePricing.deleteMany({});
    logger.info(`Cleared existing pricing data (${deletedPricing.deletedCount ?? 0} slabs)`);

    const categories = await VehicleCategory.find().lean();
    const categoryIdBySlug = new Map(
      categories.map((category) => [category.slug, category._id.toString()])
    );

    let created = 0;

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

      created += 1;
    }

    logger.info(`Vehicle pricing seeding completed — ${created} slabs created`);
    process.exit(0);
  } catch (error) {
    logger.error("Error seeding vehicle pricing:", error);
    process.exit(1);
  }
};

seedVehiclePricing();
