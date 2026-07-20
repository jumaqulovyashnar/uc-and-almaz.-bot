import asyncio
import logging
import os
import random
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command, CommandObject
from aiogram.enums import ParseMode
from aiogram.fsm.state import StatesGroup, State
from aiogram.fsm.context import FSMContext

from app.core.env import env
from app.services import user as user_service
from app.services.referral import register_referral
from app.core.database import query, query_row, execute

if not env.BOT_TOKEN:
    raise ValueError("BOT_TOKEN is not defined in environment variables")

bot = Bot(token=env.BOT_TOKEN)
dp = Dispatcher()

# --- Configurations with Fallbacks ---
BOT_CARD_NUMBER = env.BOT_CARD_NUMBER
TELEGRAM_CHANNEL_URL = os.getenv("TELEGRAM_CHANNEL_URL", "https://t.me/top_DonateUz")
TELEGRAM_SUPPORT_URL = os.getenv("TELEGRAM_SUPPORT_URL", "https://t.me/yashnar")
WELCOME_PHOTO_URL = env.WELCOME_PHOTO_URL

# --- Keyboards ---
main_keyboard = types.ReplyKeyboardMarkup(
    keyboard=[
        [
            types.KeyboardButton(text="🎮 Donat olish"),
            types.KeyboardButton(text="💰 Balansim")
        ],
        [
            types.KeyboardButton(text="💳 Hisob to'ldirish"),
            types.KeyboardButton(text="📦 Buyurtmalarim")
        ],
        [
            types.KeyboardButton(text="👥 Referal"),
            types.KeyboardButton(text="ℹ️ Yordam")
        ]
    ],
    resize_keyboard=True
)

cancel_keyboard = types.ReplyKeyboardMarkup(
    keyboard=[[types.KeyboardButton(text="🚫 Bekor qilish")]],
    resize_keyboard=True
)

# --- FSM States ---
class RechargeStates(StatesGroup):
    waiting_for_amount = State()
    waiting_for_receipt = State()

def get_webapp_url_with_api() -> str:
    base_url = env.WEBAPP_URL
    api_url = env.API_URL.replace("/payments/webhook", "") if "/payments/webhook" in env.API_URL else ""
    if api_url:
        separator = "&" if "?" in base_url else "?"
        return f"{base_url}{separator}api_url={api_url}"
    return base_url

# --- Helper function for welcome/inline keyboard ---
def get_welcome_inline_keyboard():
    return types.InlineKeyboardMarkup(
        inline_keyboard=[
            [
                types.InlineKeyboardButton(
                    text="📱 Ilovani ochish",
                    web_app=types.WebAppInfo(url=get_webapp_url_with_api())
                )
            ],
            [
                types.InlineKeyboardButton(
                    text="Bizning kanal",
                    url=TELEGRAM_CHANNEL_URL
                ),
                types.InlineKeyboardButton(
                    text="Yordam",
                    url=TELEGRAM_SUPPORT_URL
                )
            ]
        ]
    )

# --- Command Handlers ---
@dp.message(Command("start"))
async def cmd_start(message: types.Message, command: CommandObject, state: FSMContext):
    await state.clear()
    first_name = message.from_user.first_name if message.from_user else "Foydalanuvchi"
    telegram_id = message.from_user.id if message.from_user else None

    # Upsert user first to ensure they exist
    if telegram_id:
        try:
            db_user = await user_service.create_or_update({
                "id": telegram_id,
                "first_name": message.from_user.first_name or "Foydalanuvchi",
                "last_name": message.from_user.last_name,
                "username": message.from_user.username,
                "is_premium": getattr(message.from_user, "is_premium", False) or False,
            })
            # Process referral deep-link if start arg is present
            if command.args:
                await register_referral(db_user, command.args.strip())
        except Exception as e:
            logging.error(f"[Bot] User registration or referral failed: {e}")

    welcome_text = (
        f"Xush kelibsiz, <b>{first_name}</b>! ✌🏻\n\n"
        f"🎮 <b>CyberPay</b> botiga xush kelibsiz!\n\n"
        f"Bu yerda siz PUBG Mobile UC va Free Fire Olmoslarini tezkor va xavfsiz sotib olishingiz mumkin.\n\n"
        f"Sotib olishni boshlash uchun quyidagi tugmani bosing 👇"
    )

    inline_keyboard = get_welcome_inline_keyboard()

    # Try sending as photo, fallback to text if URL fails
    try:
        await message.answer_photo(
            photo=WELCOME_PHOTO_URL,
            caption=welcome_text,
            reply_markup=inline_keyboard,
            parse_mode=ParseMode.HTML
        )
    except Exception as e:
        logging.warning(f"[Bot] Welcome photo send failed, falling back to text: {e}")
        await message.answer(
            text=welcome_text,
            reply_markup=inline_keyboard,
            parse_mode=ParseMode.HTML
        )



