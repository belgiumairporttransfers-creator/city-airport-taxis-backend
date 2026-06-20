const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const MIME_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46],
    [0x57, 0x45, 0x42, 0x50],
  ],
};

const DEFAULT_UPLOAD_FOLDER = "uploads";

export const matchesFileSignature = (buffer: Buffer, mimeType: string): boolean => {
  const signatures = MIME_SIGNATURES[mimeType];
  if (!signatures) {
    return false;
  }

  if (mimeType === "image/webp") {
    const hasRiff = signatures[0].every((byte, index) => buffer[index] === byte);
    const hasWebp =
      buffer.length >= 12 && signatures[1].every((byte, index) => buffer[index + 8] === byte);
    return hasRiff && hasWebp;
  }

  return signatures.some((signature) => signature.every((byte, index) => buffer[index] === byte));
};

export const sanitizeUploadFolder = (folder: unknown): string => {
  if (typeof folder !== "string" || folder.trim().length === 0) {
    return DEFAULT_UPLOAD_FOLDER;
  }

  const sanitized = folder
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9/_-]/g, "")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, 80);

  return sanitized || DEFAULT_UPLOAD_FOLDER;
};

export const isAllowedUploadMimeType = (mimeType: string): boolean =>
  ALLOWED_MIME_TYPES.has(mimeType);

export { ALLOWED_MIME_TYPES, DEFAULT_UPLOAD_FOLDER };
