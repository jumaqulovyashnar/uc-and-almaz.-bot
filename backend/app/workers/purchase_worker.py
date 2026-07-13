import asyncio
import json
import logging
import datetime
from typing import Dict, Any, Optional
from app.config import redis as redis_module
from app.services import order as order_service
from app.services import notification as notification_service
from app.services import automation as automation_service

QUEUE_KEY = "cyberpay:purchase_queue"
LOCK_PREFIX = "cyberpay:job_lock:"

def _get_redis():
    """Get the current redis client instance."""
    return redis_module.redis

async def add_purchase_job(order_id: int, data: Dict[str, Any]) -> bool:
    try:
        r = _get_redis()
        if not r:
            logging.error("[Queue] Redis not available, cannot add job")
            return False
        lock_key = f"{LOCK_PREFIX}{order_id}"
        # Set lock for 10 minutes, set only if it doesn't exist
        is_locked = await r.set(lock_key, "queued", ex=600, nx=True)
        if not is_locked:
            logging.info(f"[Queue] Order #{order_id} already locked in queue, skipping enqueue.")
            return False

        await r.lpush(QUEUE_KEY, json.dumps(data))
        logging.info(f"[Queue] Added purchase job for order #{order_id}")
        return True
    except Exception as e:
        logging.error(f"[Queue] Failed to add purchase job: {e}")
        return False

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

        # 2. Run browser automation
        if game == "freefire":
            result = await automation_service.run_garena_automation(player_id)
            if not result.get("success"):
                raise RuntimeError(result.get("error") or "Garena automation failed")
        elif game == "pubg":
            result = await automation_service.run_midasbuy_automation(player_id, package_name)
            if not result.get("success"):
                raise RuntimeError(result.get("error") or "Midasbuy automation failed")
        else:
            raise ValueError(f"Unsupported game: {game}")

        # 3. Mark order as completed
        await order_service.update_status(
            order_id, 
            "completed", 
            {"completed_at": datetime.datetime.now()}
        )

        # 4. Fetch updated order and notify user
        updated_order = await order_service.get_by_id(order_id)
        if updated_order:
            await notification_service.send_order_update(updated_order["telegram_id"], updated_order)

        logging.info(f"[Worker] Successfully completed order #{order_id}")
        
        # Clean up lock key on success
        r = _get_redis()
        if r:
            await r.delete(f"{LOCK_PREFIX}{order_id}")

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
                f"Taxallusi: {player_nickname or 'Noma\\'lum'}\n"
                f"Xatolik: {err_msg}"
            )
            await notification_service.send_admin_alert(alert_text)

            # Retry logic: match BullMQ attempts (3) and backoff (exponential 2000ms delay)
            retry_count = full_order.get("retry_count", 0)
            if retry_count < 3:
                delay = 2 * (2 ** retry_count) # 2s, 4s, 8s backoff
                logging.info(f"[Worker] Scheduling retry {retry_count + 1}/3 for order #{order_id} in {delay} seconds...")
                # Release lock to allow re-queueing
                r = _get_redis()
                if r:
                    await r.delete(f"{LOCK_PREFIX}{order_id}")
                asyncio.create_task(retry_job_after_delay(order_id, job_data, delay))
            else:
                logging.error(f"[Worker] Max retries (3) reached for order #{order_id}. Giving up.")

async def retry_job_after_delay(order_id: int, job_data: Dict[str, Any], delay: int) -> None:
    await asyncio.sleep(delay)
    # Reset order status to pending for retry
    await order_service.update_status(order_id, "pending")
    # Add back to queue
    await add_purchase_job(order_id, job_data)

async def start_purchase_worker() -> asyncio.Task:
    logging.info("[Worker] Starting background purchase worker loop...")
    
    async def worker_loop():
        while True:
            try:
                r = _get_redis()
                if not r:
                    await asyncio.sleep(5.0)
                    continue
                # BRPOP blocks until an item is available, returns (list_key, value)
                res = await r.brpop(QUEUE_KEY, timeout=5)
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
                
    task = asyncio.create_task(worker_loop())
    logging.info("[Worker] Background worker task created successfully")
    return task
