import prisma from '../prisma';

export interface SystemSettings {
  slotExpiryDays: number;
  autoExpireSlots: boolean;
  slotExpiryBasis: 'CREATED_DATE' | 'NEED_BY_DATE';
  autoArchiveCompleted: boolean;
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

export class SettingsService {
  private static cachedSettings: SystemSettings | null = null;
  private static lastCacheTime = 0;
  private static CACHE_TTL_MS = 60_000; // 1 minute in-memory cache

  static async getSettings(): Promise<SystemSettings> {
    const now = Date.now();
    if (this.cachedSettings && (now - this.lastCacheTime < this.CACHE_TTL_MS)) {
      return this.cachedSettings;
    }

    try {
      let record = await prisma.systemSetting.findUnique({
        where: { id: 'SYSTEM_DEFAULT' }
      });

      if (!record) {
        record = await prisma.systemSetting.create({
          data: {
            id: 'SYSTEM_DEFAULT',
            slotExpiryDays: DEFAULT_SETTINGS.slotExpiryDays,
            autoExpireSlots: DEFAULT_SETTINGS.autoExpireSlots,
            slotExpiryBasis: DEFAULT_SETTINGS.slotExpiryBasis,
            autoArchiveCompleted: DEFAULT_SETTINGS.autoArchiveCompleted,
            updatedBy: DEFAULT_SETTINGS.updatedBy
          }
        });
      }

      const settings: SystemSettings = {
        slotExpiryDays: record.slotExpiryDays,
        autoExpireSlots: record.autoExpireSlots,
        slotExpiryBasis: (record.slotExpiryBasis as any) || 'CREATED_DATE',
        autoArchiveCompleted: record.autoArchiveCompleted,
        lastUpdated: record.updatedAt.toISOString(),
        updatedBy: record.updatedBy
      };

      this.cachedSettings = settings;
      this.lastCacheTime = now;
      return settings;
    } catch (e) {
      console.warn('[SettingsService] Database query fallback:', e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  static async updateSettings(
    partial: Partial<SystemSettings>,
    updatedBy: string = 'Administrator'
  ): Promise<SystemSettings> {
    const current = await this.getSettings();
    const expiryDays = partial.slotExpiryDays !== undefined
      ? Math.max(1, Math.min(365, Number(partial.slotExpiryDays)))
      : current.slotExpiryDays;

    const updated = await prisma.systemSetting.upsert({
      where: { id: 'SYSTEM_DEFAULT' },
      update: {
        slotExpiryDays: expiryDays,
        autoExpireSlots: partial.autoExpireSlots !== undefined ? Boolean(partial.autoExpireSlots) : current.autoExpireSlots,
        slotExpiryBasis: partial.slotExpiryBasis || current.slotExpiryBasis,
        autoArchiveCompleted: partial.autoArchiveCompleted !== undefined ? Boolean(partial.autoArchiveCompleted) : current.autoArchiveCompleted,
        updatedBy
      },
      create: {
        id: 'SYSTEM_DEFAULT',
        slotExpiryDays: expiryDays,
        autoExpireSlots: partial.autoExpireSlots !== undefined ? Boolean(partial.autoExpireSlots) : true,
        slotExpiryBasis: partial.slotExpiryBasis || 'CREATED_DATE',
        autoArchiveCompleted: partial.autoArchiveCompleted !== undefined ? Boolean(partial.autoArchiveCompleted) : true,
        updatedBy
      }
    });

    const settings: SystemSettings = {
      slotExpiryDays: updated.slotExpiryDays,
      autoExpireSlots: updated.autoExpireSlots,
      slotExpiryBasis: (updated.slotExpiryBasis as any) || 'CREATED_DATE',
      autoArchiveCompleted: updated.autoArchiveCompleted,
      lastUpdated: updated.updatedAt.toISOString(),
      updatedBy: updated.updatedBy
    };

    this.cachedSettings = settings;
    this.lastCacheTime = Date.now();
    return settings;
  }
}
