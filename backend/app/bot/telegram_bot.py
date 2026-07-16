import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command, CommandObject
from aiogram.enums import ParseMode
from app.core.env import env

if not env.BOT_TOKEN:
    raise ValueError("BOT_TOKEN is not defined in environment variables")

# Instantiate bot and dispatcher
bot = Bot(token=env.BOT_TOKEN)
dp = Dispatcher()

# /start command
@dp.message(Command("start"))
async def cmd_start(message: types.Message, command: CommandObject):
    first_name = message.from_user.first_name if message.from_user else "Foydalanuvchi"
    telegram_id = message.from_user.id if message.from_user else None
    
    # Process referral deep-link
    if telegram_id and command.args:
        ref_arg = command.args.strip()
        if ref_arg.isdigit():
            referrer_tg_id = int(ref_arg)
            if referrer_tg_id != telegram_id:
                try:
                    from app.core.database import query_row, get_db
                    # 1. Check if referrer exists
                    referrer = await query_row("SELECT id FROM users WHERE telegram_id = ?", referrer_tg_id)
                    if referrer:
                        # 2. Check if current user already exists
                        current_user = await query_row("SELECT id, referred_by FROM users WHERE telegram_id = ?", telegram_id)
                        db = get_db()
                        try:
                            if not current_user:
                                # Create the referred user
                                await db.execute(
                                    "INSERT INTO users (telegram_id, first_name, last_name, username, referred_by) VALUES (?, ?, ?, ?, ?)",
                                    (
                                        telegram_id,
                                        message.from_user.first_name or "Foydalanuvchi",
                                        message.from_user.last_name,
                                        message.from_user.username,
                                        referrer["id"]
                                    )
                                )
                                # Increment referrer's count
                                await db.execute(
                                    "UPDATE users SET referrals_count = referrals_count + 1 WHERE id = ?",
                                    (referrer["id"],)
                                )
                                await db.commit()
                                logging.info(f"[Bot] Registered referred user {telegram_id} under referrer {referrer_tg_id}")
                            elif not current_user["referred_by"]:
                                # Update existing user with referrer if they don't have one
                                await db.execute(
                                    "UPDATE users SET referred_by = ? WHERE id = ?",
                                    (referrer["id"], current_user["id"])
                                )
                                # Increment referrer's count
                                await db.execute(
                                    "UPDATE users SET referrals_count = referrals_count + 1 WHERE id = ?",
                                    (referrer["id"],)
                                )
                                await db.commit()
                                logging.info(f"[Bot] Updated existing user {telegram_id} with referrer {referrer_tg_id}")
                        except Exception as inner_e:
                            await db.rollback()
                            logging.error(f"[Bot] Failed transaction during referral start: {inner_e}")
                            raise inner_e
                except Exception as e:
                    logging.error(f"[Bot] Referral processing failed: {e}")

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
