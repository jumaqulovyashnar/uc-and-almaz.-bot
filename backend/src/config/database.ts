import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err: Error) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development') {
      console.log(`[DB] Query executed in ${duration}ms | rows: ${result.rowCount}`);
    }
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[DB] Query failed after ${duration}ms:`, (error as Error).message);
    throw error;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT NOW()');
    console.log('[DB] PostgreSQL connected successfully');
    return true;
  } catch (error) {
    console.error('[DB] PostgreSQL connection failed:', (error as Error).message);
    return false;
  }
}
