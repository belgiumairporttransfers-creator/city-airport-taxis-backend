import { describe, expect, it, vi, beforeEach } from "vitest";
import authSessionService from "@/modules/auth/services/auth-session.service";
import sessionRepository from "@/modules/auth/repositories/session.repository";
import { JwtUtil } from "@/modules/auth/utils/jwt";

vi.mock("@/modules/auth/repositories/session.repository", () => ({
  default: {
    create: vi.fn(),
    findOneAndUpdateRefreshToken: vi.fn(),
    invalidateAllForUser: vi.fn(),
    invalidateByRefreshToken: vi.fn(),
    invalidateAllForUser: vi.fn(),
    findValidForUser: vi.fn(),
    revokeById: vi.fn(),
    findValidSessionIds: vi.fn(),
    invalidateByIds: vi.fn(),
  },
}));

describe("authSessionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a session with parsed device metadata", async () => {
    vi.mocked(sessionRepository.findValidSessionIds).mockResolvedValue([]);
    vi.mocked(sessionRepository.create).mockResolvedValue({ _id: "session-1" } as never);

    const refreshToken = JwtUtil.generateRefreshToken({
      id: "507f1f77bcf86cd799439011",
      role: "admin",
      type: "admin",
    });

    const session = await authSessionService.create(
      "507f1f77bcf86cd799439011",
      "admin",
      refreshToken,
      { ip: "127.0.0.1", userAgent: "Mozilla/5.0" }
    );

    expect(session._id).toBe("session-1");
    expect(sessionRepository.create).toHaveBeenCalled();
  });

  it("invalidates all sessions when refresh token reuse is detected", async () => {
    const refreshToken = JwtUtil.generateRefreshToken({
      id: "507f1f77bcf86cd799439011",
      role: "user",
      type: "user",
    });

    vi.mocked(sessionRepository.findOneAndUpdateRefreshToken).mockResolvedValue(null);

    await expect(
      authSessionService.rotate(refreshToken, "user", async () => ({
        id: "507f1f77bcf86cd799439011",
        role: "user",
        type: "user",
      }))
    ).rejects.toThrow("Invalid or compromised refresh token");

    expect(sessionRepository.invalidateAllForUser).toHaveBeenCalled();
  });
});
