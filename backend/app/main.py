import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.env import env
from app.config.database import init_db, close_db, test_connection
from app.config.redis import init_redis, close_redis, test_redis_connection
from app.services.price_sync import sync_package_prices
from app.bot.telegram_bot import start_bot, bot, dp
from app.workers.purchase_worker import start_purchase_worker
from app.middleware.error_handler import register_error_handlers

# Include routers
from app.routes.auth import router as auth_router
from app.routes.package import router as package_router
from app.routes.order import router as order_router
from app.routes.player import router as player_router
from app.routes.admin import router as admin_router

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
    else:
        logging.info("[Server] ⏭️ Skipping Price Sync (PostgreSQL not available).")

    logging.info("[Server] 🚀 CyberPay API server is ready!")

    yield

    # Shutdown events
    logging.info("[Server] Graceful shutdown initiated...")
    
    # Stop background tasks
    if sync_task:
        sync_task.cancel()
    if bot_task:
        bot_task.cancel()
    if worker_task:
        worker_task.cancel()
    
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
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

@app.get("/api/health")
async def health_check():
    return {
        "success": True,
        "message": "CyberPay API is healthy"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(env.PORT)
    reload = env.NODE_ENV == "development"
    logging.info(f"[Server] Express API server running on port {port} in {env.NODE_ENV} mode")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload)
