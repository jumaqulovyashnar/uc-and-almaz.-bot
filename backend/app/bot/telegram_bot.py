import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.enums import ParseMode
from app.core.env import env

if not env.BOT_TOKEN:
    raise ValueError("BOT_TOKEN is not defined in environment variables")

# Instantiate bot and dispatcher
bot = Bot(token=env.BOT_TOKEN)
dp = Dispatcher()

# /start command
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    first_name = message.from_user.first_name if message.from_user else "Foydalanuvchi"
    
    welcome_message = (
        f"Salom, <b>{first_name}</b>! 👋\n\n"
        f"🎮 <b>CyberPay</b> botiga xush kelibsiz!\n\n"
        f"Bu yerda siz PUBG Mobile UC va Free Fire Olmoslarini tezkor va xavfsiz sotib olishingiz mumkin.\n\n"
        f"Sotib olishni boshlash uchun quyidagi tugmani bosing 👇"
    )

    keyboard = types.InlineKeyboardMarkup(
        inline_keyboard=[
            [types.InlineKeyboardButton(
                text="CyberPay ni ochish 🚀",
                web_app=types.WebAppInfo(url=env.WEBAPP_URL)
            )]
        ]
    )

    await message.reply(welcome_message, parse_mode=ParseMode.HTML, reply_markup=keyboard)

# /help command
@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    help_message = (
        f"❓ <b>Yordam bo'limi</b>\n\n"
        f"• /start - Botni ishga tushirish va do'konni ochish\n"
        f"• /help - Ushbu yordam xabarini ko'rsatish\n"
        f"• Mini App orqali Uzcard, Humo va Visa to'lovlaridan foydalanib o'yin valyutalarini avtomatik xarid qiling.\n\n"
        f"Savollar yoki muammolar yuzaga kelsa, admin bilan bog'laning."
    )

    await message.reply(help_message, parse_mode=ParseMode.HTML)

# General message handler
@dp.message()
async def echo_all(message: types.Message):
    keyboard = types.InlineKeyboardMarkup(
        inline_keyboard=[
            [types.InlineKeyboardButton(
                text="Do'konni ochish 🎮",
                web_app=types.WebAppInfo(url=env.WEBAPP_URL)
            )]
        ]
    )
    await message.reply("Sotib olishni boshlash uchun quyidagi tugmani bosing 👇", reply_markup=keyboard)

async def start_bot():
    logging.info("[Bot] Starting bot polling...")
    # Delete webhook to ensure polling runs cleanly
    await bot.delete_webhook(drop_pending_updates=True)
    # Start long polling
    asyncio_task = asyncio.create_task(dp.start_polling(bot))
    logging.info("[Bot] Bot polling task created successfully")
    return asyncio_task

import asyncio
