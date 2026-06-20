import { describe, expect, it } from "vitest";
import { JwtUtil } from "@/modules/auth/utils/jwt";

describe("JwtUtil", () => {
  const payload = {
    id: "507f1f77bcf86cd799439011",
    role: "admin",
    type: "admin" as const,
  };

  it("generates and verifies access tokens", () => {
    const token = JwtUtil.generateAccessToken(payload);
    const decoded = JwtUtil.verifyAccessToken(token);

    expect(decoded.id).toBe(payload.id);
    expect(decoded.type).toBe("admin");
  });

  it("hashes refresh tokens consistently", () => {
    expect(JwtUtil.hashToken("abc")).toHaveLength(64);
    expect(JwtUtil.hashToken("abc")).toBe(JwtUtil.hashToken("abc"));
  });
});
