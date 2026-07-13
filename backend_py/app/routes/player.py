import re
import asyncio
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, model_validator
from typing import Optional

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
    # Simulate API delay
    await asyncio.sleep(0.5)

    if len(payload.player_id) < 5:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found. Please check your ID."
        )

    last4 = payload.player_id[-4:]
    game_name = "PUBG" if payload.game == "pubg" else "FF"

    return {
        "success": True,
        "data": {
            "valid": True,
            "player_id": payload.player_id,
            "nickname": f"{game_name}Player_{last4}",
            "game": payload.game
        }
    }
