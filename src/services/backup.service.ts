import { DatabaseConnection } from '../interfaces/database.interface';
import { StorageProvider, StorageConfig } from '../interfaces/storage.interface';
import { createLogger } from '../utils/logger';
import path from 'path';
import { IncomingWebhook } from '@slack/webhook';

export class BackupService {
  private logger = createLogger('backup-service');
  private slackWebhook?: IncomingWebhook;

  constructor(
    private database: DatabaseConnection,
    private storage: StorageProvider,
    private storageConfig: StorageConfig,
    slackWebhookUrl?: string
  ) {
    if (slackWebhookUrl) {
      this.slackWebhook = new IncomingWebhook(slackWebhookUrl);
    }
  }

  async performBackup(
    type: 'full' | 'incremental' | 'differential',
    compress = true,
    excludeTables?: string[]
  ): Promise<string> {
    const startTime = new Date();
    let backupPath: string;

    try {
      // Create temporary backup directory
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const tempDir = path.join('temp', timestamp);

      // Perform database backup
      backupPath = await this.database.backup({
        type,
        compress,
        destination: tempDir,
        excludeTables
      });

      // Upload to storage
      const remotePath = await this.uploadToStorage(backupPath, timestamp);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Log success
      this.logger.info('Backup completed successfully', {
        type,
        duration,
        remotePath
      });

      // Send notification if configured
      await this.sendNotification({
        status: 'success',
        type,
        duration,
        remotePath
      });

      return remotePath;
    } catch (error) {
      this.logger.error('Backup failed', { error });

      // Send notification for failure
      await this.sendNotification({
        status: 'failure',
        type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  private async uploadToStorage(localPath: string, timestamp: string): Promise<string> {
    const filename = path.basename(localPath);
    const remotePath = path.join(
      this.storageConfig.basePath || '',
      timestamp,
      filename
    );

    await this.storage.upload(localPath, remotePath);
    return remotePath;
  }

  private async sendNotification(data: {
    status: 'success' | 'failure';
    type: string;
    duration?: number;
    remotePath?: string;
    error?: string;
  }): Promise<void> {
    if (!this.slackWebhook) return;

    try {
      const message = data.status === 'success'
        ? {
          text: 'Database Backup Completed Successfully',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Database Backup Completed Successfully*\n
                    • Type: ${data.type}
                    • Duration: ${data.duration}ms
                    • Remote Path: \`${data.remotePath}\``
              }
            }
          ]
        }
        : {
          text: 'Database Backup Failed',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Database Backup Failed*\n
                    • Type: ${data.type}
                    • Error: ${data.error}`
              }
            }
          ]
        };

      await this.slackWebhook.send(message);
    } catch (error) {
      this.logger.error('Failed to send Slack notification', { error });
    }
  }
}
