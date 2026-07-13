import logging
from typing import Dict, Any, Optional
from aiogram.types import FSInputFile
from app.config.env import env

# We import the bot client from the bot module
# Note: we need to make sure to avoid circular imports.
# In telegram_bot.py we will instantiate the bot and dispatcher.
# So importing it here is completely safe.
from app.bot.telegram_bot import bot

async def send_order_update(telegram_id: int, order_info: Dict[str, Any]) -> None:
    try:
        status_emoji = {
            "pending": "⏳",
            "processing": "🔄",
            "completed": "✅",
            "failed": "❌",
            "cancelled": "🚫",
        }
        emoji = status_emoji.get(order_info["status"], "📦")
        game_name = "PUBG Mobile" if order_info["game"] == "pubg" else "Free Fire"

        message = f"{emoji} <b>Buyurtma yangilandi</b>\n\n"
        message += f"📋 Buyurtma: #{order_info['id']}\n"
        message += f"🎮 O'yin: {game_name}\n"
        message += f"📦 Paket: {order_info['package_name']}\n"
        message += f"🆔 Player ID: {order_info['player_id']}\n"
        message += f"💰 Narx: {int(float(order_info['price'])):,} UZS\n".replace(",", " ")
        message += f"📊 Status: <b>{order_info['status'].upper()}</b>\n"

        if order_info["status"] == "failed" and order_info.get("error_message"):
            message += f"\n⚠️ Xatolik: {order_info['error_message']}"

        if order_info["status"] == "completed":
            message += f"\n🎉 Buyurtmangiz muvaffaqiyatli bajarildi!"

        await bot.send_message(chat_id=telegram_id, text=message, parse_mode="HTML")
    except Exception as e:
        logging.error(f"[Notification] send_order_update error: {e}")

async def send_admin_alert(message: str, screenshot_path: Optional[str] = None) -> None:
    try:
        admin_id = int(env.ADMIN_TELEGRAM_ID)
        alert_message = f"🔔 <b>Admin Alert</b>\n\n{message}"

        if screenshot_path:
            photo = FSInputFile(screenshot_path)
            await bot.send_photo(chat_id=admin_id, photo=photo, caption=alert_message, parse_mode="HTML")
        else:
            await bot.send_message(chat_id=admin_id, text=alert_message, parse_mode="HTML")
    except Exception as e:
        logging.error(f"[Notification] send_admin_alert error: {e}")
