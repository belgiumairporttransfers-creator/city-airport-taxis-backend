import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/redis/cache", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDel: vi.fn(),
}));

vi.mock("@/modules/settings/repositories/settings.repository", () => ({
  default: {
    findByKey: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
  GLOBAL_SETTINGS_KEY: "global",
}));

import settingsService from "@/modules/settings/services/settings.service";
import settingsRepository from "@/modules/settings/repositories/settings.repository";
import { cacheGet, cacheSet, cacheDel } from "@/infrastructure/redis/cache";

const mockSettings = {
  maintenanceMode: false,
  comingSoonMode: true,
  minBookingMinutes: 120,
  stopFee: 5,
  cardProcessingFee: 2,
  airportPickup: 10,
  trainPickup: 8,
  meetAndGreet: 15,
  returnMeetAndGreet: 12,
  waitingTimePricePerMinute: 1,
  waitingTimePricePerHour: 50,
  toObject: () => ({}),
};

describe("SettingsService caching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached public settings on cache hit", async () => {
    const cachedPayload = {
      maintenanceMode: true,
      comingSoonMode: false,
      minBookingMinutes: 60,
      stopFee: 0,
      cardProcessingFee: 0,
      airportPickup: 0,
      trainPickup: 0,
      meetAndGreet: 0,
      returnMeetAndGreet: 0,
      waitingTimePricePerMinute: 0,
      waitingTimePricePerHour: 0,
    };

    vi.mocked(cacheGet).mockResolvedValue(cachedPayload);

    const result = await settingsService.getPublicSettings();

    expect(result).toEqual(cachedPayload);
    expect(settingsRepository.findByKey).not.toHaveBeenCalled();
    expect(cacheSet).not.toHaveBeenCalled();
  });

  it("loads from database and caches on cache miss", async () => {
    vi.mocked(cacheGet).mockResolvedValue(null);
    vi.mocked(settingsRepository.findByKey).mockResolvedValue(mockSettings as never);

    const result = await settingsService.getPublicSettings();

    expect(result.maintenanceMode).toBe(false);
    expect(result.comingSoonMode).toBe(true);
    expect(result.minBookingMinutes).toBe(120);
    expect(cacheSet).toHaveBeenCalledWith(
      "settings:public:global",
      expect.objectContaining({ comingSoonMode: true }),
      30
    );
  });

  it("invalidates public settings cache on update", async () => {
    vi.mocked(settingsRepository.findOneAndUpdate).mockResolvedValue(mockSettings as never);

    await settingsService.updateSettings({ stopFee: 10 }, "admin-id");

    expect(cacheDel).toHaveBeenCalledWith("settings:public:global");
  });

  it("creates default settings when none exist", async () => {
    vi.mocked(cacheGet).mockResolvedValue(null);
    vi.mocked(settingsRepository.findByKey).mockResolvedValue(null);
    vi.mocked(settingsRepository.create).mockResolvedValue(mockSettings as never);

    const result = await settingsService.getPublicSettings();

    expect(settingsRepository.create).toHaveBeenCalled();
    expect(result.comingSoonMode).toBe(true);
  });
});
