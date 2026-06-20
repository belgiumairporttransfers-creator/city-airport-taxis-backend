import { describe, expect, it, vi, beforeEach } from "vitest";
import authService from "@/modules/auth/services/auth.service";
import adminRepository from "@/modules/auth/repositories/admin.repository";
import authActivityService from "@/modules/auth/services/auth-activity.service";

vi.mock("@/modules/auth/repositories/admin.repository", () => ({
  default: {
    findById: vi.fn(),
    save: vi.fn(),
  },
}));

vi.mock("@/modules/auth/services/auth-activity.service", () => ({
  default: {
    log: vi.fn(),
  },
}));

describe("authService updateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates allowed admin profile fields", async () => {
    const admin = {
      firstName: "Old",
      lastName: "Name",
      save: vi.fn(),
    };

    vi.mocked(adminRepository.findById).mockResolvedValue(admin as never);
    vi.mocked(adminRepository.save).mockResolvedValue(admin as never);

    const updated = await authService.updateProfile(
      "admin-id",
      { firstName: "New" },
      { ip: "127.0.0.1", userAgent: "test" }
    );

    expect(updated.firstName).toBe("New");
    expect(authActivityService.log).toHaveBeenCalledWith(
      "admin-id",
      "admin",
      expect.any(Object),
      "update_profile"
    );
  });
});
