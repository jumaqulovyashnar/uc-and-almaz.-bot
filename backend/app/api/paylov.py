import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.middleware.auth import get_current_user
from app.services import paylov as paylov_service
from app.services import order as order_service
from app.workers.purchase_worker import add_purchase_job

router = APIRouter()

# ── Input Schemas ──
class AddCardInput(BaseModel):
    cardNumber: str
    expireDate: str

class ConfirmCardInput(BaseModel):
    cardId: str
    otp: str
    cardName: Optional[str] = None
    pinfl: Optional[str] = None

class PayWithCardInput(BaseModel):
    orderId: str
    cardId: str

class CreateReceiptInput(BaseModel):
    amount: float
    orderId: str

class PayReceiptInput(BaseModel):
    transactionId: str
    cardId: str

class CreateHoldInput(BaseModel):
    amount: float
    cardId: str

class ChargeHoldInput(BaseModel):
    holdId: str
    amount: Optional[float] = None

class DismissHoldInput(BaseModel):
    holdId: str

class ServiceInfoInput(BaseModel):
    serviceId: str
    fields: Dict[str, Any]

class CreateServicePaymentInput(BaseModel):
    serviceId: str
    amount: float
    fields: Dict[str, Any]

class PayServicePaymentInput(BaseModel):
    transactionId: str
    cardId: str

class SplitPaymentInput(BaseModel):
    transactionId: str
    splits: List[Dict[str, Any]]

class RegisterFiscalInput(BaseModel):
    transactionId: str
    fiscalData: Dict[str, Any]

class RefundFiscalInput(BaseModel):
    transactionId: str
    reason: str

class ActivityTypesInput(BaseModel):
    pinfl: str


# ==============================================================================
# 1-6) USER CARDS ROUTES
# ==============================================================================

