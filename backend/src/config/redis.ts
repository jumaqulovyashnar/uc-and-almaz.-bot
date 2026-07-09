import { Redis } from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {

  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times: number): number | null {
    if (times > 10) {
      console.error('[Redis] Max retries reached, giving up');
      return null;
    }
    const delay = Math.min(times * 200, 5000);
    console.log(`[Redis] Retrying connection in ${delay}ms (attempt ${times})`);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redis.on('error', (err: Error) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('close', () => {
  console.log('[Redis] Connection closed');
});

export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    console.log('[Redis] PING successful');
    return true;
  } catch (error) {
    console.error('[Redis] PING failed:', (error as Error).message);
    return false;
  }
}
