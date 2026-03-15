import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MongoServerError } from 'mongodb';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
    stack?: string;
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown;

  // Known operational errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  }

  // Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = err.flatten();
  }

  // MongoDB duplicate key
  else if (err instanceof MongoServerError && err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    message = 'A record with that value already exists';
  }

  // MongoDB cast errors (e.g. bad ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid resource identifier';
  }

  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // Log unexpected errors with full stack
  if (statusCode >= 500) {
    logger.error('Unhandled error', {
      requestId: req.requestId,
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  const body: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      requestId: req.requestId,
      ...(details !== undefined ? { details } : {}),
      ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  };

  res.status(statusCode).json(body);
}

// 404 catch-all (must be registered AFTER all routes)
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.requestId,
    },
  });
}
