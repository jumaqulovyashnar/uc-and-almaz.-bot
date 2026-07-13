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
            detail="Player not found. Please check your ID."
        )

    # Fetch real nickname using Playwright
    nickname = None
    if payload.game == "freefire":
        nickname = await verify_freefire_id(payload.player_id)
    elif payload.game == "pubg":
        nickname = await verify_pubg_id(payload.player_id)

    if not nickname:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found or verification failed. Please verify your ID."
        )

    return {
        "success": True,
        "data": {
            "valid": True,
            "player_id": payload.player_id,
            "nickname": nickname,
            "game": payload.game
        }
    }
