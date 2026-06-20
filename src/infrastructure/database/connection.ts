import mongoose from "mongoose";
import { env } from "@/config/env";
import logger from "@/shared/utils/logger";

mongoose.set("bufferCommands", false);

if (!mongoose.connection.listeners("error").length) {
  mongoose.connection.on("error", (err) => {
    logger.error(`MongoDB connection error: ${err}`);
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB reconnected");
  });

  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connected");
  });
}

const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  if (mongoose.connection.readyState === 2) {
    return new Promise((resolve, reject) => {
      mongoose.connection.once("connected", () => resolve());
      mongoose.connection.once("error", (err) => reject(err));
    });
  }

  if (!env.MONGODB_URI) {
    throw new Error("MongoDB URI is not defined in environment variables");
  }

  const options: mongoose.ConnectOptions = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  };

  try {
    await mongoose.connect(env.MONGODB_URI, options);
    logger.info(`MongoDB Connected: ${mongoose.connection.host}`);

    try {
      const { ensureDatabaseIndexes } = await import("@/infrastructure/database/indexes/indexes");
      await ensureDatabaseIndexes();
      logger.info("Database indexes synchronized");
    } catch (indexError) {
      logger.warn("Database index sync skipped or failed", { error: indexError });
    }
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error}`);
    throw error;
  }
};

export default connectDB;
