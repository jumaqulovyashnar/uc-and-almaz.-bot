# -*- coding: utf-8 -*-
"""
jollymax_verify.py — Drop-in replacement for automation.verify_pubg_id().

Returns the same {success, error_code, error, nickname} dict contract so that
player.py and PurchasePUBG.tsx need zero changes.
"""
import logging
from typing import Dict, Any

from app.core.env import env
from app.services.jollymax import JollyMaxParser, JollyMaxError

logger = logging.getLogger(__name__)


async def verify_pubg_id_jollymax(player_id: str) -> Dict[str, Any]:
    """
    Verify a PUBG Mobile player ID via JollyMax HTTP API (no browser needed).

    Returns:
        {"success": True,  "nickname": "<name>"}
        {"success": False, "error_code": "INVALID_ID|TIMEOUT|SERVICE_DOWN", "error": "<msg>"}
    """
    # Validate that player_id is numeric before hitting the API
    try:
        pid = int(player_id)
    except (TypeError, ValueError):
        return {
            "success":    False,
            "error_code": "INVALID_ID",
            "error":      "Player ID must be numeric.",
        }

    try:
        async with JollyMaxParser(
            pid,
            app_id      = env.JOLLYMAX_APP_ID,
            goods_id    = env.JOLLYMAX_GOODS_ID,
            pay_type_id = env.JOLLYMAX_PAY_TYPE_ID,
        ) as pubg_user:
            logger.info(
                "[JollyMax] ✅ player_id=%s → nickname=%r",
                player_id,
                pubg_user.nick_name,
            )
            return {"success": True, "nickname": pubg_user.nick_name}

    except JollyMaxError as e:
        logger.warning(
            "[JollyMax] verification failed for player_id=%s: [%s] %s",
            player_id, e.error_code, e.message,
        )
        return {"success": False, "error_code": e.error_code, "error": e.message}

    except Exception as e:
        logger.exception("[JollyMax] unexpected error verifying player_id=%s", player_id)
        return {
            "success":    False,
            "error_code": "SERVICE_DOWN",
            "error":      "Unexpected JollyMax error.",  # never expose raw exc to caller
        }
