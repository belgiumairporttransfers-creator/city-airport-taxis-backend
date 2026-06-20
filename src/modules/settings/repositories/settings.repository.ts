import { Settings } from "@/infrastructure/database/models/Settings";

export const GLOBAL_SETTINGS_KEY = "global";

class SettingsRepository {
  findByKey(key: string = GLOBAL_SETTINGS_KEY) {
    return Settings.findOne({ key });
  }

  create(data: Record<string, unknown>) {
    return Settings.create({ key: GLOBAL_SETTINGS_KEY, ...data });
  }

  findOneAndUpdate(key: string, data: Record<string, unknown>) {
    return Settings.findOneAndUpdate({ key }, data, { new: true });
  }
}

export default new SettingsRepository();
