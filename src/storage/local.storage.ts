import { StorageProvider, StorageConfig } from '../interfaces/storage.interface';
import { createLogger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

export class LocalStorageProvider implements StorageProvider {
  private logger = createLogger('local-storage');
  private basePath: string;

  constructor(private config: StorageConfig) {
    this.basePath = config.basePath || './backups';
  }

  async upload(filePath: string, destination: string): Promise<string> {
    try {
      const fullPath = path.join(this.basePath, destination);
      const directory = path.dirname(fullPath);

      // Create directory if it doesn't exist
      await fs.mkdir(directory, { recursive: true });

      // Copy file to destination
      await fs.copyFile(filePath, fullPath);

      this.logger.info('File uploaded successfully', { destination: fullPath });
      return fullPath;
    } catch (error) {
      this.logger.error('File upload failed', { error });
      throw error;
    }
  }

  async download(remotePath: string, localPath: string): Promise<void> {
    try {
      const fullRemotePath = path.join(this.basePath, remotePath);
      const directory = path.dirname(localPath);

      // Create directory if it doesn't exist
      await fs.mkdir(directory, { recursive: true });

      // Copy file to local path
      await fs.copyFile(fullRemotePath, localPath);

      this.logger.info('File downloaded successfully', { localPath });
    } catch (error) {
      this.logger.error('File download failed', { error });
      throw error;
    }
  }

  async delete(remotePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.basePath, remotePath);
      await fs.unlink(fullPath);
      this.logger.info('File deleted successfully', { path: fullPath });
    } catch (error) {
      this.logger.error('File deletion failed', { error });
      throw error;
    }
  }

  async list(prefix?: string): Promise<string[]> {
    try {
      const searchPath = prefix 
        ? path.join(this.basePath, prefix)
        : this.basePath;

      const files = await this.listFilesRecursively(searchPath);
      return files.map(file => path.relative(this.basePath, file));
    } catch (error) {
      this.logger.error('Failed to list files', { error });
      throw error;
    }
  }

  private async listFilesRecursively(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.listFilesRecursively(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // Directory doesn't exist, return empty array
        return [];
      }
      throw error;
    }

    return files;
  }
}
