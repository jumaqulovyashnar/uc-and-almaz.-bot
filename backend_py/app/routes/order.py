import re
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field, model_validator
from typing import Optional, Dict, Any
from app.middleware.auth import get_current_user
from app.services import order as order_service
from app.services import package as package_service
from app.workers.purchase_worker import add_purchase_job

router = APIRouter()

# Input validation schema
class CreateOrderInput(BaseModel):
    game: str = Field(..., pattern="^(pubg|freefire)$")
    category: str = Field(..., min_length=1)
    package_id: int = Field(..., gt=0)
    player_id: str = Field(..., min_length=1, max_length=50)
    player_nickname: Optional[str] = Field(None, max_length=100)
    payment_method: str = Field(..., pattern="^(uzcard|humo|visa)$")

    @model_validator(mode="after")
    def validate_player_id(self) -> 'CreateOrderInput':
        if self.game == "pubg":
            if not re.match(r"^\d{5,12}$", self.player_id):
                raise ValueError("PUBG Player ID faqat 5-12 ta raqamdan iborat bo'lishi kerak (M-n: 5123456789)")
        elif self.game == "freefire":
            if not re.match(r"^\d{8,12}$", self.player_id):
                raise ValueError("Free Fire Player ID faqat 8-12 ta raqamdan iborat bo'lishi kerak (M-n: 1234567890)")
        return self

@router.post("")
async def create_order(
    payload: CreateOrderInput,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    # Verify package exists
    pkg = await package_service.get_by_id(payload.package_id)
    if not pkg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )

    # Create order in database
    order = await order_service.create({
        "user_id": current_user["id"],
        "game": payload.game,
        "category": payload.category,
        "package_id": payload.package_id,
        "package_name": pkg["name"],
        "amount": pkg["amount"],
        "price": float(pkg["sell_price"]),
        "player_id": payload.player_id,
        "player_nickname": payload.player_nickname,
        "payment_method": payload.payment_method
    })

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
