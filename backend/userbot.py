import os
import re
import logging
import asyncio
import time
from telethon import TelegramClient, events
from telethon.errors import FloodWaitError, AuthKeyUnregisteredError, SessionPasswordNeededError, RPCError

# Tashqi serverga so'rov yuborish uchun asinxron httpx yoki sinxron requests (thread ichida) ishlatamiz
try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    import requests
    HAS_HTTPX = False

# .env faylidan o'qish (loyihaning bosh jildidan ham, joriy jildidan ham qidiradi)
def load_env():
    env_vars = {}
    # Parent folder (root) va current folder (.env) yo'llari
    env_paths = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    ]
    for path in env_paths:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            env_vars[k.strip()] = v.strip()
                break # Agar topilsa va o'qilsa, to'xtaydi
            except Exception:
                pass
    return env_vars

env = load_env()

# === SOZLAMALAR (Sizning API ma'lumotlaringiz o'rnatildi) ===
API_ID = int(env.get("API_ID", 30760403))
API_HASH = env.get("API_HASH", "6d14c56c787f812e2e08f1d06bbab91a")
SESSION_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "userbot")
API_URL = env.get("API_URL", "http://127.0.0.1:3000/api/payments/webhook")

# === LOG TIZIMI ===
logging.basicConfig(
    filename='userbot_errors.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Konsolga ham loglarni chiqarish
console = logging.StreamHandler()
console.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
console.setFormatter(formatter)
logging.getLogger('').addHandler(console)

# === API GA MA'LUMOT YUBORISH FUNKSIYASI ===
async def send_payment_notification(amount, card, bot_name, order_id=None):
    # If order_id is missing, we might have to infer it on backend, but let's pass what we have
    data = {
        "order_id": int(order_id) if order_id else 0,
        "amount": float(amount),
        "card_last4": card
    }
    logging.info(f"📤 So'rov yuborilmoqda ({bot_name}): {data}")
    
    try:
        if HAS_HTTPX:
            # Httpx o'rnatilgan bo'lsa, asinxron yuboradi (Tavsiya etiladi)
            async with httpx.AsyncClient() as client:
                response = await client.post(API_URL, data=data, timeout=15.0)
                status_code = response.status_code
                response_text = response.text
        else:
            # Requests o'rnatilgan bo'lsa, uni alohida ipda (thread) ishga tushiradi (Bot qotib qolmasligi uchun)
            response = await asyncio.to_thread(
                requests.post, API_URL, data=data, timeout=15
            )
            status_code = response.status_code
            response_text = response.text
            
        logging.info(f"✅ {bot_name} POST javob statusi: {status_code}")
        logging.info(f"✅ {bot_name} POST javob matni: {response_text}")
    except Exception as e:
        logging.error(f"❌ {bot_name} POST so'rovida xatolik: {e}", exc_info=True)

# === @CardXabarBot handler ===
async def cardxabar_handler(event):
    try:
        text = event.raw_text
        logging.info(f"🟢 CardXabarBot xabari qabul qilindi: {text}")
        
        if "🟢 Kartaga o'tkazma" in text:
            summa_match = re.search(r'➕\s*([\d\s]+(?:[.,]\d+)?)', text)
            karta_match = re.search(r'\*+(\d+)', text)
            order_match = re.search(r'#(\d+)', text)
            
            if summa_match and karta_match:
                summa = summa_match.group(1).replace(' ', '').replace(',', '.')
                karta = karta_match.group(1)
                order_id = order_match.group(1) if order_match else None
                await send_payment_notification(summa, karta, "CardXabarBot", order_id)
            else:
                logging.warning("❌ CardXabarBot: Summa yoki karta ma'lumotlari topilmadi.")
        else:
            logging.info("CardXabarBot: 'Kartaga o'tkazma' kalit so'zi topilmadi.")
    except Exception as e:
        logging.error(f"CardXabarBot umumiy xatosi: {e}", exc_info=True)

# === @HUMOcardbot handler ===
async def humo_handler(event):
    try:
        text = event.raw_text
        logging.info(f"🎉 HUMOcardbot xabari qabul qilindi: {text}")
        
        if "🎉 To'ldirish" in text:
            summa_match = re.search(r'➕\s*([\d\s.,]+)', text)
            karta_match = re.search(r'\*?(\d{4})', text)
            order_match = re.search(r'#(\d+)', text)
            
            if summa_match and karta_match:
                summa = summa_match.group(1).replace(' ', '').replace('.', '').replace(',', '.')
                karta = karta_match.group(1)
                order_id = order_match.group(1) if order_match else None
                await send_payment_notification(summa, karta, "HUMOcardbot", order_id)
            else:
                logging.warning("❌ HUMOcardbot: Ma'lumot topilmadi.")
        else:
            logging.info("HUMOcardbot: 'To'ldirish' kalit so'zi topilmadi.")
    except Exception as e:
        logging.error(f"HUMOcardbot umumiy xatosi: {e}", exc_info=True)

# === Asosiy sikl ===
async def main(client_instance):
    logging.info("🚀 Userbot ishga tushmoqda...")
    try:
        # start() avtomatik ulash, avtorizatsiyani tekshirish va terminalda interactive login qilishni ta'minlaydi
        await client_instance.start()
        logging.info("Userbot muvaffaqiyatli ulandi va avtorizatsiyadan o'tdi. Xabarlarni kutmoqda...")
        await client_instance.run_until_disconnected()
    except FloodWaitError as e:
        logging.error(f"Telegram FloodWaitError: {e}. {e.seconds} soniya kutish...", exc_info=True)
        await asyncio.sleep(e.seconds + 5)
    except AuthKeyUnregisteredError:
        logging.critical("Sessiya yaroqsizlandi. Sessiya fayli o'chirilmoqda...")
        session_file = f"{SESSION_PATH}.session"
        if os.path.exists(session_file):
            try:
                os.remove(session_file)
                logging.info(f"Sessiya fayli o'chirildi: {session_file}")
            except Exception as e:
                logging.error(f"Sessiya faylini o'chirishda xatolik: {e}")
        try:
            await client_instance.disconnect()
        except Exception:
            pass
        logging.info("Iltimos, dasturni qayta ishga tushiring va yangidan tizimga kiring.")
        await asyncio.sleep(5)
    except Exception as e:
        logging.error(f"Main loopda kutilmagan xato: {e}", exc_info=True)
        await asyncio.sleep(5)
    finally:
        if client_instance.is_connected():
            logging.info("Client aloqasi uzilmoqda...")
            try:
                await client_instance.disconnect()
            except Exception:
                pass

if __name__ == "__main__":
    while True:
        current_client = None
        try:
            # Yangi Telegram client yaratish (SESSION_PATH bilan)
            current_client = TelegramClient(SESSION_PATH, API_ID, API_HASH)
            
            # Handlerlarni bog'lash
            current_client.add_event_handler(cardxabar_handler, events.NewMessage(from_users='@CardXabarBot'))
            current_client.add_event_handler(humo_handler, events.NewMessage(from_users='@HUMOcardbot'))

            asyncio.run(main(current_client))
        except RuntimeError as e:
            if "The asyncio event loop must not change" in str(e):
                logging.critical("RuntimeError: Event loop o'zgardi. Qayta ishga tushirilmoqda...")
            else:
                logging.error(f"Global xatolik: {e}", exc_info=True)
                time.sleep(15)
        except Exception as e:
            logging.error(f"Global xatolik: {e}", exc_info=True)
            time.sleep(15)
        finally:
            if current_client and current_client.is_connected():
                try:
                    current_client.disconnect()
                except Exception:
                    pass
