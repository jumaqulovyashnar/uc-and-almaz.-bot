import logging
import fakeredis.aioredis as fakeredis_aio
import redis.asyncio as aioredis
from typing import Optional, Union
from app.config.env import env

# Global Redis client
redis: Optional[Union[aioredis.Redis, fakeredis_aio.FakeRedis]] = None
_using_fake = False

async def init_redis() -> None:
    global redis, _using_fake
    
    # First, try connecting to a real Redis server
    try:
        real_redis = aioredis.from_url(
            env.REDIS_URL,
            decode_responses=True,
            socket_timeout=3.0,
            socket_connect_timeout=3.0,
            retry_on_timeout=False
        )
        await real_redis.ping()
        redis = real_redis
        _using_fake = False
        logging.info("[Redis] Connected to real Redis server successfully")
    except Exception as e:
        # Real Redis not available — fall back to fakeredis
        logging.warning(f"[Redis] Real Redis not available ({e}), using in-memory fakeredis")
        redis = fakeredis_aio.FakeRedis(decode_responses=True)
        _using_fake = True
        logging.info("[Redis] In-memory fakeredis initialized successfully")

async def close_redis() -> None:
    global redis, _using_fake
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
