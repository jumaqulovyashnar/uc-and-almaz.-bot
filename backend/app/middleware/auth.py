import hmac
import hashlib
import urllib.parse
import json
import logging
from typing import Optional, Dict, Any
from fastapi import Header, Depends, HTTPException, status
from app.core.env import env
from app.services import user as user_service

def validate_telegram_data(init_data: str) -> Optional[Dict[str, Any]]:
    try:
        # Parse query string to list of tuples to handle parameters
        params = urllib.parse.parse_qsl(init_data, keep_blank_values=True)
        params_dict = dict(params)
        
        hash_val = params_dict.get("hash")
        if not hash_val:
            return None

        # Build data check string: sort keys alphabetically, excluding hash
        filtered_params = sorted([(k, v) for k, v in params if k != "hash"])
        data_check_string = "\n".join(f"{k}={v}" for k, v in filtered_params)

        # Compute HMAC-SHA256
        secret_key = hmac.new(b"WebAppData", env.BOT_TOKEN.encode("utf-8"), hashlib.sha256).digest()
        computed_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()

        if computed_hash != hash_val:
            return None

        # Check auth_date for replay attack prevention
        auth_date_str = params_dict.get("auth_date")
        if not auth_date_str:
            return None
        import time
        try:
            auth_date = int(auth_date_str)
            if int(time.time()) - auth_date > 86400: # 24 hours
                logging.warning("[TelegramAuth] Token expired")
                return None
        except ValueError:
            return None

        # Extract user JSON data
        user_str = params_dict.get("user")
        if not user_str:
            return None

        return json.loads(user_str)
    except Exception as e:
        logging.error(f"[TelegramAuth] Validation error: {e}")
        return None

async def get_current_user(
    x_telegram_init_data: Optional[str] = Header(None, alias="x-telegram-init-data"),
    x_dev_user_id: Optional[str] = Header(None, alias="x-dev-user-id")
) -> Dict[str, Any]:
    # 1. Dev mode bypass
    if env.NODE_ENV == "development" and x_dev_user_id:
        try:
            dev_user_id = int(x_dev_user_id)
            db_user = await user_service.create_or_update({
                "id": dev_user_id,
                "first_name": "Dev",
                "last_name": "User",
                "username": "devuser",
                "is_premium": False
            })
            return db_user
        except ValueError:
            pass

    # 2. Check header exists
    if not x_telegram_init_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Telegram initData header"
        )

    # 3. Validate signature
    telegram_user = validate_telegram_data(x_telegram_init_data)
    if not telegram_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram initData signature"
        )

    # 4. Upsert user in database
    try:
        db_user = await user_service.create_or_update(telegram_user)
        return db_user
    except Exception as e:
        logging.error(f"[TelegramAuth] Database sync failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

async def get_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    try:
        admin_id = int(env.ADMIN_TELEGRAM_ID)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid ADMIN_TELEGRAM_ID configured on server"
        )

    # Compare users
    if current_user.get("telegram_id") != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
