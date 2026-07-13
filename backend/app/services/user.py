import logging
from typing import Optional, Dict, Any
from app.config.database import query_row, query

async def find_by_telegram_id(telegram_id: int) -> Optional[Dict[str, Any]]:
    try:
        return await query_row("SELECT * FROM users WHERE telegram_id = $1", telegram_id)
    except Exception as e:
        logging.error(f"[UserService] find_by_telegram_id error: {e}")
        raise e

async def create_or_update(user_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        # Match TS createOrUpdate parameter fields
        return await query_row("""
            INSERT INTO users (telegram_id, first_name, last_name, username, is_premium)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (telegram_id) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                username = EXCLUDED.username,
                is_premium = EXCLUDED.is_premium,
                updated_at = NOW()
            RETURNING *
        """,
        user_data["id"],
        user_data["first_name"],
        user_data.get("last_name"),
        user_data.get("username"),
        user_data.get("is_premium", False)
        )
    except Exception as e:
        logging.error(f"[UserService] create_or_update error: {e}")
        raise e

async def update_spending(user_id: int, amount: float) -> None:
    try:
        await query("""
            UPDATE users SET
                total_spent = total_spent + $1,
                order_count = order_count + 1,
                updated_at = NOW()
            WHERE id = $2
        """, amount, user_id)
    except Exception as e:
        logging.error(f"[UserService] update_spending error: {e}")
        raise e
