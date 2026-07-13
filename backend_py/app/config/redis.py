import logging
import redis.asyncio as aioredis
from typing import Optional
from app.config.env import env

# Global Redis client
redis: Optional[aioredis.Redis] = None

async def init_redis() -> None:
    global redis
    try:
        redis = aioredis.from_url(
            env.REDIS_URL,
            decode_responses=True,
            socket_timeout=5.0,
            retry_on_timeout=True
        )
        logging.info("[Redis] Connected successfully")
    except Exception as e:
        logging.error(f"[Redis] Initialization failed: {e}")
        raise e

async def close_redis() -> None:
    global redis
    if redis:
        await redis.close()
        logging.info("[Redis] Connection closed")

async def test_redis_connection() -> bool:
    global redis
    temp_redis = False
    if not redis:
        try:
            temp_redis = True
            await init_redis()
        except Exception:
            return False
            
    try:
        await redis.ping()
        logging.info("[Redis] PING successful")
        return True
    except Exception as e:
        logging.error(f"[Redis] PING failed: {e}")
        return False
    finally:
        if temp_redis:
            await close_redis()
