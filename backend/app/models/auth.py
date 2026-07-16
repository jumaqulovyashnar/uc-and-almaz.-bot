from pydantic import BaseModel

class TelegramAuthInput(BaseModel):
    initData: str
