import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function httpLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1e6;
    logger.http('HTTP request', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: durationMs.toFixed(2),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}
