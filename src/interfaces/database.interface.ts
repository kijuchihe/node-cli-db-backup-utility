export interface DatabaseConfig {
  type: 'mysql' | 'postgresql' | 'mongodb' | 'sqlite';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database: string;
  connectionString?: string;
}

export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  test(): Promise<boolean>;
  backup(options: BackupOptions): Promise<string>;
  restore(filePath: string, options: RestoreOptions): Promise<void>;
}

export interface BackupOptions {
  type: 'full' | 'incremental' | 'differential';
  compress: boolean;
  destination: string;
  excludeTables?: string[];
}

export interface RestoreOptions {
  selectedTables?: string[];
  overwrite?: boolean;
}
