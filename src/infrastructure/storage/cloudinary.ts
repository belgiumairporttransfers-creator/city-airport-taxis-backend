import { v2 as cloudinary } from "cloudinary";
import { env } from "@/config/env";
import logger from "@/shared/utils/logger";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

import { UploadResult, UploadOptions } from "@/modules/upload/types/upload.types";
export const uploadToCloudinary = async (
  file: Express.Multer.File,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  try {
    const {
      folder = "uploads",
      resource_type = "image",
      transformation,
      public_id,
      overwrite = true,
      invalidate = true,
    } = options;
    const base64 = file.buffer.toString("base64");
    const dataURI = `data:${file.mimetype};base64,${base64}`;
    const uploadOptions: Record<string, unknown> = {
      folder,
      resource_type,
      public_id,
      overwrite,
      invalidate,
    };

    if (transformation) {
      uploadOptions.transformation = transformation;
    }

    const result = await cloudinary.uploader.upload(dataURI, uploadOptions);

    logger.info(`File uploaded successfully: ${result.public_id}`);

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown upload error";
    logger.error(`Cloudinary upload error: ${message}`);
    return {
      success: false,
      error: "Upload failed",
    };
  }
};

export default cloudinary;

export const pingStorageHealth = async (): Promise<{
  status: "healthy" | "unhealthy";
  latencyMs?: number;
  error?: string;
}> => {
  const start = Date.now();
  try {
    await cloudinary.api.ping();
    return { status: "healthy", latencyMs: Date.now() - start };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Storage provider unreachable";
    return { status: "unhealthy", latencyMs: Date.now() - start, error: message };
  }
};