@dp.message(Command("help"))
async def cmd_help(message: types.Message, state: FSMContext):
    await state.clear()
    help_message = (
        f"❓ <b>Yordam bo'limi</b>\n\n"
        f"• /start - Botni ishga tushirish va do'konni ochish\n"
        f"• /help - Ushbu yordam xabarini ko'rsatish\n"
        f"• Mini App orqali Uzcard, Humo to'lovlaridan foydalanib o'yin valyutalarini xarid qiling.\n\n"
        f"Savollar yuzaga kelsa, @yashnar bilan bog'laning."
    )
    await message.reply(help_message, parse_mode=ParseMode.HTML, reply_markup=main_keyboard)


# --- Reply Keyboard Button Handlers ---

@dp.message(lambda message: message.text == "🎮 Donat olish")
async def btn_donat_olish(message: types.Message, state: FSMContext):
    await state.clear()
    first_name = message.from_user.first_name if message.from_user else "Foydalanuvchi"
    welcome_text = (
        f"Salom, <b>{first_name}</b>! 👋\n\n"
        f"Sotib olishni boshlash uchun quyidagi tugmani bosing 👇"
    )
    inline_keyboard = get_welcome_inline_keyboard()
    try:
        await message.answer_photo(
            photo=WELCOME_PHOTO_URL,
            caption=welcome_text,
            reply_markup=inline_keyboard,
            parse_mode=ParseMode.HTML
        )
    except Exception as e:
        logging.warning(f"[Bot] Photo send failed in btn_donat_olish: {e}")
        await message.answer(
            text=welcome_text,
            reply_markup=inline_keyboard,
            parse_mode=ParseMode.HTML
        )


@dp.message(lambda message: message.text == "💰 Balansim")
async def btn_balansim(message: types.Message, state: FSMContext):
    await state.clear()
    telegram_id = message.from_user.id
    try:
        db_user = await user_service.find_by_telegram_id(telegram_id)
        if not db_user:
            db_user = await user_service.create_or_update({
                "id": telegram_id,
                "first_name": message.from_user.first_name or "Foydalanuvchi",
                "last_name": message.from_user.last_name,
                "username": message.from_user.username,
            })

        balance = db_user.get("balance", 0.0)
        referral_balance = db_user.get("referral_balance", 0.0)
        referrals_count = db_user.get("referrals_count", 0)
        total_spent = db_user.get("total_spent", 0.0)
        order_count = db_user.get("order_count", 0)

        text = (
            f"👤 <b>Sizning profilingiz:</b>\n\n"
            f"🆔 <b>Telegram ID:</b> <code>{telegram_id}</code>\n"
            f"💰 <b>Balans:</b> {balance:,.0f} so'm\n"
            f"👥 <b>Taklif qilingan do'stlar:</b> {referrals_count} ta\n"
            f"🎁 <b>Bonus balans:</b> {referral_balance:,.0f} so'm\n"
            f"📊 <b>Jami xaridlar:</b> {total_spent:,.0f} so'm ({order_count} ta buyurtma)\n\n"
            f"Hisobingizni to'ldirish uchun <b>💳 Hisob to'ldirish</b> tugmasini bosing."
        )
        await message.answer(text, parse_mode=ParseMode.HTML, reply_markup=main_keyboard)
    except Exception as e:
        logging.error(f"[Bot] Balansim error: {e}")
        await message.answer("⚠️ Ma'lumotlarni yuklashda xatolik yuz berdi. Iltimos keyinroq urinib ko'ring.")


@dp.message(lambda message: message.text == "💳 Hisob to'ldirish")
async def btn_hisob_toldirish(message: types.Message, state: FSMContext):
    await state.set_state(RechargeStates.waiting_for_amount)
    await message.answer(
        "💵 To'ldirmoqchi bo'lgan summani kiriting (so'm):\n\nMinimal: 5 000 so'm",
        reply_markup=cancel_keyboard
    )


