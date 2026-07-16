import logging
from typing import List, Dict, Any, Optional
from app.core.database import query, query_row

async def get_by_game(game: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
    try:
        if category:
            return await query(
                """SELECT * FROM game_packages
                   WHERE game = ? AND category = ? AND is_active = 1
                   ORDER BY sort_order ASC""",
                game, category
            )
        
        return await query(
            """SELECT * FROM game_packages
               WHERE game = ? AND is_active = 1
               ORDER BY category, sort_order ASC""",
            game
        )
    except Exception as e:
        logging.error(f"[PackageService] get_by_game error: {e}")
        raise e

async def get_by_id(package_id: int) -> Optional[Dict[str, Any]]:
    try:
        return await query_row(
            "SELECT * FROM game_packages WHERE id = ? AND is_active = 1",
            package_id
        )
    except Exception as e:
        logging.error(f"[PackageService] get_by_id error: {e}")
        raise e

async def get_all() -> List[Dict[str, Any]]:
    try:
        return await query(
            "SELECT * FROM game_packages ORDER BY game, category, sort_order ASC"
        )
    except Exception as e:
        logging.error(f"[PackageService] get_all error: {e}")
        raise e
