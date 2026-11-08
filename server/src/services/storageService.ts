import fs from 'fs';
import path from 'path';

export interface FileStorageResult {
  fileName: string;
  fileUrl: string;
  sizeBytes: number;
}

export class StorageService {
  private static uploadBaseDir = path.join(__dirname, '../../uploads/reports');

  private static ensureUploadDir() {
    if (!fs.existsSync(this.uploadBaseDir)) {
      fs.mkdirSync(this.uploadBaseDir, { recursive: true });
    }
  }

  static getFilePath(fileNameOrUrl: string): string {
    const filename = path.basename(fileNameOrUrl);
    return path.join(this.uploadBaseDir, filename);
  }

  static fileExists(fileNameOrUrl: string): boolean {
    const fullPath = this.getFilePath(fileNameOrUrl);
    return fs.existsSync(fullPath);
  }

  static createReadStream(fileNameOrUrl: string): fs.ReadStream {
    const fullPath = this.getFilePath(fileNameOrUrl);
    return fs.createReadStream(fullPath);
  }

  static async saveFile(originalName: string, buffer: Buffer): Promise<FileStorageResult> {
    this.ensureUploadDir();
    const ext = path.extname(originalName) || '.pdf';
    const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${base}_${Date.now()}${ext}`;
    const destination = path.join(this.uploadBaseDir, fileName);

    await fs.promises.writeFile(destination, buffer);

    return {
      fileName,
      fileUrl: `/uploads/reports/${fileName}`,
      sizeBytes: buffer.length
    };
  }

  static async deleteFile(fileNameOrUrl: string): Promise<boolean> {
    try {
      const fullPath = this.getFilePath(fileNameOrUrl);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}