@dp.message(lambda message: message.text == "📦 Buyurtmalarim")
async def btn_buyurtmalarim(message: types.Message, state: FSMContext):
    await state.clear()
    telegram_id = message.from_user.id
    try:
        db_user = await user_service.find_by_telegram_id(telegram_id)
        if not db_user:
            await message.answer("Sizda hali buyurtmalar mavjud emas.", reply_markup=main_keyboard)
            return

        orders = await query(
            "SELECT id, game, package_name, price, status, created_at FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 5",
            db_user["id"]
        )

        if not orders:
            await message.answer("Sizda hali buyurtmalar mavjud emas.", reply_markup=main_keyboard)
            return

        text = "📦 <b>Sizning oxirgi buyurtmalaringiz:</b>\n\n"
        for order in orders:
            status_emoji = {
                "pending": "⏳",
                "pending_payment": "💳",
                "completed": "✅",
                "failed": "❌",
                "expired": "🚫"
            }.get(order["status"], "ℹ️")

            status_text = {
                "pending": "Kutilmoqda",
                "pending_payment": "To'lov kutilmoqda",
                "completed": "Bajarildi",
                "failed": "Xatolik",
                "expired": "Muddati o'tgan"
            }.get(order["status"], order["status"])

            game_name = "PUBG Mobile" if order["game"] == "pubg" else "Free Fire"

            text += (
                f"🛍️ <b>Buyurtma #{order['id']}</b>\n"
                f"🎮 O'yin: {game_name}\n"
                f"📦 Paket: {order['package_name']}\n"
                f"💵 Narxi: {order['price']:,.0f} so'm\n"
                f"📊 Holati: {status_emoji} {status_text}\n"
                f"📅 Sana: {order['created_at']}\n"
                f"------------------\n"
            )

        await message.answer(text, parse_mode=ParseMode.HTML, reply_markup=main_keyboard)
    except Exception as e:
        logging.error(f"[Bot] Buyurtmalarim error: {e}")
        await message.answer("⚠️ Buyurtmalarni yuklashda xatolik yuz berdi.")


@dp.message(lambda message: message.text == "👥 Referal")
async def btn_referal(message: types.Message, state: FSMContext):
    await state.clear()
    telegram_id = message.from_user.id
    try:
        db_user = await user_service.find_by_telegram_id(telegram_id)
        if not db_user:
            db_user = await user_service.create_or_update({
                "id": telegram_id,
                "first_name": message.from_user.first_name or "Foydalanuvchi",
                "last_name": message.from_user.last_name,
                "username": message.from_user.username,
            })

        referral_balance = db_user.get("referral_balance", 0.0)
        referrals_count = db_user.get("referrals_count", 0)

        text = (
            f"👥 <b>Hamkorlik dasturi</b>\n\n"
            f"Do'stlaringizni taklif qiling va ularning har bir xarididan <b>5%</b> bonus oling!\n\n"
            f"🔗 <b>Sizning taklif havolangiz:</b>\n"
            f"<a href=\"https://t.me/{env.BOT_USERNAME}?start={telegram_id}\">https://t.me/{env.BOT_USERNAME}?start={telegram_id}</a>\n\n"
            f"📊 <b>Statistika:</b>\n"
            f"• Taklif qilingan do'stlar: {referrals_count} ta\n"
            f"• Topilgan bonuslar: {referral_balance:,.0f} so'm"
        )
        await message.answer(text, parse_mode=ParseMode.HTML, reply_markup=main_keyboard)
    except Exception as e:
        logging.error(f"[Bot] Referal error: {e}")
        await message.answer("⚠️ Referal ma'lumotlarini olishda xatolik yuz berdi.")




@dp.message(lambda message: message.text == "ℹ️ Yordam")
async def btn_yordam(message: types.Message, state: FSMContext):
    await state.clear()
    help_message = (
        f"❓ <b>Yordam bo'limi</b>\n\n"
        f"• /start - Botni ishga tushirish va do'konni ochish\n"
        f"• /help - Ushbu yordam xabarini ko'rsatish\n"
        f"• Mini App orqali Uzcard, Humo to'lovlaridan foydalanib o'yin valyutalarini xarid qiling.\n\n"
        f"Savollar yuzaga kelsa, @yashnar bilan bog'laning."
    )
    await message.reply(help_message, parse_mode=ParseMode.HTML, reply_markup=main_keyboard)


# --- FSM Handlers for Hisob to'ldirish ---

@dp.message(RechargeStates.waiting_for_amount, lambda message: message.text == "🚫 Bekor qilish")
async def cancel_recharge_amount(message: types.Message, state: FSMContext):
    await state.clear()
    await message.answer("🚫 Bekor qilindi.", reply_markup=main_keyboard)


