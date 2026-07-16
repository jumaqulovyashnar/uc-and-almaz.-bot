import asyncio
import json
import logging
import datetime
import time
from typing import Dict, Any, Optional
from app.config.redis import get_redis
from app.services import order as order_service
from app.services import notification as notification_service
from app.services import automation as automation_service

QUEUE_KEY = "cyberpay:purchase_queue"
DELAYED_QUEUE_KEY = "cyberpay:delayed_purchase_queue"
LOCK_PREFIX = "cyberpay:job_lock:"

async def add_purchase_job(order_id: int, data: Dict[str, Any]) -> bool:
    try:
        lock_key = f"{LOCK_PREFIX}{order_id}"
        # Set lock for 10 minutes, set only if it doesn't exist
        is_locked = await get_redis().set(lock_key, "queued", ex=600, nx=True)
        if not is_locked:
            logging.info(f"[Queue] Order #{order_id} already locked in queue, skipping enqueue.")
            return False

        await get_redis().lpush(QUEUE_KEY, json.dumps(data))
        logging.info(f"[Queue] Added purchase job for order #{order_id}")
        return True
    except Exception as e:
        logging.error(f"[Queue] Failed to add purchase job: {e}")
        return False

import httpx
import os
from app.config.env import env

async def call_provider_api(game: str, player_id: str, provider_service_id: str, order_id: int) -> Dict[str, Any]:
    api_key = env.PROVIDER_API_KEY
    if not api_key:
        return {"success": False, "error": "PROVIDER_API_KEY is not configured"}
        
    url = os.getenv("PROVIDER_API_URL", "https://api.provider.com/v1/orders")
    
    # We send standard SMM Reseller Panel params (key, action, service, link, quantity)
    payload = {
        "key": api_key,
        "action": "add",
        "service": provider_service_id,
        "link": player_id,
        "quantity": 1,
        "custom_id": str(order_id)
    }
    
    try:
        async def make_request():
            async with httpx.AsyncClient() as client:
                response = await client.post(url, data=payload, timeout=20.0)
                if response.status_code == 200:
                    res_data = response.json()
                    if "order" in res_data or res_data.get("status") == "success" or "order_id" in res_data:
                        order_id_val = res_data.get("order") or res_data.get("order_id") or "12345"
                        return {"success": True, "provider_order_id": str(order_id_val)}
                    else:
                        return {"success": False, "error": res_data.get("error") or "Unknown API response format"}
                else:
                    return {"success": False, "error": f"API returned status code {response.status_code}"}
        
        # Try 3 times with 2 seconds delay if API fails
        for attempt in range(3):
            res = await make_request()
            if res["success"]:
                return res
            if attempt < 2:
                await asyncio.sleep(2.0)
        return {"success": False, "error": "API failed after 3 attempts"}
    except Exception as e:
        return {"success": False, "error": f"API request failed: {str(e)}"}

