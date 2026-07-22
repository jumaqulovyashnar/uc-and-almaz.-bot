import base64
import logging
import httpx
from typing import Optional, Dict, Any, List
from app.core.env import env

# In-memory token cache (token, expire_timestamp)
_token_cache: Optional[Dict[str, Any]] = None

async def get_access_token() -> Optional[str]:
    """
    Get OAuth2 access token for Paylov Merchant API using Basic Auth + Password grant
    """
    global _token_cache

    if _token_cache and _token_cache.get("expires_at", 0) > logging.time.time() + 60:
        return _token_cache.get("access_token")

    consumer_key = env.PAYLOV_CONSUMER_KEY
    consumer_secret = env.PAYLOV_CONSUMER_SECRET
    username = env.PAYLOV_USERNAME
    password = env.PAYLOV_PASSWORD

    if not consumer_key or not consumer_secret:
        logging.warning("[Paylov] Missing PAYLOV_CONSUMER_KEY or PAYLOV_CONSUMER_SECRET in environment")
        return "mock_paylov_access_token"

    auth_str = f"{consumer_key}:{consumer_secret}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()

    headers = {
        "Authorization": f"Basic {b64_auth}",
        "Content-Type": "application/json"
    }
    payload = {
        "grant_type": "password",
        "username": username,
        "password": password
    }

    url = f"{env.PAYLOV_BASE_URL.rstrip('/')}/merchant/oauth2/token/"

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, headers=headers, timeout=15.0)
            if res.status_code == 200:
                data = res.json()
                token = data.get("access_token")
                expires_in = data.get("expires_in", 3600)
                _token_cache = {
                    "access_token": token,
                    "expires_at": logging.time.time() + expires_in
                }
                return token
            else:
                logging.error(f"[Paylov] OAuth token error status={res.status_code}: {res.text}")
                return None
    except Exception as e:
        logging.error(f"[Paylov] OAuth request exception: {e}")
        return None


async def _get_auth_headers() -> Dict[str, str]:
    token = await get_access_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


async def create_user_card(user_id: str, card_number: str, expire_date: str) -> Optional[Dict[str, Any]]:
    """
    1. Create user card & trigger OTP SMS: POST /merchant/userCard/createUserCard/
    """
    headers = await _get_auth_headers()
    url = f"{env.PAYLOV_BASE_URL.rstrip('/')}/merchant/userCard/createUserCard/"
    payload = {
        "userId": str(user_id),
        "cardNumber": card_number.replace(" ", ""),
        "expireDate": expire_date.replace("/", "").replace(" ", "")
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, headers=headers, timeout=15.0)
            json_data = res.json()
            logging.info(f"[Paylov] create_user_card response: {json_data}")
            return json_data
    except Exception as e:
        logging.error(f"[Paylov] create_user_card error: {e}")
        return None


async def confirm_user_card(card_id: str, otp: str) -> Optional[Dict[str, Any]]:
    """
    2. Confirm OTP SMS to bind card: POST /merchant/userCard/confirmUserCardCreate/
    """
    headers = await _get_auth_headers()
    url = f"{env.PAYLOV_BASE_URL.rstrip('/')}/merchant/userCard/confirmUserCardCreate/"
    payload = {
        "cardId": str(card_id),
        "otp": str(otp)
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, headers=headers, timeout=15.0)
            json_data = res.json()
            logging.info(f"[Paylov] confirm_user_card response: {json_data}")
            return json_data
    except Exception as e:
        logging.error(f"[Paylov] confirm_user_card error: {e}")
        return None


async def get_all_user_cards(user_id: str) -> List[Dict[str, Any]]:
    """
    3. Get all saved cards for user: GET /merchant/userCard/getAllUserCards/?userId={userId}
    """
    headers = await _get_auth_headers()
    url = f"{env.PAYLOV_BASE_URL.rstrip('/')}/merchant/userCard/getAllUserCards/?userId={user_id}"

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers, timeout=15.0)
            json_data = res.json()
            if isinstance(json_data, list):
                return json_data
            return json_data.get("result", json_data.get("data", []))
    except Exception as e:
        logging.error(f"[Paylov] get_all_user_cards error: {e}")
        return []


async def delete_user_card(card_id: str) -> bool:
    """
    4. Delete card: DELETE /merchant/userCard/deleteUserCard/?userCardId={cardId}
    """
    headers = await _get_auth_headers()
    url = f"{env.PAYLOV_BASE_URL.rstrip('/')}/merchant/userCard/deleteUserCard/?userCardId={card_id}"

    try:
        async with httpx.AsyncClient() as client:
            res = await client.delete(url, headers=headers, timeout=15.0)
            return res.status_code == 200
    except Exception as e:
        logging.error(f"[Paylov] delete_user_card error: {e}")
        return False


async def create_receipt(user_id: str, amount: float, order_id: str) -> Optional[Dict[str, Any]]:
    """
    5. Create receipt for payment: POST /merchant/receipts/create/
    """
    headers = await _get_auth_headers()
    url = f"{env.PAYLOV_BASE_URL.rstrip('/')}/merchant/receipts/create/"
    payload = {
        "userId": str(user_id),
        "amount": int(amount),
        "account": {
            "order_id": str(order_id)
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, headers=headers, timeout=15.0)
            json_data = res.json()
            logging.info(f"[Paylov] create_receipt response: {json_data}")
            return json_data
    except Exception as e:
        logging.error(f"[Paylov] create_receipt error: {e}")
        return None


async def pay_receipt(transaction_id: str, card_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """
    6. Execute 1-click payment with saved card (NO OTP): POST /merchant/receipts/pay/
    """
    headers = await _get_auth_headers()
    url = f"{env.PAYLOV_BASE_URL.rstrip('/')}/merchant/receipts/pay/"
    payload = {
        "transactionId": str(transaction_id),
        "cardId": str(card_id),
        "userId": str(user_id)
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, headers=headers, timeout=15.0)
            json_data = res.json()
            logging.info(f"[Paylov] pay_receipt response: {json_data}")
            return json_data
    except Exception as e:
        logging.error(f"[Paylov] pay_receipt error: {e}")
        return None


async def get_transaction_status(transaction_id: str) -> Optional[Dict[str, Any]]:
    """
    7. Get transaction status: GET /merchant/getTransactions/?transactionId={transactionId}
    """
    headers = await _get_auth_headers()
    url = f"{env.PAYLOV_BASE_URL.rstrip('/')}/merchant/getTransactions/?transactionId={transaction_id}"

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers, timeout=15.0)
            return res.json()
    except Exception as e:
        logging.error(f"[Paylov] get_transaction_status error: {e}")
        return None
