import { Request, Response } from "express";
import uploadService from "../services/upload.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess, sendError } from "@/shared/utils/response";
import { sanitizeUploadFolder } from "../utils/upload-validation";

class UploadController {
  uploadImage = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      return sendError(res, "No file provided", 400);
    }
    const folder = sanitizeUploadFolder(req.body.folder);
    const result = await uploadService.uploadImage(file, folder);
    return sendSuccess(res, result, {
      message: "Image uploaded successfully",
    });
  });
}

export default new UploadController();
