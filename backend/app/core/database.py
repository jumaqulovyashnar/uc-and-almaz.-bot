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
        raise RuntimeError("Database connection has not been initialized. Call init_db() first.")
    return db

# SQLite database path (stored next to backend/)
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "cyberpay.db")

async def init_db() -> None:
    global db
    try:
        db = await aiosqlite.connect(DB_PATH)
        db.row_factory = aiosqlite.Row
        # Enable WAL mode for better concurrent access
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")
        await db.commit()
        logging.info(f"[DB] SQLite database initialized at {DB_PATH}")
    except Exception as e:
        logging.error(f"[DB] SQLite initialization failed: {e}")
        raise e

async def close_db() -> None:
    global db
    if db:
        await db.close()
        db = None
        logging.info("[DB] SQLite connection closed")

def _convert_query(text: str) -> str:
    """Convert PostgreSQL $1, $2 style params to SQLite ? style."""
    import re
    # Replace $1, $2, etc. with ?
    return re.sub(r'\$\d+', '?', text)

def _convert_types_for_sqlite(text: str) -> str:
    """Convert PostgreSQL-specific types to SQLite equivalents for CREATE TABLE."""
    replacements = {
        'SERIAL PRIMARY KEY': 'INTEGER PRIMARY KEY AUTOINCREMENT',
        'BIGINT': 'INTEGER',
        'VARCHAR(255)': 'TEXT',
        'VARCHAR(100)': 'TEXT',
        'VARCHAR(50)': 'TEXT',
        'VARCHAR(20)': 'TEXT',
        'VARCHAR(10)': 'TEXT',
        'DECIMAL(12,2)': 'REAL',
        'DECIMAL(5,2)': 'REAL',
        'BOOLEAN': 'INTEGER',
        'TIMESTAMP WITH TIME ZONE': 'TEXT',
        'JSONB': 'TEXT',
    }
    result = text
    for pg_type, sqlite_type in replacements.items():
        result = result.replace(pg_type, sqlite_type)
    # Remove DEFAULT NOW() and replace with CURRENT_TIMESTAMP
    result = result.replace("DEFAULT NOW()", "DEFAULT CURRENT_TIMESTAMP")
    return result

async def execute(text: str, *args: Any) -> None:
    """Execute a statement (INSERT, UPDATE, DELETE, CREATE, etc.)."""
    global db
    if not db:
        raise RuntimeError("Database has not been initialized. Call init_db() first.")
    
    converted = _convert_query(text)
    # For DDL statements, also convert types
    if any(kw in converted.upper() for kw in ['CREATE TABLE', 'CREATE INDEX']):
        converted = _convert_types_for_sqlite(converted)
        # SQLite doesn't support multiple statements in one execute
        # Split by semicolons and execute each
        statements = [s.strip() for s in converted.split(';') if s.strip()]
        for stmt in statements:
            await db.execute(stmt)
        await db.commit()
        return
    
    await db.execute(converted, args)
    await db.commit()

async def query(text: str, *args: Any) -> List[Dict[str, Any]]:
    global db
    if not db:
        raise RuntimeError("Database has not been initialized. Call init_db() first.")
    
    start = time.time()
    try:
        converted = _convert_query(text)
        async with db.execute(converted, args) as cursor:
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
    """Fetch a single value (like asyncpg's fetchval)."""
    global db
    if not db:
        raise RuntimeError("Database has not been initialized. Call init_db() first.")
    
    converted = _convert_query(text)
    async with db.execute(converted, args) as cursor:
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
