import re
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, model_validator
from app.services.automation import verify_freefire_id, verify_pubg_id

router = APIRouter()

class VerifyPlayerInput(BaseModel):
    game: str = Field(..., pattern="^(pubg|freefire)$")
    player_id: str = Field(..., min_length=1, max_length=50)

    @model_validator(mode="after")
    def validate_player_id(self) -> 'VerifyPlayerInput':
        if self.game == "pubg":
            if not re.match(r"^\d{5,12}$", self.player_id):
                raise ValueError("PUBG Player ID faqat 5-12 ta raqamdan iborat bo'lishi kerak")
        elif self.game == "freefire":
            if not re.match(r"^\d{8,12}$", self.player_id):
                raise ValueError("Free Fire Player ID faqat 8-12 ta raqamdan iborat bo'lishi kerak")
        return self

@router.post("")
async def verify_player(payload: VerifyPlayerInput):
    if len(payload.player_id) < 5:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "INVALID_ID",
                "message": "Player ID is too short."
            }
        )

    # Fetch real nickname using Playwright
    res = None
    if payload.game == "freefire":
        res = await verify_freefire_id(payload.player_id)
    elif payload.game == "pubg":
        res = await verify_pubg_id(payload.player_id)

    if not res or not res.get("success"):
        error_code = res.get("error_code") if res else "SERVICE_DOWN"
        error_msg = res.get("error") if res else "Verification failed."
        
        status_code = status.HTTP_404_NOT_FOUND if error_code == "INVALID_ID" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=status_code,
            detail={
                "error_code": error_code,
                "message": error_msg
            }
        )

    return {
        "success": True,
        "data": {
            "valid": True,
            "player_id": payload.player_id,
            "nickname": res.get("nickname"),
            "game": payload.game
        }
    }
