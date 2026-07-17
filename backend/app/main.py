import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.env import env
from app.core.database import init_db, close_db, test_connection
from app.core.redis import init_redis, close_redis, test_redis_connection
from app.services.price_sync import sync_package_prices
from app.bot.telegram_bot import start_bot, bot, dp
from app.workers.purchase_worker import start_purchase_worker
from app.middleware.error_handler import register_error_handlers

# Include routers
from app.api.auth import router as auth_router
from app.api.package import router as package_router
from app.api.order import router as order_router
from app.api.player import router as player_router
from app.api.admin import router as admin_router
from app.api.payments import router as payments_router
from app.api.referral import router as referral_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

async def price_sync_scheduler():
    # Sync prices on startup
    try:
        res = await sync_package_prices()
        logging.info(
            f"[Server] Price synchronization completed on startup. "
            f"Updated {res['updatedCount']} packages. (1 USD = {res['rate']} UZS)"
        )
    except Exception as err:
        logging.error(f"[Server] Price sync on startup failed: {err}")

    # Infinite loop to run scheduled synchronization every 12 hours
    while True:
        await asyncio.sleep(12 * 3600)
        try:
            logging.info("[Server] Running scheduled price synchronization...")
            await sync_package_prices()
        except Exception as err:
            logging.error(f"[Server] Scheduled price sync failed: {err}")

async def expire_orders_scheduler():
    from app.core.database import execute
    while True:
        try:
            # Expire orders older than 30 minutes
            await execute("""
                UPDATE orders 
                SET payment_status = 'expired', status = 'failed', error_message = 'To''lov vaqti tugadi', updated_at = datetime('now')
                WHERE payment_status = 'pending_payment' AND created_at <= datetime('now', '-30 minutes')
            """)
        except Exception as err:
            logging.error(f"[Server] Expire orders task failed: {err}")
        await asyncio.sleep(60) # check every minute

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("[Server] Initializing CyberPay services...")
    
    bot_task = None
    worker_task = None
    sync_task = None
    db_ok = False
    redis_ok = False

    # 1. Initialize PostgreSQL database
    try:
        await init_db()
        db_ok = await test_connection()
        if db_ok:
            logging.info("[Server] ✅ PostgreSQL connected successfully.")
        else:
            logging.warning("[Server] ⚠️ PostgreSQL connection test failed.")
    except Exception as e:
        logging.warning(f"[Server] ⚠️ PostgreSQL not available: {e}")
        if env.NODE_ENV == "production":
            logging.critical("[Server] PostgreSQL connection failed in production! Exiting...")
            raise SystemExit(1)
        logging.info("[Server] Development mode — continuing without PostgreSQL...")

    # 2. Initialize Redis
    try:
        await init_redis()
        redis_ok = await test_redis_connection()
        if redis_ok:
            logging.info("[Server] ✅ Redis connected successfully.")
        else:
            logging.warning("[Server] ⚠️ Redis connection test failed.")
    except Exception as e:
        logging.warning(f"[Server] ⚠️ Redis not available: {e}")
        if env.NODE_ENV == "production":
            logging.critical("[Server] Redis connection failed in production! Exiting...")
            raise SystemExit(1)
        logging.info("[Server] Development mode — continuing without Redis...")

    # 3. Start Telegram Bot (aiogram long polling)
    try:
        bot_task = await start_bot()
        logging.info("[Server] ✅ Telegram Bot started.")
    except Exception as e:
        logging.warning(f"[Server] ⚠️ Telegram Bot failed to start: {e}")

    # 4. Start Background Queue Worker
    if redis_ok:
        try:
            worker_task = await start_purchase_worker()
            logging.info("[Server] ✅ Purchase Worker started.")
        except Exception as e:
            logging.warning(f"[Server] ⚠️ Purchase Worker failed to start: {e}")
    else:
        logging.info("[Server] ⏭️ Skipping Purchase Worker (Redis not available).")

    # 5. Start Price Sync Scheduler task
    if db_ok:
        sync_task = asyncio.create_task(price_sync_scheduler())
        logging.info("[Server] ✅ Price Sync Scheduler started.")
        expire_task = asyncio.create_task(expire_orders_scheduler())
        logging.info("[Server] ✅ Expire Orders Scheduler started.")
    else:
        logging.info("[Server] ⏭️ Skipping Price Sync (PostgreSQL not available).")

    logging.info("[Server] 🚀 CyberPay API server is ready!")

    yield

    # Shutdown events
    logging.info("[Server] Graceful shutdown initiated...")
    
    # Stop background tasks
    if sync_task:
        sync_task.cancel()
    try:
        expire_task.cancel()
    except UnboundLocalError:
        pass
    if bot_task:
        bot_task.cancel()
    if worker_task:
        worker_task.cancel()

    # Close Playwright browser on shutdown
    try:
        from app.services.automation import close_browser
        await close_browser()
        logging.info("[Server] ✅ Shared Playwright browser closed.")
    except Exception as e:
        logging.warning(f"[Server] ⚠️ Failed to close browser: {e}")
    
    # Close Bot session
    try:
        await bot.session.close()
    except Exception:
        pass
    
    # Close connection pools
    try:
        await close_redis()
    except Exception:
        pass
    try:
        await close_db()
    except Exception:
        pass
    
    logging.info("[Server] Graceful shutdown completed. Exiting.")

# Initialize FastAPI App
app = FastAPI(
    title="CyberPay API",
    description="Python translation of CyberPay Express API server",
    version="1.0.0",
    lifespan=lifespan
)

# Apply CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://uc-and-almaz-bot.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://192.168.0.126:5173",  # LAN dev access
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Register Exception Handlers
register_error_handlers(app)

# Include API Routers
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(package_router, prefix="/api/packages", tags=["Packages"])
app.include_router(order_router, prefix="/api/orders", tags=["Orders"])
app.include_router(player_router, prefix="/api/verify-player", tags=["Player Verification"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin panel"])
app.include_router(payments_router, prefix="/api/payments", tags=["Payments"])
app.include_router(referral_router, prefix="/api/referrals", tags=["Referrals"])

@app.get("/api/health")
async def health_check():
    return {
        "success": True,
        "message": "CyberPay API is healthy"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(env.PORT)
    reload = env.NODE_ENV == "development" and sys.platform != 'win32'
    logging.info(f"[Server] Express API server running on port {port} in {env.NODE_ENV} mode (reload={reload})")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload)
