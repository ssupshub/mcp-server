import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info'),
  DB_URI: z
    .string()
    .url()
    .default('mongodb://localhost:27017/mcp'),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),
  DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().default(5000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().default(100),
  CORS_ORIGINS: z
    .string()
    .default('*')
    .transform((val) => (val === '*' ? '*' : val.split(',').map((s) => s.trim()))),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().default(30000),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().default(10000),
  API_VERSION: z.string().default('v1'),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error(
      '❌  Invalid environment configuration:\n',
      result.error.format(),
    );
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
export type { Env };
