import time
import logging
import json
import psutil
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from app.middleware.auth import get_admin_user
from app.services import order as order_service
from app.config.database import query, test_connection
from app.config.redis import test_redis_connection
from app.workers.purchase_worker import add_purchase_job

router = APIRouter(dependencies=[Depends(get_admin_user)])

START_TIME = time.time()

class UpdateConfigInput(BaseModel):
    key: str
    value: Any

@router.get("/stats")
async def get_stats():
    stats = await order_service.get_stats()
    return {
        "success": True,
        "data": {
            "stats": stats
        }
    }

@router.get("/orders")
async def get_orders(
    status: Optional[str] = None,
    game: Optional[str] = None,
    user_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    filters = {
        "status": status,
        "game": game,
        "user_id": user_id,
        "date_from": date_from,
        "date_to": date_to,
        "limit": limit,
        "offset": offset
    }
    
    result = await order_service.get_admin_orders(filters)
    return {
        "success": True,
        "data": {
            "orders": result["orders"],
            "total": result["total"],
            "limit": limit,
            "offset": offset
        }
    }

@router.post("/orders/{id}/retry")
async def retry_order(id: int):
    order = await order_service.get_by_id(id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
        
    if order["status"] != "failed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only failed orders can be retried"
        )
        
    # Reset status to pending
    await order_service.update_status(id, "pending")
    
    # Re-queue the purchase job
    await add_purchase_job(id, {
        "order_id": id,
        "game": order["game"],
        "category": order["category"],
        "package_name": order["package_name"],
        "amount": order["amount"],
        "player_id": order["player_id"],
        "player_nickname": order.get("player_nickname"),
        "retry": True
    })
    
    return {
        "success": True,
        "data": {
            "message": "Order re-queued for processing"
        }
    }

@router.get("/bot-status")
async def get_bot_status():
    # Database health
    db_ok = await test_connection()
    db_status = "healthy" if db_ok else "unhealthy"
    
    # Redis health
    redis_ok = await test_redis_connection()
    redis_status = "healthy" if redis_ok else "unhealthy"
    
    # System config
    config = {}
    try:
        config_rows = await query("SELECT key, value FROM system_config")
        for row in config_rows:
            # asyncpg parses JSONB to Python structures natively
            val = row["value"]
            if isinstance(val, str):
                try:
                    val = json.loads(val)
                except Exception:
                    pass
            config[row["key"]] = val
    except Exception as e:
        logging.error(f"[AdminRoute] Failed to load config in healthcheck: {e}")

    # Process stats
    process = psutil.Process()
    memory_info = process.memory_info()
    
    return {
        "success": True,
        "data": {
            "status": "running",
            "database": db_status,
            "redis": redis_status,
            "config": config,
            "uptime": time.time() - START_TIME,
            "memory": {
                "rss": memory_info.rss,
                "vms": memory_info.vms
            },
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
    }

@router.put("/config")
async def update_config(payload: UpdateConfigInput):
    allowed_keys = ["maintenance_pubg", "maintenance_freefire"]
    if payload.key not in allowed_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid config key. Allowed: {', '.join(allowed_keys)}"
        )
        
    from app.config.database import db
    await db.execute(
        "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, datetime('now'))",
        (payload.key, json.dumps(payload.value))
    )
    await db.commit()
    
    return {
        "success": True,
        "data": {
            "key": payload.key,
            "value": payload.value,
            "message": "Config updated successfully"
        }
    }
