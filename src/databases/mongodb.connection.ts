import { MongoClient } from 'mongodb';
import { BaseDatabaseConnection } from '../core/database.connection';
import { BackupOptions, RestoreOptions } from '../interfaces/database.interface';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';

const execAsync = promisify(exec);

export class MongoDBConnection extends BaseDatabaseConnection {
  private client: MongoClient | null = null;

  async connect(): Promise<void> {
    try {
      const { host, port, username, password, database } = this.config;
      const uri = this.config.connectionString || 
        `mongodb://${username}:${password}@${host}:${port}/${database}`;
      
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.logger.info('Successfully connected to MongoDB');
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.logger.info('Disconnected from MongoDB');
    }
  }

  async test(): Promise<boolean> {
    try {
      if (!this.client) {
        await this.connect();
      }
      await this.client!.db().command({ ping: 1 });
      return true;
    } catch (error) {
      this.logger.error('MongoDB connection test failed', { error });
      return false;
    }
  }

  async backup(options: BackupOptions): Promise<string> {
    this.logBackupStart(options);
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `mongodb-backup-${timestamp}`;
      const backupPath = path.join(options.destination, backupFileName);
      
      // Create backup using mongodump
      const dumpCommand = this.buildMongoDumpCommand(backupPath);
      await execAsync(dumpCommand);
      
      if (options.compress) {
        // Compress the backup
        const compressedPath = `${backupPath}.gz`;
        await this.compressBackup(backupPath, compressedPath);
        await fs.rm(backupPath, { recursive: true });
        return compressedPath;
      }
      
      return backupPath;
    } catch (error) {
      this.logger.error('MongoDB backup failed', { error });
      throw error;
    }
  }

  async restore(filePath: string, options: RestoreOptions): Promise<void> {
    this.logRestoreStart(filePath, options);
    
    try {
      let restorePath = filePath;
      
      // If file is compressed, decompress it first
      if (filePath.endsWith('.gz')) {
        restorePath = filePath.slice(0, -3);
        await this.decompressBackup(filePath, restorePath);
      }
      
      // Restore using mongorestore
      const restoreCommand = this.buildMongoRestoreCommand(restorePath, options);
      await execAsync(restoreCommand);
      
      // Clean up decompressed files if needed
      if (filePath !== restorePath) {
        await fs.rm(restorePath, { recursive: true });
      }
      
      this.logger.info('MongoDB restore completed successfully');
    } catch (error) {
      this.logger.error('MongoDB restore failed', { error });
      throw error;
    }
  }

  private buildMongoDumpCommand(outputPath: string): string {
    const { host, port, username, password, database } = this.config;
    let command = 'mongodump';
    
    if (host) command += ` --host ${host}`;
    if (port) command += ` --port ${port}`;
    if (username) command += ` --username ${username}`;
    if (password) command += ` --password ${password}`;
    if (database) command += ` --db ${database}`;
    
    command += ` --out ${outputPath}`;
    return command;
  }

  private buildMongoRestoreCommand(inputPath: string, options: RestoreOptions): string {
    const { host, port, username, password, database } = this.config;
    let command = 'mongorestore';
    
    if (host) command += ` --host ${host}`;
    if (port) command += ` --port ${port}`;
    if (username) command += ` --username ${username}`;
    if (password) command += ` --password ${password}`;
    if (database) command += ` --db ${database}`;
    
    if (options.overwrite) {
      command += ' --drop';
    }
    
    command += ` ${inputPath}`;
    return command;
  }

  private async compressBackup(inputPath: string, outputPath: string): Promise<void> {
    const gzip = createGzip();
    const source = createReadStream(inputPath);
    const destination = createWriteStream(outputPath);
    
    await pipeline(source, gzip, destination);
  }

  private async decompressBackup(inputPath: string, outputPath: string): Promise<void> {
    const source = createReadStream(inputPath);
    const destination = createWriteStream(outputPath);
    const gunzip = createGzip();
    
    await pipeline(source, gunzip, destination);
  }
}
