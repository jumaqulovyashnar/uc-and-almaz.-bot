import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1),
  BOT_USERNAME: z.string().default('top_DonateUzbot'),
  ADMIN_TELEGRAM_ID: z.string().default('6709001451'),
  WEBAPP_URL: z.string().default('https://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
});

export const env = envSchema.parse(process.env);
