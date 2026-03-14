import http from 'node:http';
import gracefulShutdown from 'http-graceful-shutdown';
import { createApp } from './app.js';
import { db } from './services/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function bootstrap(): Promise<void> {
  // Connect database before accepting traffic
  await db.connect();

  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`MCP Server started`, {
      port: env.PORT,
      env: env.NODE_ENV,
      apiVersion: env.API_VERSION,
      pid: process.pid,
    });
  });

  // ── Graceful shutdown: drains keep-alive connections, closes DB
  gracefulShutdown(server, {
    timeout: env.SHUTDOWN_TIMEOUT_MS,
    signals: 'SIGTERM SIGINT',
    onShutdown: async () => {
      logger.info('Shutting down — closing database connection…');
      await db.disconnect();
    },
    finally: () => {
      logger.info('Server stopped.');
    },
  });

  // ── Unhandled rejection guard
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      reason: String(reason),
    });
    // Let process manager (k8s) restart the pod cleanly
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });
}

bootstrap().catch((err: unknown) => {
  logger.error('Failed to start server', {
    error: (err as Error).message,
    stack: (err as Error).stack,
  });
  process.exit(1);
});