@router.post("/card/add")
async def add_card(data: AddCardInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """1. POST /merchant/userCard/createUserCard/"""
    user_id = str(current_user["telegram_id"])
    res = await paylov_service.create_user_card(user_id, data.cardNumber, data.expireDate)
    if not res:
        raise HTTPException(status_code=400, detail="Karta qo'shishda xatolik")
    return {"success": True, "data": res}

@router.post("/card/confirm")
async def confirm_card(data: ConfirmCardInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """2. POST /merchant/userCard/confirmUserCardCreate/"""
    res = await paylov_service.confirm_user_card(
        card_id=data.cardId,
        otp=data.otp,
        card_name=data.cardName,
        pinfl=data.pinfl
    )
    if not res:
        raise HTTPException(status_code=400, detail="OTP tasdiqlashda xatolik")
    return {"success": True, "data": res}

@router.delete("/card/{card_id}")
async def delete_card(card_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """3. DELETE /merchant/userCard/deleteUserCard/"""
    res = await paylov_service.delete_user_card(card_id)
    return {"success": True, "data": res}

@router.get("/cards")
async def get_all_cards(current_user: Dict[str, Any] = Depends(get_current_user)):
    """4. GET /merchant/userCard/getAllUserCards/"""
    user_id = str(current_user["telegram_id"])
    res = await paylov_service.get_all_user_cards(user_id)
    return {"success": True, "data": res}

@router.get("/card/{card_id}")
async def get_single_card(card_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """5. GET /merchant/userCard/getUserCard/"""
    res = await paylov_service.get_user_card(card_id)
    return {"success": True, "data": res}

@router.get("/card/{card_id}/history")
async def get_card_history(card_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """6. GET /merchant/getCardHistory/"""
    res = await paylov_service.get_card_history(card_id)
    return {"success": True, "data": res}


# ==============================================================================
# 7-9) RECEIPTS & TRANSACTIONS ROUTES
# ==============================================================================

@router.post("/receipts/create")
async def create_receipt(data: CreateReceiptInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """7. POST /merchant/receipts/create/"""
    user_id = str(current_user["telegram_id"])
    res = await paylov_service.create_receipt(user_id, data.amount, data.orderId)
    return {"success": True, "data": res}

@router.post("/receipts/pay")
async def pay_receipt(data: PayReceiptInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """8. POST /merchant/receipts/pay/"""
    user_id = str(current_user["telegram_id"])
    res = await paylov_service.pay_receipt(data.transactionId, data.cardId, user_id)
    return {"success": True, "data": res}

@router.get("/transactions/{transaction_id}")
async def get_transactions(transaction_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """9. GET /merchant/getTransactions/"""
    res = await paylov_service.get_transactions(transaction_id)
    return {"success": True, "data": res}


# ==============================================================================
# 10-13) PAYMENT HOLD ROUTES
# ==============================================================================

@router.post("/hold/create")
async def create_hold(data: CreateHoldInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """10. POST /merchant/payment/hold/create/"""
    user_id = str(current_user["telegram_id"])
    res = await paylov_service.create_payment_hold(user_id, data.amount, data.cardId)
    return {"success": True, "data": res}

@router.post("/hold/charge")
async def charge_hold(data: ChargeHoldInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """11. POST /merchant/payment/hold/charge/"""
    res = await paylov_service.charge_payment_hold(data.holdId, data.amount)
    return {"success": True, "data": res}

@router.post("/hold/dismiss")
async def dismiss_hold(data: DismissHoldInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """12. POST /merchant/payment/hold/dismiss/"""
    res = await paylov_service.dismiss_payment_hold(data.holdId)
    return {"success": True, "data": res}

@router.get("/hold/{hold_id}/status")
async def get_hold_status(hold_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """13. GET /merchant/payment/hold/status/"""
    res = await paylov_service.get_hold_status(hold_id)
    return {"success": True, "data": res}


# ==============================================================================
# 14-20) SERVICE PAYMENTS ROUTES
# ==============================================================================

@router.get("/service/list")
async def get_service_list(current_user: Dict[str, Any] = Depends(get_current_user)):
    """14. GET /servicePayment/list/"""
    res = await paylov_service.get_service_list()
    return {"success": True, "data": res}

@router.get("/service/fields/{service_id}")
async def get_service_fields(service_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """15. GET /servicePayment/fields/{serviceId}/"""
    res = await paylov_service.get_service_fields(service_id)
    return {"success": True, "data": res}

@router.post("/service/info")
async def get_service_info(data: ServiceInfoInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """16. POST /servicePayment/info/"""
    res = await paylov_service.get_service_info(data.serviceId, data.fields)
    return {"success": True, "data": res}

@router.post("/service/create")
async def create_service_payment(data: CreateServicePaymentInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """17. POST /servicePayment/create/"""
    res = await paylov_service.create_service_payment(data.serviceId, data.amount, data.fields)
    return {"success": True, "data": res}

@router.post("/service/pay")
async def pay_service_payment(data: PayServicePaymentInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """18. POST /servicePayment/pay/"""
    res = await paylov_service.pay_service_payment(data.transactionId, data.cardId)
    return {"success": True, "data": res}

@router.get("/service/transaction/status/{transaction_id}")
async def get_service_transaction_status(transaction_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """19. GET /servicePayment/transaction/status/"""
    res = await paylov_service.get_service_transaction_status(transaction_id)
    return {"success": True, "data": res}

@router.get("/service/transaction/all")
async def get_all_service_transactions(current_user: Dict[str, Any] = Depends(get_current_user)):
    """20. GET /servicePayment/transaction/all/"""
    res = await paylov_service.get_all_service_transactions()
    return {"success": True, "data": res}


# ==============================================================================
# 21-22) SPLIT PAYMENT ROUTES
# ==============================================================================

@router.post("/split")
async def split_payment(data: SplitPaymentInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """21. POST /merchant/splitPayment/"""
    res = await paylov_service.split_payment(data.transactionId, data.splits)
    return {"success": True, "data": res}

@router.get("/split/status/{transaction_id}")
async def get_split_status(transaction_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """22. GET /merchant/splitPayment/status/"""
    res = await paylov_service.get_split_payment_status(transaction_id)
    return {"success": True, "data": res}


# ==============================================================================
# 23-26) FISCALIZATION ROUTES
# ==============================================================================

@router.post("/fiscalization/register")
async def register_fiscal(data: RegisterFiscalInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """23. POST /merchant/fiscalization/register/"""
    res = await paylov_service.register_fiscalization(data.transactionId, data.fiscalData)
    return {"success": True, "data": res}

@router.get("/fiscalization/status/{transaction_id}")
async def get_fiscal_status(transaction_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """24. GET /merchant/fiscalization/status/"""
    res = await paylov_service.get_fiscalization_status(transaction_id)
    return {"success": True, "data": res}

@router.post("/fiscalization/refund")
async def refund_fiscal(data: RefundFiscalInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """25. POST /merchant/fiscalization/refund/"""
    res = await paylov_service.refund_fiscalization(data.transactionId, data.reason)
    return {"success": True, "data": res}

@router.post("/fiscalization/activity-types")
async def check_activity_types(data: ActivityTypesInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """26. POST /merchant/fiscalization/activity-types/"""
    res = await paylov_service.check_pinfl_activity_types(data.pinfl)
    return {"success": True, "data": res}


# ==============================================================================
# HIGH-LEVEL 1-CLICK INSTANT PAY ROUTE (SAVED CARD TO AUTOMATIC DONATE)
# ==============================================================================

@router.post("/pay")
async def pay_with_saved_card(data: PayWithCardInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user["telegram_id"])
    order = await order_service.get_by_id(data.orderId)
    if not order:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    
    receipt = await paylov_service.create_receipt(user_id, float(order["price"]), str(order["id"]))
    if not receipt:
        raise HTTPException(status_code=400, detail="To'lov cheki yaratib bo'lmadi")
    
    transaction_id = receipt.get("result", {}).get("transactionId") or receipt.get("transactionId")
    if not transaction_id:
        raise HTTPException(status_code=400, detail="Transaction ID olinmadi")
    
    payment_result = await paylov_service.pay_receipt(str(transaction_id), data.cardId, user_id)
    if not payment_result:
        raise HTTPException(status_code=400, detail="Kartadan pul yechishda xatolik")
    
    await order_service.update_payment_status(str(order["id"]), "paid")
    await order_service.update_status(str(order["id"]), "processing")
    await add_purchase_job(order)
    
    return {
        "success": True,
        "message": "To'lov bajarildi va donat avtomatik yuborildi!",
        "data": payment_result
    }
