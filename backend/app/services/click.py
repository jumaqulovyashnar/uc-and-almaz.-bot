import hashlib
import time
import urllib.parse
import logging
import httpx
from typing import Optional, Dict, Any
from app.core.env import env

CLICK_ERROR_MAP: Dict[int, str] = {
    -1: "SIGN_CHECK_FAILED: Xavfsizlik kaliti yoki raqamli imzo xatosi",
    -2: "INCORRECT_AMOUNT: To'lov summasi noto'g'ri",
    -3: "ACTION_NOT_FOUND: Amaldagi operatsiya topilmadi",
    -4: "ALREADY_PAID: Ushbu buyurtma allaqachon to'langan",
    -5: "ORDER_NOT_FOUND: Buyurtma topilmadi",
    -6: "TRANSACTION_CANCELLED: Tranzaksiya bekor qilindi",
    -7: "FAILED_TO_UPDATE_USER: Foydalanuvchi balansini yangilab bo'lmadi",
    -8: "ERROR_IN_REQUEST_FROM_CLICK: Click so'rovida xatolik yuz berdi",
    -9: "TRANSACTION_NOT_FOUND: Tranzaksiya topilmadi",
    -3001: "INSUFFICIENT_FUNDS: Kartada mablag' yetarli emas!",
    -3002: "CARD_EXPIRED: Kartaning amal qilish muddati tugagan!",
    -3003: "INVALID_CARD: Karta raqami yoki amal qilish muddati noto'g'ri!",
    -3004: "CARD_BLOCKED: Bank kartasi bloklangan!",
    -3005: "SMS_NOT_ACTIVE: Kartada SMS-xabarnoma xizmati yoqilmagan!",
    -3006: "INVALID_OTP: SMS tasdiqlash kodi noto'g'ri kiritildi!",
    -3007: "OTP_EXPIRED: SMS tasdiqlash kodining amal qilish muddati tugagan!",
}

def parse_click_error(res_data: Any) -> str:
    """
    Parse Click response error status and return human-readable Uzbek error message.
    """
    if not isinstance(res_data, dict):
        return "Click to'lov tizimida noma'lum xatolik"
    
    error_code = res_data.get("error_code") or res_data.get("error") or res_data.get("status")
    if isinstance(error_code, int) and error_code in CLICK_ERROR_MAP:
        return CLICK_ERROR_MAP[error_code]
    
    error_note = res_data.get("error_note") or res_data.get("message") or res_data.get("detail")
    if error_note:
        return str(error_note)
        
    return "Click to'lov jarayonida xatolik yuz berdi"


def _get_auth_headers() -> Dict[str, str]:
    """
    Generate Click Merchant API Auth-Token header.
    Spec: Auth-Token: {merchant_user_id}:{sha1(timestamp + secret_key)}:{timestamp}
    """
    merchant_user_id = env.CLICK_MERCHANT_USER_ID or env.CLICK_MERCHANT_ID
    secret = env.CLICK_SECRET_KEY
    timestamp = str(int(time.time()))
    
    raw_digest = f"{timestamp}{secret}"
    digest = hashlib.sha1(raw_digest.encode("utf-8")).hexdigest()
    
    auth_token = f"{merchant_user_id}:{digest}:{timestamp}"
    return {
        "Auth-Token": auth_token,
        "Content-Type": "application/json"
    }


def generate_click_checkout_link(
    merchant_id: str,
    service_id: str,
    amount: float,
    order_id: str,
    return_url: Optional[str] = None
) -> str:
    """
    Generate official Click Web Checkout link:
    https://my.click.uz/services/pay?service_id={service_id}&merchant_id={merchant_id}&amount={amount}&transaction_param={order_id}&return_url={return_url}
    """
    m_id = merchant_id or env.CLICK_MERCHANT_ID
    s_id = service_id or env.CLICK_SERVICE_ID
    
    params = {
        "service_id": str(s_id),
        "merchant_id": str(m_id),
        "amount": f"{amount:.2f}" if isinstance(amount, float) else str(amount),
        "transaction_param": str(order_id)
    }
    if return_url:
        params["return_url"] = return_url
        
    query_str = urllib.parse.urlencode(params)
    return f"https://my.click.uz/services/pay?{query_str}"


