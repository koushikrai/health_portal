import fs from 'fs';
import path from 'path';

export interface SystemSettings {
  slotExpiryDays: number; // Number of days before pre-booked slots disappear (default: 7)
  autoExpireSlots: boolean; // Whether auto-expiry is active (default: true)
  slotExpiryBasis: 'CREATED_DATE' | 'NEED_BY_DATE'; // Calculation basis (default: CREATED_DATE)
  autoArchiveCompleted: boolean; // Whether completed allocations auto-archive (default: true)
  lastUpdated: string;
  updatedBy: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  slotExpiryDays: 7,
  autoExpireSlots: true,
  slotExpiryBasis: 'CREATED_DATE',
  autoArchiveCompleted: true,
  lastUpdated: new Date().toISOString(),
  updatedBy: 'System Default'
};

const SETTINGS_FILE_PATH = path.join(__dirname, '../../data/system_settings.json');

export class SettingsService {
  private static cachedSettings: SystemSettings | null = null;

  private static ensureDir() {
    const dir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  static async getSettings(): Promise<SystemSettings> {
    try {
      if (this.cachedSettings) {
        return this.cachedSettings;
      }

      this.ensureDir();
      if (!fs.existsSync(SETTINGS_FILE_PATH)) {
        fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
        this.cachedSettings = { ...DEFAULT_SETTINGS };
        return this.cachedSettings;
      }

      const content = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      const loaded: SystemSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        slotExpiryDays: Number(parsed.slotExpiryDays) || 7
      };
      this.cachedSettings = loaded;
      return loaded;
    } catch (e) {
      console.error('Error reading system_settings.json, falling back to defaults:', e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  static async updateSettings(
    partial: Partial<SystemSettings>,
    updatedBy: string = 'Administrator'
  ): Promise<SystemSettings> {
    try {
      const current = await this.getSettings();
      const updated: SystemSettings = {
        ...current,
        ...partial,
        slotExpiryDays: partial.slotExpiryDays !== undefined ? Math.max(1, Math.min(365, Number(partial.slotExpiryDays))) : current.slotExpiryDays,
        lastUpdated: new Date().toISOString(),
        updatedBy
      };

      this.ensureDir();
      fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
      this.cachedSettings = updated;
      return updated;
    } catch (e) {
      console.error('Error updating system_settings.json:', e);
      throw new Error('Failed to persist system settings to disk');
    }
  }
}
