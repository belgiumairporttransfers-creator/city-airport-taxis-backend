import { describe, expect, it, vi, beforeEach } from "vitest";
import uploadService from "@/modules/upload/services/upload.service";
import { BadRequestError } from "@/shared/errors/AppError";

const uploadMock = vi.fn();

vi.mock("@/infrastructure/storage/cloudinary", () => ({
  uploadToCloudinary: (...args: unknown[]) => uploadMock(...args),
}));

const createFile = (mimetype: string, name: string) =>
  ({
    buffer: Buffer.from("fake"),
    mimetype,
    originalname: name,
  }) as Express.Multer.File;

describe("uploadService", () => {
  beforeEach(() => {
    uploadMock.mockReset();
  });

  it("returns uploaded image metadata", async () => {
    uploadMock.mockResolvedValue({
      success: true,
      url: "https://cdn.example.com/img.png",
      public_id: "img-id",
    });

    const result = await uploadService.uploadImage(createFile("image/png", "test.png"), "avatars");

    expect(result.url).toBe("https://cdn.example.com/img.png");
    expect(uploadMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        folder: "avatars",
        resource_type: "image",
      })
    );
  });

  it("uploads images with image resource type", async () => {
    uploadMock.mockResolvedValue({
      success: true,
      url: "https://cdn.example.com/img.jpg",
      public_id: "img-id",
    });

    await uploadService.uploadDocument(createFile("image/jpeg", "license.jpg"), "driver-applications");

    expect(uploadMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        folder: "driver-applications",
        resource_type: "image",
      })
    );
  });

  it("uploads PDFs with raw resource type", async () => {
    uploadMock.mockResolvedValue({
      success: true,
      url: "https://cdn.example.com/doc.pdf",
      public_id: "doc-id",
    });

    await uploadService.uploadDocument(createFile("application/pdf", "license.pdf"), "driver-applications");

    expect(uploadMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        folder: "driver-applications",
        resource_type: "raw",
      })
    );
    expect(uploadMock.mock.calls[0][1]).not.toHaveProperty("transformation");
  });

  it("throws when cloudinary upload fails", async () => {
    uploadMock.mockResolvedValue({ success: false, error: "Upload failed" });

    await expect(
      uploadService.uploadImage(createFile("image/png", "test.png"))
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});
