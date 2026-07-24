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
    BOT_CARD_NUMBER: str = "9860 1801 0950 0686"
    WELCOME_PHOTO_URL: str = "https://telegra.ph/file/0c99dfde637dfbf2b2207.png"
    WEBAPP_URL: str = "https://localhost:5173"
    API_URL: str = ""
    DATABASE_URL: str = "sqlite:///cyberpay.db"
    REDIS_URL: str = "redis://localhost:6379"
    PORT: str = "3000"
    NODE_ENV: str = "development"
    REFERRAL_CASHBACK_PERCENT: float = 0.05

    # Click.uz
    CLICK_MERCHANT_ID: str = "76345ec0-f509-49c1-a5e0-26865e715b13"
    CLICK_SERVICE_ID: str = ""
    CLICK_SECRET_KEY: str = ""

    # Payme.uz
    PAYME_MERCHANT_ID: str = "76345ec0-f509-49c1-a5e0-26865e715b13"
    PAYME_MERCHANT_KEY: str = ""

    # Paylov.uz Merchant API
    PAYLOV_BASE_URL: str = "https://paylov.uz"
    PAYLOV_MERCHANT_ID: str = ""
    PAYLOV_USERNAME: str = ""
    PAYLOV_PASSWORD: str = ""
    PAYLOV_CONSUMER_KEY: str = ""
    PAYLOV_CONSUMER_SECRET: str = ""

    # Provider Reseller API
    PROVIDER_API_KEY: str = ""

    # JollyMax — PUBG Mobile player ID verification (HTTP API, no browser)
    JOLLYMAX_APP_ID:          str  = "APP20220811034444301"
    JOLLYMAX_GOODS_ID:        str  = "G20230718123400139"
    JOLLYMAX_PAY_TYPE_ID:     str  = "698832"
    JOLLYMAX_FALLBACK_ENABLED: bool = True  # fallback to Playwright if JollyMax fails

    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

env = Settings()
