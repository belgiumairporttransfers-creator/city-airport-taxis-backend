import { describe, expect, it, vi, beforeEach } from "vitest";
import newsletterService from "@/modules/newsletter/services/newsletter.service";
import newsletterRepository from "@/modules/newsletter/repositories/newsletter.repository";

vi.mock("@/modules/newsletter/repositories/newsletter.repository", () => ({
  default: {
    findByEmail: vi.fn(),
    create: vi.fn(),
    findWithPagination: vi.fn(),
    deleteById: vi.fn(),
    deleteManyByIds: vi.fn(),
  },
}));

describe("newsletterService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing subscriber without creating duplicate", async () => {
    const existing = { email: "a@example.com" };
    vi.mocked(newsletterRepository.findByEmail).mockResolvedValue(existing as never);

    const result = await newsletterService.subscribe({ email: "A@Example.com" });

    expect(result).toBe(existing);
    expect(newsletterRepository.create).not.toHaveBeenCalled();
  });

  it("creates a new subscriber", async () => {
    vi.mocked(newsletterRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(newsletterRepository.create).mockResolvedValue({ email: "new@example.com" } as never);

    const result = await newsletterService.subscribe({ email: "new@example.com" });

    expect(newsletterRepository.create).toHaveBeenCalledWith({
      email: "new@example.com",
      source: "coming-soon",
    });
    expect(result.email).toBe("new@example.com");
  });
});
