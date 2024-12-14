export interface StorageConfig {
  type: 'local' | 's3' | 'gcs' | 'azure';
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    connectionString?: string;
  };
  bucket?: string;
  container?: string;
  basePath?: string;
}

export interface StorageProvider {
  upload(filePath: string, destination: string): Promise<string>;
  download(remotePath: string, localPath: string): Promise<void>;
  delete(path: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}
