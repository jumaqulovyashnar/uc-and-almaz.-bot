import app from './app.js';
import { env } from './config/env.js';
import { testConnection, pool } from './config/database.js';
import { testRedisConnection, redis } from './config/redis.js';
import { startBot } from './bot/bot.js';
import { purchaseWorker } from './workers/purchase.worker.js';

const PORT = parseInt(env.PORT, 10);

async function startServer() {
  console.log('[Server] Initializing CyberPay services...');

  // 1. Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('\n⚠️ [Server] Warning: Could not connect to PostgreSQL database.');
    console.error('👉 Please make sure PostgreSQL is running on port 5432 and credentials in .env are correct.');
    console.error('👉 Setup: docker compose up -d  (or install PostgreSQL locally)\n');
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  // 2. Test redis connection
  const redisConnected = await testRedisConnection();
  if (!redisConnected) {
    console.error('\n⚠️ [Server] Warning: Could not connect to Redis.');
    console.error('👉 Please make sure Redis is running on port 6379.');
    console.error('👉 Setup: docker compose up -d  (or install Redis locally)\n');
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }


  // 3. Start Telegram Bot
  try {
    await startBot();
  } catch (error) {
    console.error('[Server] Bot startup failed:', (error as Error).message);
  }

  // 4. Start Express HTTP Server
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Express API server running on port ${PORT} in ${env.NODE_ENV} mode`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`[Server] Received ${signal}. Starting graceful shutdown...`);
    
    // Close express server first
    server.close(() => {
      console.log('[Server] Express HTTP server stopped');
    });

    // Close BullMQ worker
    try {
      await purchaseWorker.close();
      console.log('[Server] BullMQ worker closed');
    } catch (err) {
      console.error('[Server] Error closing BullMQ worker:', (err as Error).message);
    }

    // Close Redis connection
    try {
      await redis.quit();
      console.log('[Server] Redis connection closed');
    } catch (err) {
      console.error('[Server] Error closing Redis connection:', (err as Error).message);
    }

    // Close PG pool
    try {
      await pool.end();
      console.log('[Server] PostgreSQL pool closed');
    } catch (err) {
      console.error('[Server] Error closing PostgreSQL pool:', (err as Error).message);
    }

    console.log('[Server] Graceful shutdown completed. Exiting process.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('[Server] Fatal startup error:', error);
  process.exit(1);
});
