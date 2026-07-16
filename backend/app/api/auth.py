from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.middleware.auth import validate_telegram_data
from app.services import user as user_service
from app.core.env import env
from app.models.auth import TelegramAuthInput

router = APIRouter()

@router.post("/telegram")
async def telegram_auth(payload: TelegramAuthInput):
    init_data = payload.initData
    
    # Parse and validate initData
    telegram_user = validate_telegram_data(init_data)
    
    if not telegram_user:
        # Development bypass mock user
        if env.NODE_ENV == "development":
            # Attempt to parse user from query parameters even if signature mismatch in dev
            try:
                import urllib.parse
                import json
                params = dict(urllib.parse.parse_qsl(init_data))
                if "user" in params:
                    mock_user = json.loads(params["user"])
                    db_user = await user_service.create_or_update(mock_user)
                    return {"success": True, "data": {"user": db_user}}
            except Exception:
                pass
                
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram initData signature"
        )
        
    # Upsert user in database
    db_user = await user_service.create_or_update(telegram_user)
    
    return {
        "success": True,
        "data": {
            "user": db_user
        }
    }
