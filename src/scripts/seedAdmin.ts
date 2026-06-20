import mongoose from "mongoose";
import { Admin } from "@/infrastructure/database/models/Admin";
import { env } from "@/config/env";
import logger from "@/shared/utils/logger";

const getSeedConfig = () => {
  const email = process.env.SEED_ADMIN_EMAIL || env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const firstName = process.env.SEED_ADMIN_FIRST_NAME || "Super";
  const lastName = process.env.SEED_ADMIN_LAST_NAME || "Admin";

  if (!password) {
    throw new Error(
      "SEED_ADMIN_PASSWORD is required. Set it in your environment before running the seed script."
    );
  }

  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters.");
  }

  return { email, password, firstName, lastName };
};

const seedAdmin = async () => {
  try {
    const { email, password, firstName, lastName } = getSeedConfig();

    await mongoose.connect(env.MONGODB_URI);
    logger.info("Connected to MongoDB for seeding");

    const adminExists = await Admin.findOne({ email });

    if (adminExists) {
      logger.info(`Admin already exists for ${email}`);
      process.exit(0);
    }

    await Admin.create({
      firstName,
      lastName,
      email,
      password,
      role: "admin",
    });

    logger.info(`Admin seeded successfully for ${email}`);
    process.exit(0);
  } catch (error) {
    logger.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
