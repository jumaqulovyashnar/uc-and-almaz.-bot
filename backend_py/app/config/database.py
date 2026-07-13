import time
import logging
import asyncpg
from typing import List, Dict, Any, Optional
from app.config.env import env

# Global pool instance
pool: Optional[asyncpg.Pool] = None

async def init_db() -> None:
    global pool
    try:
        pool = await asyncpg.create_pool(
            dsn=env.DATABASE_URL,
            min_size=5,
            max_size=20,
            timeout=5.0,
            command_timeout=60.0
        )
        logging.info("[DB] PostgreSQL connection pool initialized successfully")
    except Exception as e:
        logging.error(f"[DB] PostgreSQL initialization failed: {e}")
        raise e

async def close_db() -> None:
    global pool
    if pool:
        await pool.close()
        logging.info("[DB] PostgreSQL connection pool closed")

async def query(text: str, *args: Any) -> List[Dict[str, Any]]:
    global pool
    if not pool:
        raise RuntimeError("Database pool has not been initialized. Call init_db() first.")
    
    start = time.time()
    try:
        async with pool.acquire() as connection:
            # Execute the query
            rows = await connection.fetch(text, *args)
            duration = int((time.time() - start) * 1000)
            if env.NODE_ENV == "development":
                logging.info(f"[DB] Query executed in {duration}ms | rows: {len(rows)}")
            # Convert Record objects to ordinary dicts
            return [dict(row) for row in rows]
    except Exception as error:
        duration = int((time.time() - start) * 1000)
        logging.error(f"[DB] Query failed after {duration}ms: {error}")
        raise error

async def query_row(text: str, *args: Any) -> Optional[Dict[str, Any]]:
    rows = await query(text, *args)
    return rows[0] if rows else None

async def test_connection() -> bool:
    global pool
    # If pool is not initialized, try creating it temporarily
    temp_pool = False
    if not pool:
        try:
            temp_pool = True
            await init_db()
        except Exception:
            return False
            
    try:
        async with pool.acquire() as connection:
            await connection.execute("SELECT 1")
        logging.info("[DB] PostgreSQL PING successful")
        return True
    except Exception as e:
        logging.error(f"[DB] PostgreSQL PING failed: {e}")
        return False
    finally:
        if temp_pool:
            await close_db()
