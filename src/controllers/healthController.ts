import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { db } from '../services/database.js';
import { env } from '../config/env.js';

interface HealthStatus {
  status: 'UP' | 'DEGRADED' | 'DOWN';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: {
      status: 'UP' | 'DOWN';
      responseTimeMs?: number;
    };
    memory: {
      status: 'UP' | 'WARN';
      heapUsedMb: number;
      heapTotalMb: number;
      externalMb: number;
      rssM: number;
    };
  };
}

async function checkDatabase(): Promise<
  HealthStatus['checks']['database']
> {
  const start = Date.now();
  try {
    if (!db.isConnected()) throw new Error('Not connected');
    // Ping the database to verify it is actually reachable
    await mongoose.connection.db?.admin().ping();
    return { status: 'UP', responseTimeMs: Date.now() - start };
  } catch {
    return { status: 'DOWN' };
  }
}

function checkMemory(): HealthStatus['checks']['memory'] {
  const mem = process.memoryUsage();
  const heapUsedMb = +(mem.heapUsed / 1024 / 1024).toFixed(2);
  const heapTotalMb = +(mem.heapTotal / 1024 / 1024).toFixed(2);
  const usagePercent = heapUsedMb / heapTotalMb;

  return {
    status: usagePercent > 0.9 ? 'WARN' : 'UP',
    heapUsedMb,
    heapTotalMb,
    externalMb: +(mem.external / 1024 / 1024).toFixed(2),
    rssM: +(mem.rss / 1024 / 1024).toFixed(2),
  };
}

/** GET /api/v1/health — full health report (liveness + readiness) */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  const [dbStatus, memStatus] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkMemory()),
  ]);

  const overallStatus: HealthStatus['status'] =
    dbStatus.status === 'DOWN'
      ? 'DEGRADED'
      : memStatus.status === 'WARN'
        ? 'DEGRADED'
        : 'UP';

  const httpStatus = overallStatus === 'DOWN' ? 503 : 200;

  const payload: HealthStatus = {
    status: overallStatus,
    version: env.API_VERSION,
    uptime: +process.uptime().toFixed(3),
    timestamp: new Date().toISOString(),
    checks: {
      database: dbStatus,
      memory: memStatus,
    },
  };

  res.status(httpStatus).json(payload);
}

/** GET /api/v1/health/live — Kubernetes liveness probe (fast, no DB check) */
export function livenessProbe(_req: Request, res: Response): void {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
}

/** GET /api/v1/health/ready — Kubernetes readiness probe */
export async function readinessProbe(
  _req: Request,
  res: Response,
): Promise<void> {
  const dbStatus = await checkDatabase();
  if (dbStatus.status === 'DOWN') {
    res
      .status(503)
      .json({ status: 'NOT_READY', reason: 'database unavailable' });
    return;
  }
  res.status(200).json({ status: 'READY', timestamp: new Date().toISOString() });
}
