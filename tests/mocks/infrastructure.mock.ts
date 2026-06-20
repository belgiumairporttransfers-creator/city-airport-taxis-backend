import { vi } from "vitest";

export const mockRedisClient = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  publish: vi.fn(),
  isOpen: true,
};

export const mockEmailService = {
  sendEmail: vi.fn().mockResolvedValue(true),
  pingHealth: vi.fn().mockResolvedValue({ status: "healthy" as const, latencyMs: 1 }),
};
