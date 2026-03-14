import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

export class DatabaseService {
  private static instance: DatabaseService;
  private retryCount = 0;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<void> {
    // Register event handlers once
    mongoose.connection.on('connected', () =>
      logger.info('MongoDB connected', { uri: this.sanitizeUri(env.DB_URI) }),
    );
    mongoose.connection.on('error', (err) =>
      logger.error('MongoDB connection error', { error: err.message }),
    );
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected — will attempt reconnect');
    });

    await this.connectWithRetry();
  }

  private async connectWithRetry(): Promise<void> {
    try {
      await mongoose.connect(env.DB_URI, {
        maxPoolSize: env.DB_POOL_SIZE,
        serverSelectionTimeoutMS: env.DB_CONNECT_TIMEOUT_MS,
        socketTimeoutMS: 45000,
        family: 4, // Force IPv4
      });
      this.retryCount = 0;
    } catch (err) {
      if (this.retryCount < MAX_RETRIES) {
        this.retryCount++;
        logger.warn(
          `MongoDB connection failed (attempt ${this.retryCount}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms…`,
          { error: (err as Error).message },
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        return this.connectWithRetry();
      }
      logger.error('MongoDB connection failed after maximum retries', {
        error: (err as Error).message,
      });
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected gracefully');
  }

  isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  private sanitizeUri(uri: string): string {
    try {
      const u = new URL(uri);
      u.password = '***';
      return u.toString();
    } catch {
      return '[redacted]';
    }
  }
}

export const db = DatabaseService.getInstance();
