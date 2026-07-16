import os
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory of the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    BOT_TOKEN: str
    BOT_USERNAME: str = "top_DonateUzbot"
    ADMIN_TELEGRAM_ID: str = "6709001451"
    WEBAPP_URL: str = "https://localhost:5173"
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379"
    PORT: str = "3000"
    NODE_ENV: str = "development"
    
    # Click.uz
    CLICK_MERCHANT_ID: str = ""
    CLICK_SERVICE_ID: str = ""
    CLICK_SECRET_KEY: str = ""
    
    # Payme.uz
    PAYME_MERCHANT_ID: str = ""
    PAYME_MERCHANT_KEY: str = ""
    
    # Provider Reseller API
    PROVIDER_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

env = Settings()
