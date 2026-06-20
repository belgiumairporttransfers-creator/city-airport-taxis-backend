import multer from "multer";
import { Request, type RequestHandler } from "express";
import { AppError } from "@/shared/errors/AppError";
import { isAllowedUploadMimeType, matchesFileSignature } from "../utils/upload-validation";

const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!isAllowedUploadMimeType(file.mimetype)) {
    return cb(new AppError("File type not supported. Allowed types: JPEG, PNG, WebP.", 400));
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

export const uploadSingle = (fieldName: string = "file"): RequestHandler => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        return next(new AppError(error.message, 400));
      }
      if (error) {
        return next(error);
      }

      if (req.file && !matchesFileSignature(req.file.buffer, req.file.mimetype)) {
        return next(new AppError("File content does not match the declared file type", 400));
      }

      next();
    });
  };
};
