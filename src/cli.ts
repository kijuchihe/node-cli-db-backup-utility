#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import { MongoDBConnection } from './databases/mongodb.connection';
import { BackupService } from './services/backup.service';
import { DatabaseConfig } from './interfaces/database.interface';
import { StorageConfig } from './interfaces/storage.interface';
import { LocalStorageProvider } from './storage/local.storage';
import { S3StorageProvider } from './storage/s3.storage';
import { createLogger } from './utils/logger';

config(); // Load environment variables

const program = new Command();
const logger = createLogger('cli');

program
  .name('db-backup')
  .description('Database backup utility supporting multiple databases and storage options')
  .version('1.0.0');

program
  .command('backup')
  .description('Perform a database backup')
  .option('-t, --type <type>', 'Backup type (full|incremental|differential)', 'full')
  .option('-d, --database <database>', 'Database type (mongodb|mysql|postgresql|sqlite)', 'mongodb')
  .option('-h, --host <host>', 'Database host')
  .option('-p, --port <port>', 'Database port')
  .option('-u, --username <username>', 'Database username')
  .option('-w, --password <password>', 'Database password')
  .option('-n, --name <name>', 'Database name')
  .option('-c, --compress', 'Compress backup file', true)
  .option('-s, --storage <storage>', 'Storage type (local|s3)', 'local')
  .option('--storage-path <path>', 'Storage path or bucket name')
  .option('--aws-access-key <key>', 'AWS access key ID')
  .option('--aws-secret-key <key>', 'AWS secret access key')
  .option('--aws-region <region>', 'AWS region')
  .option('--slack-webhook <url>', 'Slack webhook URL for notifications')
  .action(async (options) => {
    try {
      // Configure database connection
      const dbConfig: DatabaseConfig = {
        type: options.database,
        host: options.host,
        port: parseInt(options.port),
        username: options.username,
        password: options.password,
        database: options.name
      };

      // Create database connection
      const dbConnection = new MongoDBConnection(dbConfig);

      // Configure storage
      let storageConfig: StorageConfig;
      let storageProvider;

      if (options.storage === 's3') {
        storageConfig = {
          type: 's3',
          credentials: {
            accessKeyId: options.awsAccessKey || process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: options.awsSecretKey || process.env.AWS_SECRET_ACCESS_KEY
          },
          bucket: options.storagePath,
          basePath: options.name
        };
        storageProvider = new S3StorageProvider(storageConfig);
      } else {
        storageConfig = {
          type: 'local',
          basePath: options.storagePath || './backups'
        };
        storageProvider = new LocalStorageProvider(storageConfig);
      }

      // Create backup service
      const backupService = new BackupService(
        dbConnection,
        storageProvider,
        storageConfig,
        options.slackWebhook || process.env.SLACK_WEBHOOK_URL
      );

      // Perform backup
      logger.info('Starting backup process', { type: options.type });
      const backupPath = await backupService.performBackup(options.type, options.compress);
      logger.info('Backup completed successfully', { path: backupPath });

    } catch (error) {
      logger.error('Backup failed', { error });
      process.exit(1);
    }
  });

program
  .command('restore')
  .description('Restore a database from backup')
  .option('-d, --database <database>', 'Database type (mongodb|mysql|postgresql|sqlite)', 'mongodb')
  .option('-h, --host <host>', 'Database host')
  .option('-p, --port <port>', 'Database port')
  .option('-u, --username <username>', 'Database username')
  .option('-w, --password <password>', 'Database password')
  .option('-n, --name <name>', 'Database name')
  .option('-f, --file <file>', 'Backup file path')
  .option('--overwrite', 'Overwrite existing data', false)
  .action(async (options) => {
    try {
      // Configure database connection
      const dbConfig: DatabaseConfig = {
        type: options.database,
        host: options.host,
        port: parseInt(options.port),
        username: options.username,
        password: options.password,
        database: options.name
      };

      // Create database connection
      const dbConnection = new MongoDBConnection(dbConfig);

      // Perform restore
      logger.info('Starting restore process', { file: options.file });
      await dbConnection.restore(options.file, { overwrite: options.overwrite });
      logger.info('Restore completed successfully');

    } catch (error) {
      logger.error('Restore failed', { error });
      process.exit(1);
    }
  });

program.parse();
