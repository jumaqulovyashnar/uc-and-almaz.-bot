import logging
import redis.asyncio as aioredis
from typing import Optional
from app.core.env import env

# Global Redis client
redis: Optional[aioredis.Redis] = None

def get_redis() -> aioredis.Redis:
    global redis
    if redis is None:
        raise RuntimeError("Redis connection has not been initialized. Call init_redis() first.")
    return redis

async def init_redis() -> None:
    global redis
    try:
        real_redis = aioredis.from_url(
            env.REDIS_URL,
            decode_responses=True,
            socket_timeout=None,
            socket_connect_timeout=3.0,
            retry_on_timeout=True
        )
        await real_redis.ping()
        redis = real_redis
        logging.info("[Redis] Connected to Redis server successfully")
    except Exception as e:
        logging.critical(f"[Redis] Connection failed to {env.REDIS_URL}: {e}")
        redis = None
        raise RuntimeError(f"Redis connection failed. Application startup aborted: {e}")

async def close_redis() -> None:
    global redis
    if redis:
        try:
            await redis.close()
        except Exception:
            pass
        redis = None
        logging.info("[Redis] Connection closed")

async def test_redis_connection() -> bool:
    global redis
    if not redis:
        try:
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