async def create_invoice(phone_number: str, amount: float, order_id: str) -> Dict[str, Any]:
    """
    Click Shop API: Create Invoice (POST /invoice/create)
    Sends invoice request to user by phone number.
    """
    headers = _get_auth_headers()
    url = f"{env.CLICK_BASE_URL.rstrip('/')}/invoice/create"
    
    clean_phone = phone_number.replace("+", "").replace(" ", "").strip()
    payload = {
        "service_id": int(env.CLICK_SERVICE_ID) if env.CLICK_SERVICE_ID.isdigit() else env.CLICK_SERVICE_ID,
        "phone_number": clean_phone,
        "amount": float(amount),
        "merchant_trans_id": str(order_id)
    }

    logging.info(f"=== [CLICK CREATE INVOICE REQUEST] ===")
    logging.info(f"URL: {url}, Phone: {clean_phone}, Amount: {amount}, OrderID: {order_id}")

    try:
        if not env.CLICK_SECRET_KEY or "mock" in env.CLICK_SECRET_KEY:
            logging.info("[CLICK API] Secret key missing or mock mode active. Returning mock invoice response.")
            return {
                "error_code": 0,
                "error_note": "Success",
                "invoice_id": int(time.time()),
                "merchant_trans_id": str(order_id)
            }

        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, headers=headers, timeout=15.0)
            try:
                data = res.json()
            except Exception:
                data = {"raw_text": res.text, "status_code": res.status_code}
            
            logging.info(f"[CLICK API RESPONSE] HTTP {res.status_code}: {data}")
            return data
    except Exception as e:
        logging.error(f"[CLICK API EXCEPTION] create_invoice error: {e}", exc_info=True)
        return {"error_code": -8, "error_note": f"Click API ulanishda xatolik: {str(e)}"}


async def check_invoice(invoice_id: str, merchant_trans_id: str) -> Dict[str, Any]:
    """
    Click Shop API: Check Invoice Status (GET /invoice/status/{service_id}/{invoice_id})
    """
    headers = _get_auth_headers()
    s_id = env.CLICK_SERVICE_ID
    url = f"{env.CLICK_BASE_URL.rstrip('/')}/invoice/status/{s_id}/{invoice_id}"
    
    logging.info(f"=== [CLICK CHECK INVOICE REQUEST] URL: {url} ===")
    try:
        if not env.CLICK_SECRET_KEY or "mock" in env.CLICK_SECRET_KEY:
            return {"error_code": 0, "status": 2, "status_note": "Paid"}

        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers, timeout=15.0)
            try:
                data = res.json()
            except Exception:
                data = {"raw_text": res.text, "status_code": res.status_code}
            
            logging.info(f"[CLICK API RESPONSE] HTTP {res.status_code}: {data}")
            return data
    except Exception as e:
        logging.error(f"[CLICK API EXCEPTION] check_invoice error: {e}", exc_info=True)
        return {"error_code": -8, "error_note": f"Click API ulanishda xatolik: {str(e)}"}


async def create_card_token(card_number: str, expire_date: str, phone_number: str) -> Dict[str, Any]:
    """
    Click Merchant API: Create Card Token & Send SMS OTP (POST /card_token/request)
    """
    headers = _get_auth_headers()
    url = f"{env.CLICK_BASE_URL.rstrip('/')}/card_token/request"
    
    clean_card = card_number.replace(" ", "")
    clean_expire = expire_date.replace("/", "").replace(" ", "")
    clean_phone = phone_number.replace("+", "").replace(" ", "")
    
    payload = {
        "service_id": int(env.CLICK_SERVICE_ID) if env.CLICK_SERVICE_ID.isdigit() else env.CLICK_SERVICE_ID,
        "card_number": clean_card,
        "expire_date": clean_expire,
        "phone_number": clean_phone
    }

    logging.info(f"=== [CLICK CREATE CARD TOKEN REQUEST] URL: {url} ===")
    try:
        if not env.CLICK_SECRET_KEY or "mock" in env.CLICK_SECRET_KEY:
            mock_token = f"click_token_{int(time.time())}"
            return {
                "error_code": 0,
                "error_note": "Success",
                "card_token": mock_token,
                "phone_number": clean_phone
            }

        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, headers=headers, timeout=15.0)
            try:
                data = res.json()
            except Exception:
                data = {"raw_text": res.text, "status_code": res.status_code}
            
            logging.info(f"[CLICK API RESPONSE] HTTP {res.status_code}: {data}")
            return data
    except Exception as e:
        logging.error(f"[CLICK API EXCEPTION] create_card_token error: {e}", exc_info=True)
        return {"error_code": -8, "error_note": f"Click API ulanishda xatolik: {str(e)}"}


