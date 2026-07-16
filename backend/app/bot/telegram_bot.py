import asyncio
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command, CommandObject
from aiogram.enums import ParseMode
from app.core.env import env

if not env.BOT_TOKEN:
    raise ValueError("BOT_TOKEN is not defined in environment variables")

bot = Bot(token=env.BOT_TOKEN)
dp = Dispatcher()


@dp.message(Command("start"))
async def cmd_start(message: types.Message, command: CommandObject):
    first_name = message.from_user.first_name if message.from_user else "Foydalanuvchi"
    telegram_id = message.from_user.id if message.from_user else None

    # Process referral deep-link via shared register_referral()
    if telegram_id and command.args:
        try:
            from app.services import user as user_service
            from app.services.referral import register_referral

            # Upsert the bot user first
            db_user = await user_service.create_or_update({
                "id": telegram_id,
                "first_name": message.from_user.first_name or "Foydalanuvchi",
                "last_name": message.from_user.last_name,
                "username": message.from_user.username,
                "is_premium": getattr(message.from_user, "is_premium", False) or False,
            })
            # Use the same shared function — idempotent, safe to call multiple times
            await register_referral(db_user, command.args.strip())
        except Exception as e:
            logging.error(f"[Bot] Referral processing failed: {e}")

    welcome_message = (
        f"Salom, <b>{first_name}</b>! 👋\n\n"
        f"🎮 <b>CyberPay</b> botiga xush kelibsiz!\n\n"
        f"Bu yerda siz PUBG Mobile UC va Free Fire Olmoslarini tezkor va xavfsiz sotib olishingiz mumkin.\n\n"
        f"Sotib olishni boshlash uchun quyidagi tugmani bosing 👇"
    )

    keyboard = types.InlineKeyboardMarkup(
        inline_keyboard=[[
            types.InlineKeyboardButton(
                text="CyberPay ni ochish 🚀",
                web_app=types.WebAppInfo(url=env.WEBAPP_URL)
            )
        ]]
    )

    await message.reply(welcome_message, parse_mode=ParseMode.HTML, reply_markup=keyboard)


@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    help_message = (
        f"❓ <b>Yordam bo'limi</b>\n\n"
        f"• /start - Botni ishga tushirish va do'konni ochish\n"
        f"• /help - Ushbu yordam xabarini ko'rsatish\n"
        f"• Mini App orqali Uzcard, Humo to'lovlaridan foydalanib o'yin valyutalarini xarid qiling.\n\n"
        f"Savollar yuzaga kelsa, @yashnar bilan bog'laning."
    )
    await message.reply(help_message, parse_mode=ParseMode.HTML)


@dp.message()
async def echo_all(message: types.Message):
    keyboard = types.InlineKeyboardMarkup(
        inline_keyboard=[[
            types.InlineKeyboardButton(
                text="Do'konni ochish 🎮",
                web_app=types.WebAppInfo(url=env.WEBAPP_URL)
            )
        ]]
    )
    await message.reply(
        "Sotib olishni boshlash uchun quyidagi tugmani bosing 👇",
        reply_markup=keyboard
    )


async def start_bot():
    logging.info("[Bot] Starting bot polling...")
    await bot.delete_webhook(drop_pending_updates=True)
    task = asyncio.create_task(dp.start_polling(bot))
    logging.info("[Bot] Bot polling task created.")
    return task