async def process_purchase_job(job_data: Dict[str, Any]) -> None:
    order_id = job_data["order_id"]
    game = job_data["game"]
    package_name = job_data["package_name"]
    player_id = job_data["player_id"]
    player_nickname = job_data.get("player_nickname")
    
    logging.info(f"[Worker] Started processing order #{order_id} for {game} ({package_name})")
    
    try:
        # 1. Update order status to 'processing'
        await order_service.update_status(order_id, "processing")

        # 2. Fetch package details to get provider_service_id
        from app.config.database import query_row, execute
        order_db = await query_row("SELECT package_id FROM orders WHERE id = ?", order_id)
        provider_service_id = None
        if order_db and order_db["package_id"]:
            pkg = await query_row("SELECT provider_service_id FROM game_packages WHERE id = ?", order_db["package_id"])
            if pkg:
                provider_service_id = pkg["provider_service_id"]
                
        if not provider_service_id:
            provider_service_id = f"{game}_{package_name.lower().replace(' ', '_')}"

        # 3. Call Provider API instead of browser automation
        result = await call_provider_api(game, player_id, provider_service_id, order_id)

        if not result.get("success"):
            err_msg = result.get("error") or "Provider API failed"
            # Update status to awaiting_admin_review on final failure
            await order_service.update_status(
                order_id, 
                "awaiting_admin_review", 
                {"error_message": err_msg}
            )
            
            # Notify admin
            alert_text = (
                f"⚠️ <b>Qo'lda tekshirish talab etiladi (API Xatoligi)!</b> \n"
                f"Buyurtma ID: #{order_id}\n"
                f"O'yin: {game.upper()}\n"
                f"Xatolik: {err_msg}"
            )
            await notification_service.send_admin_alert(alert_text)
            
            await get_redis().delete(f"{LOCK_PREFIX}{order_id}")
            return # Stop processing

        # Save provider_order_id to DB
        await execute("UPDATE orders SET provider_order_id = ? WHERE id = ?", result["provider_order_id"], order_id)

        # 3. Mark order as completed
        await order_service.update_status(
            order_id, 
            "completed", 
            {"completed_at": datetime.datetime.now(), "screenshot_url": result.get("screenshot_url")}
        )

        # 4. Fetch updated order and notify user
        updated_order = await order_service.get_by_id(order_id)
        if updated_order:
            await notification_service.send_order_update(updated_order["telegram_id"], updated_order)

        logging.info(f"[Worker] Successfully completed order #{order_id}")
        
        # Clean up lock key on success
        await get_redis().delete(f"{LOCK_PREFIX}{order_id}")

    except Exception as error:
        err_msg = str(error)
        logging.error(f"[Worker] Error processing order #{order_id}: {err_msg}")

        # Update order status to failed in database
        updated_order = await order_service.update_status(
            order_id, 
            "failed", 
            {"error_message": err_msg}
        )
        
        # Fetch fully joined order details
        full_order = await order_service.get_by_id(order_id)
        if full_order:
            # Notify user of failure
            await notification_service.send_order_update(full_order["telegram_id"], full_order)
            
            # Send alert to admin
            alert_text = (
                f"❌ <b>Buyurtma Xatoligi!</b> \n"
                f"Buyurtma ID: #{order_id}\n"
                f"O'yin: {game.upper()}\n"
                f"Paket: {package_name}\n"
                f"O'yinchi ID: {player_id}\n"
                f"Taxallusi: {player_nickname or 'Noma\'lum'}\n"
                f"Xatolik: {err_msg}"
            )
            await notification_service.send_admin_alert(alert_text)

            # Retry logic: match BullMQ attempts (3) and backoff (exponential 2000ms delay)
            retry_count = full_order.get("retry_count", 0)
            if retry_count < 3:
                delay = 2 * (2 ** retry_count) # 2s, 4s, 8s backoff
                logging.info(f"[Worker] Scheduling retry {retry_count + 1}/3 for order #{order_id} in {delay} seconds...")
                # Release lock to allow re-queueing
                await get_redis().delete(f"{LOCK_PREFIX}{order_id}")
                score = int(time.time()) + delay
                # Reset order status to pending for retry
                await order_service.update_status(order_id, "pending")
                await get_redis().zadd(DELAYED_QUEUE_KEY, {json.dumps(job_data): score})
            else:
                logging.error(f"[Worker] Max retries (3) reached for order #{order_id}. Giving up.")

async def start_purchase_worker() -> asyncio.Task:
    logging.info("[Worker] Starting background purchase worker loop...")
    
    async def delayed_jobs_loop():
        while True:
            try:
                now = int(time.time())
                # Get jobs with score <= now
                jobs = await get_redis().zrangebyscore(DELAYED_QUEUE_KEY, 0, now)
                if jobs:
                    for job_str in jobs:
                        removed = await get_redis().zrem(DELAYED_QUEUE_KEY, job_str)
                        if removed:
                            await get_redis().lpush(QUEUE_KEY, job_str)
                            logging.info("[Queue] Moved delayed job to main queue")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"[Worker] Delayed job processing error: {e}")
            await asyncio.sleep(1.0)

    async def worker_loop():
        while True:
            try:
                # BRPOP blocks until an item is available, returns (list_key, value)
                res = await get_redis().brpop(QUEUE_KEY, timeout=5)
                if not res:
                    continue
                
                _, job_data_str = res
                job_data = json.loads(job_data_str)
                
                # Process the job
                await process_purchase_job(job_data)
            except asyncio.CancelledError:
                logging.info("[Worker] Worker loop stopped")
                break
            except Exception as e:
                logging.error(f"[Worker] Exception in worker loop: {e}")
                await asyncio.sleep(2.0)
                
    asyncio.create_task(delayed_jobs_loop())
    task = asyncio.create_task(worker_loop())
    logging.info("[Worker] Background worker task created successfully")
    return task