async def verify_card_token(card_token: str, sms_code: str) -> Dict[str, Any]:
    """
    Click Merchant API: Verify SMS OTP for Card Token (POST /card_token/verify)
    """
    headers = _get_auth_headers()
    url = f"{env.CLICK_BASE_URL.rstrip('/')}/card_token/verify"
    
    payload = {
        "service_id": int(env.CLICK_SERVICE_ID) if env.CLICK_SERVICE_ID.isdigit() else env.CLICK_SERVICE_ID,
        "card_token": str(card_token),
        "sms_code": str(sms_code)
    }

    logging.info(f"=== [CLICK VERIFY CARD TOKEN REQUEST] Token: {card_token}, Code: {sms_code} ===")
    try:
        if str(card_token).startswith("click_token_") or not env.CLICK_SECRET_KEY or "mock" in env.CLICK_SECRET_KEY:
            return {"error_code": 0, "error_note": "Success", "card_token": card_token}

        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, headers=headers, timeout=15.0)
            try:
                data = res.json()
            except Exception:
                data = {"raw_text": res.text, "status_code": res.status_code}
            
            logging.info(f"[CLICK API RESPONSE] HTTP {res.status_code}: {data}")
            return data
    except Exception as e:
        logging.error(f"[CLICK API EXCEPTION] verify_card_token error: {e}", exc_info=True)
        return {"error_code": -8, "error_note": f"Click API ulanishda xatolik: {str(e)}"}


async def pay_with_card_token(card_token: str, amount: float, order_id: str) -> Dict[str, Any]:
    """
    Click Merchant API: 1-Click Auto Payment using Verified Card Token (POST /card_token/payment)
    """
    headers = _get_auth_headers()
    url = f"{env.CLICK_BASE_URL.rstrip('/')}/card_token/payment"
    
    payload = {
        "service_id": int(env.CLICK_SERVICE_ID) if env.CLICK_SERVICE_ID.isdigit() else env.CLICK_SERVICE_ID,
        "card_token": str(card_token),
        "amount": float(amount),
        "merchant_trans_id": str(order_id)
    }

    logging.info(f"=== [CLICK CHARGE CARD TOKEN REQUEST] Token: {card_token}, Amount: {amount}, OrderID: {order_id} ===")
    try:
        if str(card_token).startswith("click_token_") or not env.CLICK_SECRET_KEY or "mock" in env.CLICK_SECRET_KEY:
            return {
                "error_code": 0,
                "error_note": "Success",
                "click_trans_id": int(time.time()),
                "merchant_trans_id": str(order_id)
            }

        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, headers=headers, timeout=15.0)
            try:
                data = res.json()
            except Exception:
                data = {"raw_text": res.text, "status_code": res.status_code}
            
            logging.info(f"[CLICK API RESPONSE] HTTP {res.status_code}: {data}")
            return data
    except Exception as e:
        logging.error(f"[CLICK API EXCEPTION] pay_with_card_token error: {e}", exc_info=True)
        return {"error_code": -8, "error_note": f"Click API ulanishda xatolik: {str(e)}"}


async def delete_card_token(card_token: str) -> Dict[str, Any]:
    """
    Click Merchant API: Delete Card Token (DELETE /card_token/{service_id}/{card_token})
    """
    headers = _get_auth_headers()
    s_id = env.CLICK_SERVICE_ID
    url = f"{env.CLICK_BASE_URL.rstrip('/')}/card_token/{s_id}/{card_token}"
    
    logging.info(f"=== [CLICK DELETE CARD TOKEN REQUEST] URL: {url} ===")
    try:
        if str(card_token).startswith("click_token_") or not env.CLICK_SECRET_KEY or "mock" in env.CLICK_SECRET_KEY:
            return {"error_code": 0, "error_note": "Success"}

        async with httpx.AsyncClient() as client:
            res = await client.delete(url, headers=headers, timeout=15.0)
            try:
                data = res.json()
            except Exception:
                data = {"raw_text": res.text, "status_code": res.status_code}
            
            logging.info(f"[CLICK API RESPONSE] HTTP {res.status_code}: {data}")
            return data
    except Exception as e:
        logging.error(f"[CLICK API EXCEPTION] delete_card_token error: {e}", exc_info=True)
        return {"error_code": -8, "error_note": f"Click API ulanishda xatolik: {str(e)}"}
