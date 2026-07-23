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
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", True)}

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
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res}

class CheckPinflMatchInput(BaseModel):
    cardId: str
    pinfl: str

@router.post("/card/check-pinfl")
async def check_pinfl_match(data: CheckPinflMatchInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """POST /merchant/userCard/checkPinflMatch/"""
    res = await paylov_service.check_pinfl_match(data.cardId, data.pinfl)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


class CheckPhoneMatchInput(BaseModel):
    cardId: str
    phone: str

@router.post("/card/check-phone")
async def check_phone_match(data: CheckPhoneMatchInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """POST /merchant/userCard/checkPhoneMatch/"""
    res = await paylov_service.check_phone_match(data.cardId, data.phone)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


class CancelPaymentInput(BaseModel):
    transactionId: str

@router.post("/payment/cancel")
async def cancel_payment(data: CancelPaymentInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """POST /merchant/payment/cancel/"""
    res = await paylov_service.cancel_payment(data.transactionId)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.get("/card/{card_id}/history")
async def get_card_history(
    card_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """6. GET /merchant/getCardHistory/?cardId={cardId}&from_date={fromDate}&to_date={toDate}"""
    res = await paylov_service.get_card_history(card_id, from_date, to_date)
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


class CreateCheckoutLinkInput(BaseModel):
    orderId: str
    returnUrl: Optional[str] = None

@router.post("/checkout-link")
async def create_checkout_link(data: CreateCheckoutLinkInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Generate Base64 Paylov Checkout link for an order according to Paylov Spec.
    """
    order = await order_service.get_by_id(data.orderId)
    if not order:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")

    merchant_id = env.PAYLOV_MERCHANT_ID or env.PAYLOV_CONSUMER_KEY or "76345ec0-f509-49c1-a5e0-26865e715b13"
    return_url = data.returnUrl or env.WEBAPP_URL
    link = paylov_service.generate_checkout_link(
        merchant_id=merchant_id,
        amount=float(order["price"]),
        order_id=str(order["id"]),
        return_url=return_url
    )
    return {
        "success": True,
        "data": {
            "checkoutUrl": link
        }
    }


# ==============================================================================
# DIRECT CARD PAYMENT WITHOUT REGISTRATION (1-TIME SMS OTP)
# ==============================================================================

class PaymentWithoutRegistrationInput(BaseModel):
    cardNumber: str
    expireDate: str
    orderId: str

class ConfirmPaymentWithoutRegistrationInput(BaseModel):
    transactionId: str
    otp: str
    orderId: Optional[str] = None

@router.post("/payment-without-registration")
async def payment_without_registration(data: PaymentWithoutRegistrationInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    1. POST /merchant/paymentWithoutRegistration/
    Initiate direct card payment (Uzcard / Humo) and trigger 6-digit SMS OTP.
    """
    order = await order_service.get_by_id(data.orderId)
    if not order:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")

    res = await paylov_service.payment_without_registration(
        card_number=data.cardNumber,
        expire_date=data.expireDate,
        amount=float(order["price"]),
        order_id=str(order["id"])
    )
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)

    return {"success": True, "data": res.get("result", res)}


@router.post("/confirm-payment-without-registration")
async def confirm_payment_without_registration(data: ConfirmPaymentWithoutRegistrationInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    2. POST /merchant/confirmPayment/
    Confirm direct card payment with 6-digit SMS OTP and fulfill order.
    """
    res = await paylov_service.confirm_payment_without_registration(
        transaction_id=data.transactionId,
        otp=data.otp
    )
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)

    # Fulfill order if orderId provided
    if data.orderId:
        order = await order_service.get_by_id(data.orderId)
        if order:
            await order_service.update_payment_status(str(order["id"]), "paid")
            await order_service.update_status(str(order["id"]), "processing")
            try:
                from app.services.referral import process_referral_cashback
                await process_referral_cashback(order["id"])
            except Exception as e:
                logging.error(f"[PaylovDirect] Referral cashback error: {e}")
            await add_purchase_job(order)

    return {"success": True, "data": res.get("result", res)}


# ==============================================================================
# 10) P2P CARD-TO-CARD TRANSFERS ROUTES
# ==============================================================================

class P2PReceiverInfoInput(BaseModel):
    cardNumber: str

class P2PReceiverListInput(BaseModel):
    phoneNumber: str

class P2PCreateTransferInput(BaseModel):
    cardNumber: str
    amount: float
    cardId: Optional[str] = None
    serviceId: Optional[str] = None
    commission: Optional[int] = None

class P2PConfirmTransferInput(BaseModel):
    transactionId: str
    cardId: str


@router.post("/p2p/receiver")
async def get_p2p_receiver_info(data: P2PReceiverInfoInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """1. POST /merchant/p2p/receiver/"""
    res = await paylov_service.get_p2p_receiver_info(data.cardNumber)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.post("/p2p/receiver/list")
async def get_p2p_receiver_list(data: P2PReceiverListInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """2. POST /merchant/p2p/receiver/list/"""
    res = await paylov_service.get_p2p_receiver_list_by_phone(data.phoneNumber)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.post("/p2p/transfer/create")
async def create_p2p_transfer(data: P2PCreateTransferInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """3. POST /merchant/p2p/transfer/create/"""
    res = await paylov_service.create_p2p_transfer(
        card_number=data.cardNumber,
        amount=data.amount,
        sender_card_id=data.cardId,
        service_id=data.serviceId,
        commission=data.commission
    )
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.post("/p2p/transfer/confirm")
async def confirm_p2p_transfer(data: P2PConfirmTransferInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """4. POST /merchant/p2p/transfer/confirm/"""
    res = await paylov_service.confirm_p2p_transfer(data.transactionId, data.cardId)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


# ==============================================================================
# 11) HOLD PAYMENTS ROUTES
# ==============================================================================

class HoldCreateInput(BaseModel):
    cardId: str
    amount: float
    time: int  # minutes, max 40320 (28 days)
    userId: Optional[str] = None
    account: Optional[Dict[str, Any]] = None
    externalId: Optional[str] = None
    serviceId: Optional[str] = None

class HoldChargeInput(BaseModel):
    transactionId: str
    amount: float

class HoldDismissInput(BaseModel):
    transactionId: str


@router.post("/payment/hold/create")
async def hold_create(data: HoldCreateInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """1. POST /merchant/payment/hold/create/"""
    res = await paylov_service.hold_create(
        card_id=data.cardId,
        amount=data.amount,
        time_minutes=data.time,
        user_id=data.userId,
        account=data.account,
        external_id=data.externalId,
        service_id=data.serviceId
    )
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.post("/payment/hold/charge")
async def hold_charge(data: HoldChargeInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """2. POST /merchant/payment/hold/charge/"""
    res = await paylov_service.hold_charge(data.transactionId, data.amount)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.post("/payment/hold/dismiss")
async def hold_dismiss(data: HoldDismissInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """3. POST /merchant/payment/hold/dismiss/"""
    res = await paylov_service.hold_dismiss(data.transactionId)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.get("/payment/hold/status")
async def hold_status(
    externalId: Optional[str] = None,
    transactionId: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """4. GET /merchant/payment/hold/status/"""
    res = await paylov_service.hold_status(externalId, transactionId)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


# ==============================================================================
# 12) ACCOUNT2CARD (A2C) PAYOUTS ROUTES
# ==============================================================================

class A2CPerformTransactionInput(BaseModel):
    amountInTiyin: int
    userId: str
    cardId: str
    externalId: Optional[str] = None


@router.post("/a2c/performTransaction")
async def a2c_perform_transaction(data: A2CPerformTransactionInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """1. POST /merchant/a2c/performTransaction/"""
    res = await paylov_service.a2c_perform_transaction(
        amount_in_tiyin=data.amountInTiyin,
        user_id=data.userId,
        card_id=data.cardId,
        external_id=data.externalId
    )
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res}


@router.get("/a2c/checkTransaction/{transaction_id}")
async def a2c_check_transaction(transaction_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """2. GET /merchant/a2c/checkTransaction/{transactionId}/"""
    res = await paylov_service.a2c_check_transaction(transaction_id)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res}


@router.get("/a2c/checkTransaction/byExternalId/{external_id}")
async def a2c_check_transaction_by_external_id(external_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """3. GET /merchant/a2c/checkTransaction/byExternalId/{externalId}/"""
    res = await paylov_service.a2c_check_transaction_by_external_id(external_id)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res}


@router.get("/a2c/balance")
async def a2c_balance(current_user: Dict[str, Any] = Depends(get_current_user)):
    """4. GET /merchant/a2c/balance/"""
    res = await paylov_service.a2c_balance()
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res}


# ==============================================================================
# 13) SERVICE PAYMENTS (XIZMATLAR VA KOMMUNAL TO'LOVLAR) ROUTES
# ==============================================================================

class ServiceCustomerInfoInput(BaseModel):
    service_id: str
    account: Dict[str, Any]

class CreateServiceTransactionInput(BaseModel):
    amount: float
    service_id: str
    account: Dict[str, Any]
    userId: Optional[str] = None
    cardId: Optional[str] = None
    phoneNumber: Optional[str] = None

class PayServiceTransactionInput(BaseModel):
    transactionId: str
    cardId: str
    userId: Optional[str] = None
    otp: Optional[str] = None


@router.get("/servicePayment/list")
async def get_service_list(available_for_me: bool = True, current_user: Dict[str, Any] = Depends(get_current_user)):
    """1. GET /servicePayment/list/?available_for_me=true"""
    res = await paylov_service.get_service_list(available_for_me)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.get("/servicePayment/fields/{service_id}")
async def get_service_fields(service_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """2. GET /servicePayment/fields/{service_id}/"""
    res = await paylov_service.get_service_fields(service_id)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.post("/servicePayment/info")
async def get_service_customer_info(data: ServiceCustomerInfoInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """3. POST /servicePayment/info/"""
    res = await paylov_service.get_service_customer_info(data.service_id, data.account)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.post("/servicePayment/create")
async def create_service_transaction(data: CreateServiceTransactionInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """4. POST /servicePayment/create/"""
    res = await paylov_service.create_service_transaction(
        amount=data.amount,
        service_id=data.service_id,
        account=data.account,
        user_id=data.userId,
        card_id=data.cardId,
        phone_number=data.phoneNumber
    )
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.post("/servicePayment/pay")
async def pay_service_transaction(data: PayServiceTransactionInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """5. POST /servicePayment/pay/"""
    res = await paylov_service.pay_service_transaction(
        transaction_id=data.transactionId,
        card_id=data.cardId,
        user_id=data.userId,
        otp=data.otp
    )
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.get("/servicePayment/transaction/status")
async def get_service_transaction_status(transactionId: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """6. GET /servicePayment/transaction/status/?transactionId={transactionId}"""
    res = await paylov_service.get_service_transaction_status(transactionId)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.get("/servicePayment/transaction/all")
async def get_all_service_transactions(
    serviceId: Optional[str] = None,
    userId: Optional[str] = None,
    beginDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """7. GET /merchant/servicePayment/transaction/all"""
    res = await paylov_service.get_all_service_transactions(serviceId, userId, beginDate, endDate)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


# ==============================================================================
# 14) SPLIT PAYMENTS (BO'LINGAN TO'LOVLAR) ROUTES
# ==============================================================================

class SplitPaymentRecipientInput(BaseModel):
    recipientId: str
    amount: float  # in tiyin
    items: Optional[List[Dict[str, Any]]] = None

class SplitPaymentInput(BaseModel):
    transactionId: str
    recipients: List[SplitPaymentRecipientInput]
    resendOFD: Optional[bool] = False


@router.post("/splitPayment")
async def split_payment(data: SplitPaymentInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """1. POST /merchant/splitPayment/"""
    recipients_dict = [r.dict() for r in data.recipients]
    res = await paylov_service.split_payment(data.transactionId, recipients_dict, data.resendOFD or False)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.get("/splitPayment/status")
async def get_split_payment_status(transactionId: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """2. GET /merchant/splitPayment/status/?transactionId={transactionId}"""
    res = await paylov_service.get_split_payment_status(transactionId)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


# ==============================================================================
# 15) FISCALIZATION / OFD CHECKS ROUTES
# ==============================================================================

class FiscalItemInput(BaseModel):
    title: str
    price: int  # in tiyin
    count: int
    code: str
    vat_percent: int
    package_code: str
    discount: Optional[int] = 0
    voucher: Optional[int] = 0
    labels: Optional[List[str]] = None
    pinfl: Optional[str] = None
    tin: Optional[str] = None

class FiscalRegisterInput(BaseModel):
    items: List[FiscalItemInput]
    transactionId: Optional[str] = None
    externalId: Optional[str] = None
    phoneNumber: Optional[str] = None
    receiptType: Optional[int] = 0
    advanceContractId: Optional[str] = None


@router.post("/fiscalization/register")
async def register_fiscalization(data: FiscalRegisterInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """POST /merchant/fiscalization/register/"""
    items_dict = [i.dict() for i in data.items]
    res = await paylov_service.register_fiscalization(
        items=items_dict,
        transaction_id=data.transactionId,
        external_id=data.externalId,
        phone_number=data.phoneNumber,
        receipt_type=data.receiptType or 0,
        advance_contract_id=data.advanceContractId
    )
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


@router.get("/fiscalization/status")
async def get_fiscalization_status(
    transactionId: Optional[str] = None,
    externalId: Optional[str] = None,
    refunded: Optional[bool] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """GET /merchant/fiscalization/status/"""
    res = await paylov_service.get_fiscalization_status(transactionId, externalId, refunded)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


class FiscalRefundInput(BaseModel):
    receiptId: int

@router.post("/fiscalization/refund")
async def refund_fiscalization(data: FiscalRefundInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """POST /merchant/fiscalization/refund/"""
    res = await paylov_service.refund_fiscalization(data.receiptId)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


class FiscalActivityTypesInput(BaseModel):
    pinfl: str
    activityType: int  # 1: YaTT, 2: Self-employed, 3: Income > 100M UZS

@router.post("/fiscalization/activity-types")
async def check_fiscal_activity_types(data: FiscalActivityTypesInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """POST /merchant/fiscalization/activity-types/"""
    res = await paylov_service.check_fiscal_activity_types(data.pinfl, data.activityType)
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}


# ==============================================================================
# 16) SUBMERCHANT CREATION ROUTES
# ==============================================================================

class CreateSubMerchantInput(BaseModel):
    name: str
    external_id: str
    tin: Optional[str] = None
    pinfl: Optional[str] = None

@router.post("/subMerchant/merchant-create")
async def create_sub_merchant(data: CreateSubMerchantInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """POST /merchant/subMerchant/merchant-create/"""
    res = await paylov_service.create_sub_merchant(
        name=data.name,
        external_id=data.external_id,
        tin=data.tin,
        pinfl=data.pinfl
    )
    if not res or res.get("error"):
        err_msg = paylov_service.parse_paylov_error(res)
        raise HTTPException(status_code=400, detail=err_msg)
    return {"success": True, "data": res.get("result", res)}



