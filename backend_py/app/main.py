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
    
    # 1. Initialize PostgreSQL database
    await init_db()
    db_ok = await test_connection()
    if not db_ok and env.NODE_ENV == "production":
        logging.critical("[Server] PostgreSQL connection failed in production! Exiting...")
        raise SystemExit(1)
        
    # 2. Initialize Redis
    await init_redis()
    redis_ok = await test_redis_connection()
    if not redis_ok and env.NODE_ENV == "production":
        logging.critical("[Server] Redis connection failed in production! Exiting...")
        raise SystemExit(1)

    # 3. Start Telegram Bot (aiogram long polling)
    bot_task = await start_bot()

    # 4. Start Background Queue Worker
    worker_task = await start_purchase_worker()

    # 5. Start Price Sync Scheduler task
    sync_task = asyncio.create_task(price_sync_scheduler())

    yield

    # Shutdown events
    logging.info("[Server] Graceful shutdown initiated...")
    
    # Stop background tasks
    sync_task.cancel()
    bot_task.cancel()
    worker_task.cancel()
    
    # Close Bot session
    await bot.session.close()
    
    # Close connection pools
    await close_redis()
    await close_db()
    
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
