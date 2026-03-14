import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'express-async-errors'; // patches async errors into Express error handler

import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { httpLogger } from './middleware/httpLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/health.js';
import serviceRoutes from './routes/services.js';

export function createApp(): Application {
  const app = express();

  // ── Trust proxy (for correct IPs behind ALB/nginx)
  app.set('trust proxy', 1);

  // ── Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // ── CORS
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
      maxAge: 86400,
    }),
  );

  // ── Global rate limit
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: (req) => req.path === `/api/${env.API_VERSION}/health/live`,
      message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      },
    }),
  );

  // ── Body parsing & compression
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(compression());

  // ── Request tracing + structured HTTP logging
  app.use(requestIdMiddleware);
  app.use(httpLogger);

  // ── Routes
  const base = `/api/${env.API_VERSION}`;
  app.use(`${base}/health`, healthRoutes);
  app.use(`${base}/services`, serviceRoutes);

  // ── Error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
