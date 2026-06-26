import { uploadToCloudinary } from "@/infrastructure/storage/cloudinary";
import { UploadOptions } from "@/modules/upload/types/upload.types";
import { BadRequestError } from "@/shared/errors/AppError";

const IMAGE_TRANSFORMATION = [
  {
    quality: "auto",
    fetch_format: "auto",
  },
];

class UploadService {
  private resolveResourceType(mimetype: string): "image" | "raw" {
    return mimetype === "application/pdf" ? "raw" : "image";
  }

  private async upload(
    file: Express.Multer.File,
    folder: string,
    options?: Partial<UploadOptions>
  ) {
    if (!file) {
      throw new BadRequestError("No file provided");
    }

    const result = await uploadToCloudinary(file, {
      folder,
      ...options,
    });

    if (!result.success || !result.url || !result.public_id) {
      throw new BadRequestError(result.error || "Upload failed");
    }

    return {
      url: result.url,
      public_id: result.public_id,
    };
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = "uploads",
    options?: Partial<UploadOptions>
  ) {
    return this.upload(file, folder, {
      resource_type: "image",
      transformation: IMAGE_TRANSFORMATION,
      ...options,
    });
  }

  async uploadDocument(
    file: Express.Multer.File,
    folder: string = "uploads",
    options?: Partial<UploadOptions>
  ) {
    const resourceType = this.resolveResourceType(file.mimetype);

    return this.upload(file, folder, {
      resource_type: resourceType,
      ...(resourceType === "image" ? { transformation: IMAGE_TRANSFORMATION } : {}),
      ...options,
    });
  }
}

export default new UploadService();
