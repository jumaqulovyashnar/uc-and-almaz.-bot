import time
import logging
import aiosqlite
import os
from typing import List, Dict, Any, Optional
from app.core.env import env

# Global connection instance
db: Optional[aiosqlite.Connection] = None

def get_db() -> aiosqlite.Connection:
    global db
    if db is None:
        raise RuntimeError("SQLite database connection has not been initialized. Call init_db() first.")
    return db

# SQLite database path (stored next to backend/)
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "cyberpay.db")

async def init_db() -> None:
    global db
    try:
        db = await aiosqlite.connect(DB_PATH)
        db.row_factory = aiosqlite.Row
        # Enable WAL mode for high concurrency
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")
        await db.commit()
        
        # Ensure provider columns exist
        try:
            await db.execute("ALTER TABLE orders ADD COLUMN provider_product_id TEXT")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE orders ADD COLUMN server_id TEXT")
        except Exception:
            pass
        await db.commit()

        # Create indexes for high-performance querying
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
            "CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)",
            "CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)",
        ]
        for idx_sql in indexes:
            try:
                await db.execute(idx_sql)
            except Exception as idx_err:
                logging.warning(f"[DB] Index creation notice: {idx_err}")
        await db.commit()
        
        logging.info(f"[DB] SQLite database initialized at {DB_PATH}")
    except Exception as e:
        logging.critical(f"[DB] SQLite initialization failed: {e}")
        raise e

async def close_db() -> None:
    global db
    if db:
        await db.close()
        db = None
        logging.info("[DB] SQLite connection closed")

async def execute(text: str, *args: Any) -> None:
    """Execute a statement (INSERT, UPDATE, DELETE, CREATE, etc.)."""
    global db
    if not db:
        raise RuntimeError("Database has not been initialized. Call init_db() first.")
    
    # For DDL statements with semicolons, execute each
    if any(kw in text.upper() for kw in ['CREATE TABLE', 'CREATE INDEX']):
        statements = [s.strip() for s in text.split(';') if s.strip()]
        for stmt in statements:
            await db.execute(stmt)
        await db.commit()
        return
    
    await db.execute(text, args)
    await db.commit()

async def query(text: str, *args: Any) -> List[Dict[str, Any]]:
    global db
    if not db:
        raise RuntimeError("Database has not been initialized. Call init_db() first.")
    
    start = time.time()
    try:
        async with db.execute(text, args) as cursor:
            columns = [description[0] for description in cursor.description] if cursor.description else []
            rows = await cursor.fetchall()
            duration = int((time.time() - start) * 1000)
            if env.NODE_ENV == "development":
                logging.info(f"[DB] Query executed in {duration}ms | rows: {len(rows)}")
            return [dict(zip(columns, row)) for row in rows]
    except Exception as error:
        duration = int((time.time() - start) * 1000)
        logging.error(f"[DB] Query failed after {duration}ms: {error}")
        raise error

async def query_row(text: str, *args: Any) -> Optional[Dict[str, Any]]:
    rows = await query(text, *args)
    return rows[0] if rows else None

async def fetchval(text: str, *args: Any) -> Any:
    """Fetch a single value from query result."""
    global db
    if not db:
        raise RuntimeError("Database has not been initialized. Call init_db() first.")
    
    async with db.execute(text, args) as cursor:
        row = await cursor.fetchone()
        return row[0] if row else None

async def test_connection() -> bool:
    global db
    if not db:
        try:
            await init_db()
        except Exception:
            return False
            
    try:
        async with db.execute("SELECT 1") as cursor:
            await cursor.fetchone()
        logging.info("[DB] SQLite PING successful")
        return True
    except Exception as e:
        logging.error(f"[DB] SQLite PING failed: {e}")
        return False
