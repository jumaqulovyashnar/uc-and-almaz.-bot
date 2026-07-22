import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.middleware.auth import get_current_user
from app.services import paylov as paylov_service
from app.services import order as order_service
from app.workers.purchase_worker import add_purchase_job

router = APIRouter()

class AddCardInput(BaseModel):
    cardNumber: str
    expireDate: str

class ConfirmCardInput(BaseModel):
    cardId: str
    otp: str

class PayWithCardInput(BaseModel):
    orderId: str
    cardId: str

@router.post("/card/add")
async def add_card(
    data: AddCardInput,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    1. Send card details & trigger SMS OTP via Paylov
    """
    user_id = str(current_user["telegram_id"])
    result = await paylov_service.create_user_card(user_id, data.cardNumber, data.expireDate)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Paylov API'dan javob olinmadi"
        )
    
    return {
        "success": True,
        "data": result
    }


@router.post("/card/confirm")
async def confirm_card(
    data: ConfirmCardInput,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    2. Confirm SMS OTP to bind card to user
    """
    result = await paylov_service.confirm_user_card(data.cardId, data.otp)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP tasdiqlashda xatolik"
        )
    
    return {
        "success": True,
        "data": result
    }


@router.get("/cards")
async def get_user_cards(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    3. Get all saved cards for current user
    """
    user_id = str(current_user["telegram_id"])
    cards = await paylov_service.get_all_user_cards(user_id)
    return {
        "success": True,
        "data": {
            "cards": cards
        }
    }


@router.delete("/card/{card_id}")
async def delete_card(
    card_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    4. Delete saved card
    """
    success = await paylov_service.delete_user_card(card_id)
    return {
        "success": success
    }


@router.post("/pay")
async def pay_with_saved_card(
    data: PayWithCardInput,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    5. Execute 1-click payment with saved card (NO OTP) & auto-deliver donate!
    """
    user_id = str(current_user["telegram_id"])
    
    # 1. Get order details
    order = await order_service.get_by_id(data.orderId)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buyurtma topilmadi"
        )
    
    # 2. Create receipt in Paylov
    receipt = await paylov_service.create_receipt(
        user_id=user_id,
        amount=float(order["price"]),
        order_id=str(order["id"])
    )
    
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Paylov to'lov cheki yaratishda xatolik"
        )
    
    transaction_id = receipt.get("result", {}).get("transactionId") or receipt.get("transactionId")
    if not transaction_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=receipt.get("error", {}).get("message", "Paylov transactionId olinmadi")
        )
    
    # 3. Pay receipt with saved card (Instant 1-Click)
    payment_result = await paylov_service.pay_receipt(
        transaction_id=str(transaction_id),
        card_id=data.cardId,
        user_id=user_id
    )
    
    if not payment_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Paylov kartadan pul yechishda xatolik"
        )
    
    # 4. Mark order paid & trigger instant background donate worker
    await order_service.update_payment_status(str(order["id"]), "paid")
    await order_service.update_status(str(order["id"]), "processing")
    
    # Trigger 0.1s instant background donation delivery
    await add_purchase_job(order)
    
    return {
        "success": True,
        "message": "To'lov muvaffaqiyatli amalga oshirildi va buyurtma avtomatik bajarilishga topshirildi!",
        "data": payment_result
    }
