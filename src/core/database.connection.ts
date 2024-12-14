import { DatabaseConfig, DatabaseConnection, BackupOptions, RestoreOptions } from '../interfaces/database.interface';
import { Logger } from 'winston';
import { createLogger } from '../utils/logger';

export abstract class BaseDatabaseConnection implements DatabaseConnection {
  protected config: DatabaseConfig;
  protected logger: Logger;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.logger = createLogger(`${config.type}-connection`);
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract test(): Promise<boolean>;
  abstract backup(options: BackupOptions): Promise<string>;
  abstract restore(filePath: string, options: RestoreOptions): Promise<void>;

  protected async validateConnection(): Promise<void> {
    try {
      const isConnected = await this.test();
      if (!isConnected) {
        throw new Error('Database connection test failed');
      }
    } catch (error) {
      this.logger.error('Connection validation failed', { error });
      throw error;
    }
  }

  protected logBackupStart(options: BackupOptions): void {
    this.logger.info('Starting database backup', {
      type: options.type,
      destination: options.destination,
      compress: options.compress
    });
  }

  protected logRestoreStart(filePath: string, options: RestoreOptions): void {
    this.logger.info('Starting database restore', {
      filePath,
      selectedTables: options.selectedTables,
      overwrite: options.overwrite
    });
  }
}
