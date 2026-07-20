from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, Dict, Any
import httpx
import re
from app.middleware.auth import get_current_user
from app.services import order as order_service
from app.services import package as package_service
from app.workers.purchase_worker import add_purchase_job
from app.models.order import CreateOrderInput, WebhookInput

router = APIRouter()

@router.post("")
async def create_order(
    payload: CreateOrderInput,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    pkg_name = ""
    pkg_amount = 0
    pkg_price = 0.0
    provider_product_id = payload.package_id

    # Try fetching local package first if it's an integer
    local_pkg = None
    if payload.package_id.isdigit():
        local_pkg = await package_service.get_by_id(int(payload.package_id))

    if local_pkg:
        pkg_name = local_pkg["name"]
        pkg_amount = local_pkg["amount"]
        pkg_price = float(local_pkg["sell_price"])
        provider_product_id = local_pkg["provider_service_id"]
    else:
        # Fetch from provider API dynamically
        url = f"https://69544e6345d5c.xvest5.ru/DonatlarimBot/api.php?action=get_products&game_key={payload.game}"
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(url, timeout=15.0)
                if res.status_code == 200:
                    api_data = res.json()
                    products = api_data.get("products", [])
                    matching_prod = next((p for p in products if str(p["product_id"]) == payload.package_id), None)
                    if matching_prod:
                        pkg_name = matching_prod["name"]
                        pkg_price = float(matching_prod["price_uzs"])
                        # Extract first number from name as amount
                        amt_match = re.search(r'\d+', pkg_name)
                        pkg_amount = int(amt_match.group()) if amt_match else 0
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Product not found in provider list"
                        )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Failed to connect to provider API"
                    )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Provider lookup failed: {str(e)}"
            )

    # Create order in database
    order = await order_service.create({
        "user_id": current_user["id"],
        "game": payload.game,
        "category": payload.category,
        "package_id": None,  # Set to None to bypass foreign key constraint
        "package_name": pkg_name,
        "amount": pkg_amount,
        "price": pkg_price,
        "player_id": payload.player_id,
        "player_nickname": payload.player_nickname,
        "payment_method": payload.payment_method,
        "provider_product_id": provider_product_id,
        "server_id": payload.server_id
    })

    return {
        "success": True,
        "data": {
            "order": order
        }
    }

@router.get("")
async def get_orders(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    result = await order_service.get_by_user_id(current_user["id"], limit, offset)
    return {
        "success": True,
        "data": {
            "orders": result["orders"],
            "total": result["total"],
            "limit": limit,
            "offset": offset
        }
    }

@router.get("/{id}")
async def get_order_by_id(
    id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    order = await order_service.get_by_id(id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Ensure users only view their own orders
    if order["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    return {
        "success": True,
        "data": {
            "order": order
        }
    }



@router.post("/webhook")
async def payment_webhook(payload: WebhookInput):
    order = await order_service.get_by_id(payload.order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Optional: check if amount roughly matches (could be some logic here)
    if order["payment_status"] != "pending_payment":
        return {"success": True, "message": "Order is not pending payment"}

    # Update order payment status
    # Wait, the order service needs to support updating payment_status
    # Let's assume update_status can handle it or we add a custom query
    # Since update_status currently expects "status", let's update it in the query directly or modify update_status
    # For now, let's use the query module directly if update_status doesn't support payment_status
    from app.core.database import execute
    await execute("UPDATE orders SET payment_status = 'paid', updated_at = datetime('now') WHERE id = ?", payload.order_id)

    # Queue background task
    await add_purchase_job(order["id"], {
        "order_id": order["id"],
        "game": order["game"],
        "category": order["category"],
        "package_name": order["package_name"],
        "amount": order["amount"],
        "player_id": order["player_id"],
        "player_nickname": order.get("player_nickname")
    })

    return {"success": True, "message": "Payment confirmed and job queued"}

@router.get("/stats/public")
async def get_public_stats():
    from app.core.database import query_row
    pubg_res = await query_row("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'completed' AND game = 'pubg'")
    ff_res = await query_row("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'completed' AND game = 'freefire'")
    return {
        "success": True,
        "data": {
            "total_uc": int(pubg_res["total"]) if pubg_res else 0,
            "total_diamonds": int(ff_res["total"]) if ff_res else 0
        }
    }


@router.get("/stats/user")
async def get_user_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Return order count and total spent for the current user."""
    from app.core.database import query_row
    row = await query_row(
        """
        SELECT
            COUNT(*) as order_count,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as total_spent
        FROM orders
        WHERE user_id = ?
        """,
        current_user["id"]
    )
    return {
        "success": True,
        "data": {
            "order_count": row["order_count"] if row else 0,
            "total_spent": float(row["total_spent"]) if row else 0.0,
        }
    }
