import { describe, expect, it, vi, beforeEach } from "vitest";
import uploadService from "@/modules/upload/services/upload.service";
import { BadRequestError } from "@/shared/errors/AppError";

const uploadMock = vi.fn();

vi.mock("@/infrastructure/storage/cloudinary", () => ({
  uploadToCloudinary: (...args: unknown[]) => uploadMock(...args),
}));

const file = {
  buffer: Buffer.from("fake"),
  mimetype: "image/png",
  originalname: "test.png",
} as Express.Multer.File;

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

    const result = await uploadService.uploadImage(file, "avatars");

    expect(result.url).toBe("https://cdn.example.com/img.png");
    expect(uploadMock).toHaveBeenCalledWith(file, expect.objectContaining({ folder: "avatars" }));
  });

  it("throws when cloudinary upload fails", async () => {
    uploadMock.mockResolvedValue({ success: false, error: "Upload failed" });

    await expect(uploadService.uploadImage(file)).rejects.toBeInstanceOf(BadRequestError);
  });
});
