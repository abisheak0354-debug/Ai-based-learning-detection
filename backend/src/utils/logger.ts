import winston from 'winston';
import { env } from '../config/env';

export const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) =>
      `${timestamp} [${level.toUpperCase()}] ${message}`,
    ),
  ),
  transports: [new winston.transports.Console()],
});