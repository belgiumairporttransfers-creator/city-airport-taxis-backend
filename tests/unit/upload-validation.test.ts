import { describe, expect, it } from "vitest";
import { sanitizeUploadFolder, matchesFileSignature } from "../../src/modules/upload/utils/upload-validation";

describe("upload validation", () => {
  it("sanitizes unsafe folder names", () => {
    expect(sanitizeUploadFolder("  Avatars/User Profile!  ")).toBe("avatars/user-profile");
    expect(sanitizeUploadFolder("")).toBe("uploads");
  });

  it("validates png signature", () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    expect(matchesFileSignature(pngHeader, "image/png")).toBe(true);
    expect(matchesFileSignature(pngHeader, "image/jpeg")).toBe(false);
  });
});
