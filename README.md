# Database Backup Utility

A powerful and flexible database backup utility that supports multiple database types and storage options. Built with TypeScript and follows object-oriented programming principles.

## Features

- Support for multiple database types (MongoDB, MySQL, PostgreSQL, SQLite)
- Multiple backup types (full, incremental, differential)
- Compression of backup files
- Multiple storage options (Local filesystem, AWS S3)
- Backup scheduling
- Logging and monitoring
- Slack notifications
- Restore capabilities

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/database-backup-utility.git

# Install dependencies
yarn install

# Build the project
yarn build
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=27017
DB_USERNAME=admin
DB_PASSWORD=password
DB_NAME=mydb

# AWS Configuration (if using S3)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Slack Configuration (optional)
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

## Usage

### Command Line Interface

The utility provides a CLI for performing backups and restores:

```bash
# Perform a backup
yarn backup --type full --database mongodb --host localhost --port 27017 --username admin --password password --name mydb --compress --storage local --storage-path ./backups

# Restore from backup
yarn restore --database mongodb --host localhost --port 27017 --username admin --password password --name mydb --file ./backups/backup.gz
```

### Backup Options

- `--type`: Backup type (full|incremental|differential)
- `--database`: Database type (mongodb|mysql|postgresql|sqlite)
- `--host`: Database host
- `--port`: Database port
- `--username`: Database username
- `--password`: Database password
- `--name`: Database name
- `--compress`: Compress backup file
- `--storage`: Storage type (local|s3)
- `--storage-path`: Storage path or bucket name
- `--aws-access-key`: AWS access key ID
- `--aws-secret-key`: AWS secret access key
- `--aws-region`: AWS region
- `--slack-webhook`: Slack webhook URL for notifications

### Restore Options

- `--database`: Database type (mongodb|mysql|postgresql|sqlite)
- `--host`: Database host
- `--port`: Database port
- `--username`: Database username
- `--password`: Database password
- `--name`: Database name
- `--file`: Backup file path
- `--overwrite`: Overwrite existing data

## Project Structure

```
src/
├── backup/
├── core/
│   └── database.connection.ts
├── databases/
│   └── mongodb.connection.ts
├── interfaces/
│   ├── database.interface.ts
│   └── storage.interface.ts
├── restore/
├── services/
│   └── backup.service.ts
├── storage/
│   ├── local.storage.ts
│   └── s3.storage.ts
├── utils/
│   └── logger.ts
└── cli.ts
```

## Development

### Adding New Database Support

1. Create a new connection class in `src/databases/` that extends `BaseDatabaseConnection`
2. Implement the required methods: `connect()`, `disconnect()`, `test()`, `backup()`, and `restore()`

### Adding New Storage Provider

1. Create a new storage provider class in `src/storage/` that implements `StorageProvider`
2. Implement the required methods: `upload()`, `download()`, `delete()`, and `list()`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