@dp.message(RechargeStates.waiting_for_amount)
async def process_recharge_amount(message: types.Message, state: FSMContext):
    text = message.text.strip().replace(" ", "")
    if not text.isdigit():
        await message.answer("⚠️ Iltimos, to'ldirish summasini faqat raqamlarda kiriting (M-n: 50000).")
        return

    amount = int(text)
    if amount < 5000:
        await message.answer("⚠️ Minimal to'ldirish summasi: 5 000 so'm. Iltimos, kattaroq summa kiriting.")
        return

    deposit_id = random.randint(1000, 9999)
    await state.update_data(amount=amount, deposit_id=deposit_id)
    await state.set_state(RechargeStates.waiting_for_receipt)

    instruction_text = (
        f"💳 <b>To'lov #{deposit_id}</b>\n\n"
        f"💵 Miqdor: <b>{amount:,.0f} so'm</b>\n"
        f"💳 Karta: <code>{BOT_CARD_NUMBER}</code>\n\n"
        f"📸 To'lovni amalga oshirib, <b>chek rasmini</b> shu yerga yuboring."
    )

    await message.answer(instruction_text, parse_mode=ParseMode.HTML, reply_markup=cancel_keyboard)


@dp.message(RechargeStates.waiting_for_receipt, lambda message: message.text == "🚫 Bekor qilish")
async def cancel_recharge_receipt(message: types.Message, state: FSMContext):
    await state.clear()
    await message.answer("🚫 Bekor qilindi.", reply_markup=main_keyboard)


@dp.message(RechargeStates.waiting_for_receipt, lambda message: message.photo)
async def process_recharge_receipt(message: types.Message, state: FSMContext):
    user_data = await state.get_data()
    amount = user_data.get("amount")
    deposit_id = user_data.get("deposit_id")

    photo_file_id = message.photo[-1].file_id

    # Confirm receipt to user
    await message.answer(
        "✅ <b>Chek qabul qilindi!</b>\n\n"
        "To'lovingiz tekshirilgandan so'ng, hisobingiz to'ldiriladi. Rahmat!",
        parse_mode=ParseMode.HTML,
        reply_markup=main_keyboard
    )

    # Forward receipt to admin
    admin_msg = (
        f"🔔 <b>Yangi to'lov cheki!</b>\n\n"
        f"👤 <b>Foydalanuvchi:</b> {message.from_user.full_name} (@{message.from_user.username})\n"
        f"🆔 <b>Telegram ID:</b> <code>{message.from_user.id}</code>\n"
        f"💵 <b>Miqdor:</b> {amount:,.0f} so'm\n"
        f"💳 <b>To'lov ID:</b> #{deposit_id}\n"
    )

    try:
        await bot.send_photo(
            chat_id=env.ADMIN_TELEGRAM_ID,
            photo=photo_file_id,
            caption=admin_msg,
            parse_mode=ParseMode.HTML
        )
    except Exception as e:
        logging.error(f"[Bot] Failed to forward photo to admin: {e}")
        # fallback to sending text notification to admin
        try:
            await bot.send_message(
                chat_id=env.ADMIN_TELEGRAM_ID,
                text=f"{admin_msg}\n⚠️ Chek rasmini yuborishda xatolik yuz berdi.",
                parse_mode=ParseMode.HTML
            )
        except Exception as e2:
            logging.error(f"[Bot] Admin notification fallback failed: {e2}")

    await state.clear()


@dp.message(RechargeStates.waiting_for_receipt)
async def process_recharge_receipt_invalid(message: types.Message, state: FSMContext):
    await message.answer(
        "⚠️ Iltimos, to'lov chekining rasmini yuboring yoki to'lovni bekor qilish uchun <b>🚫 Bekor qilish</b> tugmasini bosing."
    )


# --- Echo handler fallback for other inputs ---
@dp.message()
async def echo_all(message: types.Message, state: FSMContext):
    await state.clear()
    inline_keyboard = get_welcome_inline_keyboard()
    await message.reply(
        "Sotib olishni boshlash uchun quyidagi tugmani bosing 👇",
        reply_markup=inline_keyboard
    )


async def start_bot():
    logging.info("[Bot] Starting bot polling...")
    await bot.delete_webhook(drop_pending_updates=True)
    task = asyncio.create_task(dp.start_polling(bot))
    logging.info("[Bot] Bot polling task created.")
    return task
