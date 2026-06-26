const ALLOWED_DRIVER_DOCUMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MIME_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46],
    [0x57, 0x45, 0x42, 0x50],
  ],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
};

export const isAllowedDriverDocumentMimeType = (mimeType: string): boolean =>
  ALLOWED_DRIVER_DOCUMENT_MIME_TYPES.has(mimeType);

export const matchesDriverDocumentSignature = (buffer: Buffer, mimeType: string): boolean => {
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

export const DRIVER_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export { ALLOWED_DRIVER_DOCUMENT_MIME_TYPES };
