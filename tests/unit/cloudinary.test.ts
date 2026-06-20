import { describe, expect, it, vi, beforeEach } from "vitest";

const uploadMock = vi.fn();
const pingMock = vi.fn();

vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    uploader: { upload: (...args: unknown[]) => uploadMock(...args) },
    api: { ping: (...args: unknown[]) => pingMock(...args) },
  },
}));

describe("cloudinary storage", () => {
  beforeEach(async () => {
    vi.resetModules();
    uploadMock.mockReset();
    pingMock.mockReset();
  });

  it("uploads image buffer to cloudinary", async () => {
    uploadMock.mockResolvedValue({
      secure_url: "https://res.cloudinary.com/demo/image.png",
      public_id: "demo/image",
    });

    const { uploadToCloudinary } = await import("@/infrastructure/storage/cloudinary");
    const result = await uploadToCloudinary(
      {
        buffer: Buffer.from("png"),
        mimetype: "image/png",
      } as Express.Multer.File,
      { folder: "uploads" }
    );

    expect(result.success).toBe(true);
    expect(result.url).toContain("cloudinary.com");
  });

  it("returns unhealthy when ping fails", async () => {
    pingMock.mockRejectedValue(new Error("offline"));

    const { pingStorageHealth } = await import("@/infrastructure/storage/cloudinary");
    const health = await pingStorageHealth();

    expect(health.status).toBe("unhealthy");
  });
});
