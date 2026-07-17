import re
from pydantic import BaseModel, Field, model_validator
from typing import Optional

class CreateOrderInput(BaseModel):
    game: str = Field(..., pattern="^(pubg|freefire)$")
    category: str = Field(..., min_length=1)
    package_id: int = Field(..., gt=0)
    player_id: str = Field(..., min_length=1, max_length=50)
    player_nickname: Optional[str] = Field(None, max_length=100)
    payment_method: str = Field(..., pattern="^(uzcard|humo|visa)$")

    @model_validator(mode="after")
    def validate_player_id(self) -> 'CreateOrderInput':
        if self.game == "pubg":
            if not re.match(r"^\d{11}$", self.player_id):
                raise ValueError("PUBG Player ID faqat 11 ta raqamdan iborat bo'lishi kerak (M-n: 52186038540)")
        elif self.game == "freefire":
            if not re.match(r"^\d{11}$", self.player_id):
                raise ValueError("Free Fire Player ID faqat 11 ta raqamdan iborat bo'lishi kerak (M-n: 16342296705)")
        return self

class WebhookInput(BaseModel):
    order_id: int
    amount: float
    card_last4: str
