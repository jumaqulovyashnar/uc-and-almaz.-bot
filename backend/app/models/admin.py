from pydantic import BaseModel
from typing import Optional, Any

class UpdateConfigInput(BaseModel):
    key: str
    value: Any

class ReviewInput(BaseModel):
    reason: Optional[str] = None
