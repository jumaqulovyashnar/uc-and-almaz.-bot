import urllib.parse
import json
import logging
from fastapi import APIRouter, HTTPException, status
from app.middleware.auth import validate_telegram_data
from app.services import user as user_service
from app.services.referral import register_referral
from app.core.env import env
from app.models.auth import TelegramAuthInput

router = APIRouter()


def _extract_start_param(init_data: str) -> str | None:
    """Extract start_param from Telegram initData string."""
    try:
        params = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
        return params.get("start_param") or None
    except Exception:
        return None


@router.post("/telegram")
async def telegram_auth(payload: TelegramAuthInput):
    init_data = payload.initData

    # Parse and validate initData
    telegram_user = validate_telegram_data(init_data)

    if not telegram_user:
        # Development bypass
        if env.NODE_ENV == "development":
            try:
                params = dict(urllib.parse.parse_qsl(init_data))
                if "user" in params:
                    mock_user = json.loads(params["user"])
                    db_user = await user_service.create_or_update(mock_user)
                    # Try referral even in dev
                    start_param = _extract_start_param(init_data)
                    if start_param:
                        await register_referral(db_user, start_param)
                    return {"success": True, "data": {"user": db_user}}
            except Exception:
                pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram initData signature"
        )

    # Upsert user in database
    db_user = await user_service.create_or_update(telegram_user)

    # Register referral if start_param present (Mini App opened via ?startapp=<id>)
    start_param = _extract_start_param(init_data)
    if start_param:
        try:
            await register_referral(db_user, start_param)
        except Exception as e:
            logging.warning(f"[Auth] register_referral failed (non-critical): {e}")

    return {
        "success": True,
        "data": {"user": db_user}
    }
