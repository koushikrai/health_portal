"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class StorageService {
    static uploadBaseDir = path_1.default.join(__dirname, '../../uploads/reports');
    static ensureUploadDir() {
        if (!fs_1.default.existsSync(this.uploadBaseDir)) {
            fs_1.default.mkdirSync(this.uploadBaseDir, { recursive: true });
        }
    }
    static getFilePath(fileNameOrUrl) {
        const filename = path_1.default.basename(fileNameOrUrl);
        return path_1.default.join(this.uploadBaseDir, filename);
    }
    static fileExists(fileNameOrUrl) {
        const fullPath = this.getFilePath(fileNameOrUrl);
        return fs_1.default.existsSync(fullPath);
    }
    static createReadStream(fileNameOrUrl) {
        const fullPath = this.getFilePath(fileNameOrUrl);
        return fs_1.default.createReadStream(fullPath);
    }
    static async saveFile(originalName, buffer) {
        this.ensureUploadDir();
        const ext = path_1.default.extname(originalName) || '.pdf';
        const base = path_1.default.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `${base}_${Date.now()}${ext}`;
        const destination = path_1.default.join(this.uploadBaseDir, fileName);
        await fs_1.default.promises.writeFile(destination, buffer);
        return {
            fileName,
            fileUrl: `/uploads/reports/${fileName}`,
            sizeBytes: buffer.length
        };
    }
    static async deleteFile(fileNameOrUrl) {
        try {
            const fullPath = this.getFilePath(fileNameOrUrl);
            if (fs_1.default.existsSync(fullPath)) {
                await fs_1.default.promises.unlink(fullPath);
                return true;
            }
            return false;
        }
        catch {
            return false;
        }
    }
}
exports.StorageService = StorageService;
