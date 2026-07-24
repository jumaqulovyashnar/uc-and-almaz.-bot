import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.middleware.auth import get_current_user
from app.services import click as click_service
from app.services import order as order_service
from app.workers.purchase_worker import add_purchase_job
from app.core.env import env

router = APIRouter()

# ── Input Schemas ──
class CreateCheckoutLinkInput(BaseModel):
    orderId: str
    returnUrl: Optional[str] = None

class CreateInvoiceInput(BaseModel):
    orderId: str
    phoneNumber: str

class CreateCardTokenInput(BaseModel):
    cardNumber: str
    expireDate: str
    phoneNumber: str

class VerifyCardTokenInput(BaseModel):
    cardToken: str
    smsCode: str

class PayWithTokenInput(BaseModel):
    orderId: str
    cardToken: str


@router.post("/checkout-link")
async def create_checkout_link(data: CreateCheckoutLinkInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Generate Click Official Web Checkout Link.
    """
    order = await order_service.get_by_id(data.orderId)
    if not order:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")

    return_url = data.returnUrl or env.WEBAPP_URL
    link = click_service.generate_click_checkout_link(
        merchant_id=env.CLICK_MERCHANT_ID,
        service_id=env.CLICK_SERVICE_ID,
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


@router.post("/invoice/create")
async def create_invoice(data: CreateInvoiceInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Click Shop API: Create Invoice by phone number.
    """
    order = await order_service.get_by_id(data.orderId)
    if not order:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")

    res = await click_service.create_invoice(
        phone_number=data.phoneNumber,
        amount=float(order["price"]),
        order_id=str(order["id"])
    )
    if res.get("error_code", 0) != 0:
        err_msg = click_service.parse_click_error(res)
        raise HTTPException(status_code=400, detail=err_msg)

    return {"success": True, "data": res}


@router.get("/invoice/check/{invoice_id}")
async def check_invoice(invoice_id: str, merchant_trans_id: Optional[str] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Click Shop API: Check Invoice Status.
    """
    res = await click_service.check_invoice(invoice_id, merchant_trans_id or "")
    if res.get("error_code", 0) != 0:
        err_msg = click_service.parse_click_error(res)
        raise HTTPException(status_code=400, detail=err_msg)

    return {"success": True, "data": res}


@router.post("/token/create")
async def create_card_token(data: CreateCardTokenInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Click Merchant API: Bind Card (Create Card Token & trigger SMS OTP).
    """
    res = await click_service.create_card_token(
        card_number=data.cardNumber,
        expire_date=data.expireDate,
        phone_number=data.phoneNumber
    )
    if res.get("error_code", 0) != 0:
        err_msg = click_service.parse_click_error(res)
        raise HTTPException(status_code=400, detail=err_msg)

    return {"success": True, "data": res}


@router.post("/token/verify")
async def verify_card_token(data: VerifyCardTokenInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Click Merchant API: Verify SMS OTP for Card Token.
    """
    res = await click_service.verify_card_token(
        card_token=data.cardToken,
        sms_code=data.smsCode
    )
    if res.get("error_code", 0) != 0:
        err_msg = click_service.parse_click_error(res)
        raise HTTPException(status_code=400, detail=err_msg)

    return {"success": True, "data": res}


@router.post("/token/pay")
async def pay_with_token(data: PayWithTokenInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Click Merchant API: 1-Click Payment via Verified Card Token.
    """
    order = await order_service.get_by_id(data.orderId)
    if not order:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")

    res = await click_service.pay_with_card_token(
        card_token=data.cardToken,
        amount=float(order["price"]),
        order_id=str(order["id"])
    )
    if res.get("error_code", 0) != 0:
        err_msg = click_service.parse_click_error(res)
        raise HTTPException(status_code=400, detail=err_msg)

    # Fulfill order if payment succeeds
    await order_service.update_payment_status(str(order["id"]), "paid")
    await order_service.update_status(str(order["id"]), "processing")
    
    try:
        from app.services.referral import process_referral_cashback
        await process_referral_cashback(order["id"])
    except Exception as e:
        logging.error(f"[ClickTokenPay] Referral cashback failed: {e}")

    await add_purchase_job(order["id"], {
        "order_id": order["id"],
        "game": order["game"],
        "category": order["category"],
        "package_name": order["package_name"],
        "amount": order["amount"],
        "player_id": order["player_id"],
        "player_nickname": order.get("player_nickname")
    })

    return {"success": True, "data": res}


@router.delete("/token/{card_token}")
async def delete_card_token(card_token: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Click Merchant API: Delete Card Token.
    """
    res = await click_service.delete_card_token(card_token)
    if res.get("error_code", 0) != 0:
        err_msg = click_service.parse_click_error(res)
        raise HTTPException(status_code=400, detail=err_msg)

    return {"success": True, "data": res}
