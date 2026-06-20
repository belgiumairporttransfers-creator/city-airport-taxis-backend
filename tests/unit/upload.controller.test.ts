import { describe, expect, it, vi } from "vitest";
import { createMockRequest, createMockResponse } from "../helpers/express";

const uploadServiceMock = {
  uploadImage: vi.fn(),
};

vi.mock("@/modules/upload/services/upload.service", () => ({
  default: uploadServiceMock,
}));

describe("upload controller", () => {
  it("returns 400 when no file is uploaded", async () => {
    const { default: uploadController } = await import(
      "@/modules/upload/controllers/upload.controller"
    );

    const req = createMockRequest({ file: undefined, body: {} });
    const res = createMockResponse();
    const next = vi.fn();

    await uploadController.uploadImage(req, res, next);

    expect(res.statusCode).toBe(400);
  });

  it("uploads image and returns success payload", async () => {
    uploadServiceMock.uploadImage.mockResolvedValue({
      url: "https://cdn.example.com/a.png",
      public_id: "a",
    });

    const { default: uploadController } = await import(
      "@/modules/upload/controllers/upload.controller"
    );

    const req = createMockRequest({
      file: { originalname: "a.png" },
      body: { folder: "avatars" },
    });
    const res = createMockResponse();
    const next = vi.fn();

    await uploadController.uploadImage(req, res, next);

    expect(uploadServiceMock.uploadImage).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});
