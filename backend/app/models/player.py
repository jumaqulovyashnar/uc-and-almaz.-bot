import re
from pydantic import BaseModel, Field, model_validator

class VerifyPlayerInput(BaseModel):
    game: str = Field(..., pattern="^(pubg|freefire)$")
    player_id: str = Field(..., min_length=1, max_length=50)

    @model_validator(mode="after")
    def validate_player_id(self) -> 'VerifyPlayerInput':
        if self.game == "pubg":
            if not re.match(r"^\d{11}$", self.player_id):
                raise ValueError("PUBG Player ID faqat 11 ta raqamdan iborat bo'lishi kerak")
        elif self.game == "freefire":
            if not re.match(r"^\d{11}$", self.player_id):
                raise ValueError("Free Fire Player ID faqat 11 ta raqamdan iborat bo'lishi kerak")
        return self
