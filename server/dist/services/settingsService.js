"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const DEFAULT_SETTINGS = {
    slotExpiryDays: 7,
    autoExpireSlots: true,
    slotExpiryBasis: 'CREATED_DATE',
    autoArchiveCompleted: true,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'System Default'
};
class SettingsService {
    static cachedSettings = null;
    static lastCacheTime = 0;
    static CACHE_TTL_MS = 60_000; // 1 minute in-memory cache
    static async getSettings() {
        const now = Date.now();
        if (this.cachedSettings && (now - this.lastCacheTime < this.CACHE_TTL_MS)) {
            return this.cachedSettings;
        }
        try {
            let record = await prisma_1.default.systemSetting.findUnique({
                where: { id: 'SYSTEM_DEFAULT' }
            });
            if (!record) {
                record = await prisma_1.default.systemSetting.create({
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
            const settings = {
                slotExpiryDays: record.slotExpiryDays,
                autoExpireSlots: record.autoExpireSlots,
                slotExpiryBasis: record.slotExpiryBasis || 'CREATED_DATE',
                autoArchiveCompleted: record.autoArchiveCompleted,
                lastUpdated: record.updatedAt.toISOString(),
                updatedBy: record.updatedBy
            };
            this.cachedSettings = settings;
            this.lastCacheTime = now;
            return settings;
        }
        catch (e) {
            console.warn('[SettingsService] Database query fallback:', e);
            return { ...DEFAULT_SETTINGS };
        }
    }
    static async updateSettings(partial, updatedBy = 'Administrator') {
        const current = await this.getSettings();
        const expiryDays = partial.slotExpiryDays !== undefined
            ? Math.max(1, Math.min(365, Number(partial.slotExpiryDays)))
            : current.slotExpiryDays;
        const updated = await prisma_1.default.systemSetting.upsert({
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
        const settings = {
            slotExpiryDays: updated.slotExpiryDays,
            autoExpireSlots: updated.autoExpireSlots,
            slotExpiryBasis: updated.slotExpiryBasis || 'CREATED_DATE',
            autoArchiveCompleted: updated.autoArchiveCompleted,
            lastUpdated: updated.updatedAt.toISOString(),
            updatedBy: updated.updatedBy
        };
        this.cachedSettings = settings;
        this.lastCacheTime = Date.now();
        return settings;
    }
}
exports.SettingsService = SettingsService;
