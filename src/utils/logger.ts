import winston from 'winston';
import path from 'path';

export const createLogger = (context: string) => {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          context,
          message,
          ...meta
        });
      })
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error'
      }),
      new winston.transports.File({
        filename: path.join('logs', 'combined.log')
      })
    ]
  });
};
