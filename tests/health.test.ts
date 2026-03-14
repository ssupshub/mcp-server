import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as dbService from '../src/services/database.js';

// Mock the database service so tests don't need a real MongoDB
vi.mock('../src/services/database.js', () => ({
  db: {
    isConnected: () => true,
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

// Mock mongoose ping inside health controller
vi.mock('mongoose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('mongoose')>();
  return {
    ...actual,
    connection: {
      ...actual.connection,
      readyState: 1,
      db: {
        admin: () => ({ ping: vi.fn().mockResolvedValue({ ok: 1 }) }),
      },
    },
  };
});

const app = createApp();

describe('Health Endpoints', () => {
  it('GET /api/v1/health returns 200 with UP status', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.uptime).toBeTypeOf('number');
    expect(res.body.checks.database.status).toBe('UP');
    expect(res.body.checks.memory.status).toMatch(/UP|WARN/);
  });

  it('GET /api/v1/health/live returns 200', async () => {
    const res = await request(app).get('/api/v1/health/live').expect(200);
    expect(res.body.status).toBe('UP');
  });

  it('GET /api/v1/health/ready returns 200', async () => {
    const res = await request(app).get('/api/v1/health/ready').expect(200);
    expect(res.body.status).toBe('READY');
  });

  it('returns X-Request-Id header', async () => {
    const res = await request(app).get('/api/v1/health/live');
    expect(res.headers['x-request-id']).toBeDefined();
  });
});

describe('404 handler', () => {
  it('returns structured 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/unknown').expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
