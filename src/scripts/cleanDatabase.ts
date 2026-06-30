import mongoose from "mongoose";
import { env } from "@/config/env";
import logger from "@/shared/utils/logger";

const PRESERVED_COLLECTIONS = new Set(["admins"]);

const cleanDatabase = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info("Connected to MongoDB for database cleanup");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB connection is not ready");
    }

    const collections = await db.listCollections().toArray();
    let clearedCollections = 0;
    let preservedCollections = 0;

    for (const { name } of collections) {
      if (PRESERVED_COLLECTIONS.has(name)) {
        preservedCollections += 1;
        const adminCount = await db.collection(name).countDocuments();
        logger.info(`Preserved collection "${name}" (${adminCount} document(s))`);
        continue;
      }

      const result = await db.collection(name).deleteMany({});
      clearedCollections += 1;
      logger.info(`Cleared collection "${name}" (${result.deletedCount} document(s) removed)`);
    }

    // Remove legacy collection from the old DriverApplication model if it still exists.
    const legacyDriverCollections = ["driverapplications"];
    for (const legacyName of legacyDriverCollections) {
      const exists = collections.some((collection) => collection.name === legacyName);
      if (exists) {
        const result = await db.collection(legacyName).deleteMany({});
        logger.info(
          `Cleared legacy collection "${legacyName}" (${result.deletedCount} document(s) removed)`
        );
      }
    }

    logger.info("Database cleanup completed", {
      clearedCollections,
      preservedCollections,
      preserved: [...PRESERVED_COLLECTIONS],
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error("Database cleanup failed", error);
    process.exit(1);
  }
};

cleanDatabase();
