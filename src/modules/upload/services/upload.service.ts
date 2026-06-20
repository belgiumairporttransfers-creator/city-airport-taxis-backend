import { uploadToCloudinary } from "@/infrastructure/storage/cloudinary";
import { UploadOptions } from "@/modules/upload/types/upload.types";
import { BadRequestError } from "@/shared/errors/AppError";

class UploadService {
  async uploadImage(
    file: Express.Multer.File,
    folder: string = "uploads",
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
}

export default new UploadService();
