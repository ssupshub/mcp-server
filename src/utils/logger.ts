import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from '../config/env.js';

const { combine, timestamp, errors, json, colorize, printf, splat } =
  winston.format;

// Human-readable format for development
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  splat(),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? ` ${JSON.stringify(meta)}`
      : '';
    return `${timestamp} [${level}]: ${stack ?? message}${metaStr}`;
  }),
);

// Structured JSON format for production / log aggregation
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  splat(),
  json(),
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  }),
];

if (env.NODE_ENV === 'production') {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: prodFormat,
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: prodFormat,
      zippedArchive: true,
    }),
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  silent: env.NODE_ENV === 'test',
  transports,
  exitOnError: false,
});

// Morgan-compatible HTTP stream
export const httpLogStream = {
  write: (message: string) => logger.http(message.trim()),
};
