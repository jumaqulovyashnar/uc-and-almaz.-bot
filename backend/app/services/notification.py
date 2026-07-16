import logging
from typing import Dict, Any, Optional
from app.core.env import env

async def send_order_update(telegram_id: int, order_info: Dict[str, Any]) -> None:
    try:
        from app.bot.telegram_bot import bot
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


async def send_referral_notification(referrer_telegram_id: int, referred_first_name: str) -> None:
    """Notify the referrer when a new user joins through their link."""
    try:
        from app.bot.telegram_bot import bot
        cashback_pct = int(env.REFERRAL_CASHBACK_PERCENT * 100)
        message = (
            f"🎉 <b>Yangi referal qo'shildi!</b>\n\n"
            f"👤 <b>{referred_first_name}</b> sizning taklif havolangiz orqali botga qo'shildi.\n\n"
            f"💰 Do'stingiz xarid qilganda, siz har bir tranzaksiyadan "
            f"<b>{cashback_pct}%</b> keshbek olasiz!"
        )
        await bot.send_message(
            chat_id=referrer_telegram_id,
            text=message,
            parse_mode="HTML"
        )
        logging.info(f"[Notification] Referral notification sent to {referrer_telegram_id}")
    except Exception as e:
        logging.error(f"[Notification] send_referral_notification error: {e}")


async def send_admin_alert(message: str, screenshot_path: Optional[str] = None) -> None:
    try:
        from app.bot.telegram_bot import bot
        from aiogram.types import FSInputFile
        admin_id = int(env.ADMIN_TELEGRAM_ID)
        alert_message = f"🔔 <b>Admin Alert</b>\n\n{message}"

        if screenshot_path:
            photo = FSInputFile(screenshot_path)
            await bot.send_photo(
                chat_id=admin_id, photo=photo,
                caption=alert_message, parse_mode="HTML"
            )
        else:
            await bot.send_message(chat_id=admin_id, text=alert_message, parse_mode="HTML")
    except Exception as e:
        logging.error(f"[Notification] send_admin_alert error: {e}")
