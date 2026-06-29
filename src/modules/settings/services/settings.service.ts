import settingsRepository, {
  GLOBAL_SETTINGS_KEY,
} from "@/modules/settings/repositories/settings.repository";
import { AppError } from "@/shared/errors/AppError";
import { cacheDel, cacheGet, cacheSet } from "@/infrastructure/redis/cache";
import type { ISettings } from "@/modules/settings/types/settings.types";

const PUBLIC_SETTINGS_CACHE_KEY = "settings:public:global";
const PUBLIC_SETTINGS_CACHE_TTL_SECONDS = 30;

export type PublicSettingsPayload = {
  maintenanceMode: boolean;
  comingSoonMode: boolean;
  minBookingMinutes: number;
  stopFee: number;
  cardProcessingFee: number;
  airportPickup: number;
  trainPickup: number;
  meetAndGreet: number;
  returnMeetAndGreet: number;
  waitingTimePricePerMinute: number;
  waitingTimePricePerHour: number;
};

class SettingsService {
  private buildPublicSettings(settings: ISettings): PublicSettingsPayload {
    return {
      maintenanceMode: settings.maintenanceMode,
      comingSoonMode: settings.comingSoonMode ?? false,
      minBookingMinutes: settings.minBookingMinutes ?? 120,
      stopFee: settings.stopFee ?? 0,
      cardProcessingFee: settings.cardProcessingFee ?? 0,
      airportPickup: settings.airportPickup ?? 0,
      trainPickup: settings.trainPickup ?? 0,
      meetAndGreet: settings.meetAndGreet ?? 0,
      returnMeetAndGreet: settings.returnMeetAndGreet ?? 0,
      waitingTimePricePerMinute: settings.waitingTimePricePerMinute ?? 0,
      waitingTimePricePerHour: settings.waitingTimePricePerHour ?? 0,
    };
  }

  private async getOrCreateSettings() {
    let settings = await settingsRepository.findByKey(GLOBAL_SETTINGS_KEY);

    if (!settings) {
      settings = await settingsRepository.create({
        maintenanceMode: false,
        comingSoonMode: false,
        paymentMode: "test",
        minBookingMinutes: 0,
        stopFee: 0,
        cardProcessingFee: 0,
        airportPickup: 0,
        trainPickup: 0,
        meetAndGreet: 0,
        returnMeetAndGreet: 0,
        waitingTimePricePerMinute: 0,
        waitingTimePricePerHour: 0,
      });
    }

    return settings;
  }

  async getSettings() {
    const settings = await this.getOrCreateSettings();
    return settings;
  }

  async getPublicSettings() {
    const cached = await cacheGet<PublicSettingsPayload>(PUBLIC_SETTINGS_CACHE_KEY);
    if (cached) {
      return cached;
    }

    const settings = await this.getOrCreateSettings();
    const payload = this.buildPublicSettings(settings);

    await cacheSet(PUBLIC_SETTINGS_CACHE_KEY, payload, PUBLIC_SETTINGS_CACHE_TTL_SECONDS);

    return payload;
  }

  async updateSettings(data: Record<string, unknown>, adminId: string) {
    const settings = await settingsRepository.findOneAndUpdate(GLOBAL_SETTINGS_KEY, {
      ...data,
      updatedBy: adminId,
    });

    if (!settings) {
      throw new AppError("Failed to update settings", 500);
    }

    await cacheDel(PUBLIC_SETTINGS_CACHE_KEY);

    return settings;
  }
}

export default new SettingsService();
