import multer from "multer";
import type { RequestHandler } from "express";
import { AppError } from "@/shared/errors/AppError";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);

const normalizeMimeType = (mimetype: string) =>
  mimetype.split(";")[0].trim().toLowerCase();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const normalized = normalizeMimeType(file.mimetype);

    if (!ALLOWED_MIMES.has(normalized)) {
      cb(new AppError("Unsupported file type", 400));
      return;
    }

    file.mimetype = normalized;
    cb(null, true);
  },
});

export const communicationUploadSingle: RequestHandler = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      return next(new AppError(error.message, 400));
    }
    if (error) {
      return next(error);
    }
    next();
  });
};
