import multer from "multer";
import { Request, type RequestHandler } from "express";
import { AppError } from "@/shared/errors/AppError";
import {
  DRIVER_DOCUMENT_MAX_BYTES,
  isAllowedDriverDocumentMimeType,
  matchesDriverDocumentSignature,
} from "../utils/driver-document-validation";

const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!isAllowedDriverDocumentMimeType(file.mimetype)) {
    return cb(
      new AppError("File type not supported. Allowed types: PDF, JPEG, PNG, WebP.", 400)
    );
  }

  cb(null, true);
};

const driverDocumentUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: DRIVER_DOCUMENT_MAX_BYTES,
    files: 1,
  },
});

export const uploadDriverDocument = (fieldName: string = "file"): RequestHandler => {
  return (req, res, next) => {
    driverDocumentUpload.single(fieldName)(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        return next(new AppError(error.message, 400));
      }
      if (error) {
        return next(error);
      }

      if (req.file && !matchesDriverDocumentSignature(req.file.buffer, req.file.mimetype)) {
        return next(new AppError("File content does not match the declared file type", 400));
      }

      next();
    });
  };
};
