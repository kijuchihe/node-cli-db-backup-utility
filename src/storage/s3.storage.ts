import { StorageProvider, StorageConfig } from '../interfaces/storage.interface';
import { createLogger } from '../utils/logger';
import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';

export class S3StorageProvider implements StorageProvider {
  private logger = createLogger('s3-storage');
  private s3: AWS.S3;
  private bucket: string;

  constructor(private config: StorageConfig) {
    if (!config.bucket) {
      throw new Error('S3 bucket name is required');
    }

    this.bucket = config.bucket;
    
    AWS.config.update({
      accessKeyId: config.credentials?.accessKeyId,
      secretAccessKey: config.credentials?.secretAccessKey,
      region: 'us-east-1' // Default region, can be overridden by AWS_REGION env var
    });

    this.s3 = new AWS.S3();
  }

  async upload(filePath: string, destination: string): Promise<string> {
    try {
      const fileStream = fs.createReadStream(filePath);
      
      const params = {
        Bucket: this.bucket,
        Key: destination,
        Body: fileStream
      };

      const result = await this.s3.upload(params).promise();
      this.logger.info('File uploaded successfully to S3', { destination: result.Location });
      
      return result.Location;
    } catch (error) {
      this.logger.error('S3 upload failed', { error });
      throw error;
    }
  }

  async download(remotePath: string, localPath: string): Promise<void> {
    try {
      const directory = path.dirname(localPath);
      fs.mkdirSync(directory, { recursive: true });

      const params = {
        Bucket: this.bucket,
        Key: remotePath
      };

      const fileStream = fs.createWriteStream(localPath);
      const s3Stream = this.s3.getObject(params).createReadStream();

      return new Promise((resolve, reject) => {
        s3Stream
          .pipe(fileStream)
          .on('error', (error) => {
            this.logger.error('S3 download stream error', { error });
            reject(error);
          })
          .on('finish', () => {
            this.logger.info('File downloaded successfully from S3', { localPath });
            resolve();
          });
      });
    } catch (error) {
      this.logger.error('S3 download failed', { error });
      throw error;
    }
  }

  async delete(remotePath: string): Promise<void> {
    try {
      const params = {
        Bucket: this.bucket,
        Key: remotePath
      };

      await this.s3.deleteObject(params).promise();
      this.logger.info('File deleted successfully from S3', { path: remotePath });
    } catch (error) {
      this.logger.error('S3 deletion failed', { error });
      throw error;
    }
  }

  async list(prefix?: string): Promise<string[]> {
    try {
      const params = {
        Bucket: this.bucket,
        Prefix: prefix
      };

      const objects: string[] = [];
      let continuationToken: string | undefined;

      do {
        const response = await this.s3
          .listObjectsV2({
            ...params,
            ContinuationToken: continuationToken
          })
          .promise();

        response.Contents?.forEach((object) => {
          if (object.Key) {
            objects.push(object.Key);
          }
        });

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return objects;
    } catch (error) {
      this.logger.error('S3 list operation failed', { error });
      throw error;
    }
  }
}
