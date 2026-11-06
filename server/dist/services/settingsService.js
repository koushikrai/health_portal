"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DEFAULT_SETTINGS = {
    slotExpiryDays: 7,
    autoExpireSlots: true,
    slotExpiryBasis: 'CREATED_DATE',
    autoArchiveCompleted: true,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'System Default'
};
const SETTINGS_FILE_PATH = path_1.default.join(__dirname, '../../data/system_settings.json');
class SettingsService {
    static cachedSettings = null;
    static ensureDir() {
        const dir = path_1.default.dirname(SETTINGS_FILE_PATH);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
    static async getSettings() {
        try {
            if (this.cachedSettings) {
                return this.cachedSettings;
            }
            this.ensureDir();
            if (!fs_1.default.existsSync(SETTINGS_FILE_PATH)) {
                fs_1.default.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
                this.cachedSettings = { ...DEFAULT_SETTINGS };
                return this.cachedSettings;
            }
            const content = fs_1.default.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
            const parsed = JSON.parse(content);
            const loaded = {
                ...DEFAULT_SETTINGS,
                ...parsed,
                slotExpiryDays: Number(parsed.slotExpiryDays) || 7
            };
            this.cachedSettings = loaded;
            return loaded;
        }
        catch (e) {
            console.error('Error reading system_settings.json, falling back to defaults:', e);
            return { ...DEFAULT_SETTINGS };
        }
    }
    static async updateSettings(partial, updatedBy = 'Administrator') {
        try {
            const current = await this.getSettings();
            const updated = {
                ...current,
                ...partial,
                slotExpiryDays: partial.slotExpiryDays !== undefined ? Math.max(1, Math.min(365, Number(partial.slotExpiryDays))) : current.slotExpiryDays,
                lastUpdated: new Date().toISOString(),
                updatedBy
            };
            this.ensureDir();
            fs_1.default.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
            this.cachedSettings = updated;
            return updated;
        }
        catch (e) {
            console.error('Error updating system_settings.json:', e);
            throw new Error('Failed to persist system settings to disk');
        }
    }
}
exports.SettingsService = SettingsService;
