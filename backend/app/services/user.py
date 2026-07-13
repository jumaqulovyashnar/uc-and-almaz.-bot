import logging
from typing import Optional, Dict, Any
from app.config.database import query_row, query, execute

async def find_by_telegram_id(telegram_id: int) -> Optional[Dict[str, Any]]:
    try:
        return await query_row("SELECT * FROM users WHERE telegram_id = ?", telegram_id)
    except Exception as e:
        logging.error(f"[UserService] find_by_telegram_id error: {e}")
        raise e

async def create_or_update(user_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        # Check if user already exists
        existing = await query_row("SELECT * FROM users WHERE telegram_id = ?", user_data["id"])
        
        if existing:
            # Update
            await execute("""
                UPDATE users SET
                    first_name = ?,
                    last_name = ?,
                    username = ?,
                    is_premium = ?,
                    updated_at = datetime('now')
                WHERE telegram_id = ?
            """,
                user_data["first_name"],
                user_data.get("last_name"),
                user_data.get("username"),
                1 if user_data.get("is_premium", False) else 0,
                user_data["id"]
            )
            return await query_row("SELECT * FROM users WHERE telegram_id = ?", user_data["id"])
        else:
            # Insert
            await execute("""
                INSERT INTO users (telegram_id, first_name, last_name, username, is_premium)
                VALUES (?, ?, ?, ?, ?)
            """,
                user_data["id"],
                user_data["first_name"],
                user_data.get("last_name"),
                user_data.get("username"),
                1 if user_data.get("is_premium", False) else 0
            )
            return await query_row("SELECT * FROM users WHERE id = last_insert_rowid()")
    except Exception as e:
        logging.error(f"[UserService] create_or_update error: {e}")
        raise e

async def update_spending(user_id: int, amount: float) -> None:
    try:
        await execute("""
            UPDATE users SET
                total_spent = total_spent + ?,
                order_count = order_count + 1,
                updated_at = datetime('now')
            WHERE id = ?
        """, amount, user_id)
    except Exception as e:
        logging.error(f"[UserService] update_spending error: {e}")
        raise e
