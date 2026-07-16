import hashlib
import time
import base64
import logging
from fastapi import APIRouter, Request, Header, HTTPException, Form
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
from app.core.env import env
from app.core.database import query_row, execute
from app.workers.purchase_worker import add_purchase_job

router = APIRouter()

# ----------------------------------------------------------------------
# CLICK Webhook (Prepare / Complete)
# ----------------------------------------------------------------------

@router.post("/click")
async def click_webhook(
    click_trans_id: int = Form(...),
    service_id: int = Form(...),
    click_paydoc_id: int = Form(...),
    merchant_trans_id: str = Form(...),
    merchant_prepare_id: Optional[str] = Form(None),
    amount: float = Form(...),
    action: int = Form(...),
    error: int = Form(...),
    error_note: str = Form(...),
    sign_time: str = Form(...),
    sign_string: str = Form(...)
):
    try:
        # Validate Click request signature
        # sign_string = md5(click_trans_id + service_id + click_secret_key + merchant_trans_id + (merchant_prepare_id if action == 1 else "") + amount + action + sign_time)
        secret = env.CLICK_SECRET_KEY or "mock_click_secret"
        
        prep_id_str = merchant_prepare_id if action == 1 else ""
        # Compute amount string separately to avoid f-string format errors
        amount_str = f"{amount:.2f}" if isinstance(amount, float) else str(amount)
        raw_sign = f"{click_trans_id}{service_id}{secret}{merchant_trans_id}{prep_id_str}{amount_str}{action}{sign_time}"

        # Click amount sign matching could be float format dependent, fallback to raw float or int if matches
        computed_sign = hashlib.md5(raw_sign.encode()).hexdigest()

        # Fallback sign with alternative integer formatting if signature mismatch
        if computed_sign != sign_string:
            raw_sign_alt_amount = str(int(amount))
            raw_sign_alt = f"{click_trans_id}{service_id}{secret}{merchant_trans_id}{prep_id_str}{raw_sign_alt_amount}{action}{sign_time}"
            computed_sign_alt = hashlib.md5(raw_sign_alt.encode()).hexdigest()
            if computed_sign_alt == sign_string:
                computed_sign = computed_sign_alt

        if computed_sign != sign_string:
            logging.warning(f"[ClickWeb] Mismatch signature: {computed_sign} != {sign_string}")
            return JSONResponse(content={"error": -1, "error_note": "SIGN_CHECK_FAILED"})

        # Check if error from Click side
        if error < 0:
            return JSONResponse(content={"error": error, "error_note": error_note})

        # Load order from database
        try:
            order_id = int(merchant_trans_id)
        except ValueError:
            return JSONResponse(content={"error": -5, "error_note": "INVALID_ORDER_ID"})

        order = await query_row("SELECT * FROM orders WHERE id = ?", order_id)
        if not order:
            return JSONResponse(content={"error": -5, "error_note": "ORDER_NOT_FOUND"})

        # Validate amount matches (amount sent by Click is in UZS, float)
        if abs(order["price"] - amount) > 0.01:
            return JSONResponse(content={"error": -2, "error_note": "INCORRECT_AMOUNT"})

        # Prepare Action (action = 0)
        if action == 0:
            # Check if order can be paid
            if order["payment_status"] != "pending_payment":
                return JSONResponse(content={"error": -4, "error_note": "ORDER_ALREADY_PAID"})
            
            # Create transaction record in database. Use INSERT OR IGNORE to avoid overwriting existing
            # transactions and rely on DB unique index for idempotency.
            await execute(
                "INSERT OR IGNORE INTO transactions (order_id, payment_provider, external_id, amount, status) VALUES (?, ?, ?, ?, ?)",
                order_id, "click", str(click_trans_id), amount, "prepare"
            )
            
            return {
                "click_trans_id": click_trans_id,
                "merchant_trans_id": merchant_trans_id,
                "merchant_prepare_id": str(order_id),
                "error": 0,
                "error_note": "Success"
            }

        # Complete Action (action = 1)
        elif action == 1:
            # Check if transaction exists in prepare state
            tx = await query_row("SELECT * FROM transactions WHERE order_id = ? AND payment_provider = ?", order_id, "click")
            if not tx:
                return JSONResponse(content={"error": -6, "error_note": "TRANSACTION_NOT_FOUND"})

            if order["payment_status"] == "paid" or order["status"] == "completed":
                return {
                    "click_trans_id": click_trans_id,
                    "merchant_trans_id": merchant_trans_id,
                    "merchant_confirm_id": str(order_id),
                    "error": 0,
                    "error_note": "Success"
                }

            # Mark transaction as complete
            await execute("UPDATE transactions SET status = 'complete' WHERE id = ?", tx["id"])
            # Update order payment status
            await execute("UPDATE orders SET payment_status = 'paid', payment_method = 'click', payment_id = ?, updated_at = datetime('now') WHERE id = ?", str(click_trans_id), order_id)

            # Process referral cashback
            try:
                from app.services.referral import process_referral_cashback
                await process_referral_cashback(order_id)
            except Exception as e:
                logging.error(f"[ClickWeb] Referral cashback failed for order {order_id}: {e}")

            # Trigger automatic purchase worker
            await add_purchase_job(order_id, {
                "order_id": order_id,
                "game": order["game"],
                "category": order["category"],
                "package_name": order["package_name"],
                "amount": order["amount"],
                "player_id": order["player_id"],
                "player_nickname": order.get("player_nickname")
            })

            return {
                "click_trans_id": click_trans_id,
                "merchant_trans_id": merchant_trans_id,
                "merchant_confirm_id": str(order_id),
                "error": 0,
                "error_note": "Success"
            }

        else:
            return JSONResponse(content={"error": -3, "error_note": "ACTION_NOT_FOUND"})

    except Exception as e:
        logging.error(f"[ClickWeb] Error: {e}", exc_info=True)
        return JSONResponse(content={"error": -9, "error_note": "SYSTEM_ERROR"})


# ----------------------------------------------------------------------
# PAYME Webhook (JSON-RPC 2.0)
# ----------------------------------------------------------------------

# Error Codes
PAYME_ERR_AUTH = -32504
PAYME_ERR_METHOD = -32601
PAYME_ERR_AMOUNT = -31001
PAYME_ERR_TRANSACTION = -31003
PAYME_ERR_SYSTEM = -31008
PAYME_ERR_STATE = -31008

@router.post("/payme")
async def payme_webhook(request: Request, authorization: Optional[str] = Header(None)):
    try:
        # Basic Authentication Check
        if not authorization or not authorization.startswith("Basic "):
            return json_rpc_error(PAYME_ERR_AUTH, "Missing or invalid authorization header")
        
        payload_b64 = authorization.split(" ")[1]
        decoded = base64.b64decode(payload_b64).decode("utf-8")
        login, password = decoded.split(":")
        
        expected_secret = env.PAYME_MERCHANT_KEY or "mock_payme_secret"
        if login != "Paycom" or password != expected_secret:
            return json_rpc_error(PAYME_ERR_AUTH, "Invalid authorization credentials")

        req_json = await request.json()
        method = req_json.get("method")
        params = req_json.get("params", {})
        req_id = req_json.get("id")

        if method == "CheckPerformTransaction":
            account = params.get("account", {})
            order_id_str = account.get("order_id")
            amount_tiyin = params.get("amount")

            if not order_id_str or amount_tiyin is None:
                return json_rpc_error(-32602, "Invalid parameters", req_id)

            order = await query_row("SELECT * FROM orders WHERE id = ?", int(order_id_str))
            if not order:
                return json_rpc_error(-31050, "Order not found", req_id)

            # Payme amount is in tiyin (1 UZS = 100 tiyin)
            expected_tiyin = int(order["price"] * 100)
            if expected_tiyin != amount_tiyin:
                return json_rpc_error(PAYME_ERR_AMOUNT, "Amount mismatch", req_id)

            if order["payment_status"] != "pending_payment":
                return json_rpc_error(-31051, "Order is already paid or cancelled", req_id)

            return json_rpc_success({"allow": True}, req_id)

        elif method == "CreateTransaction":
            account = params.get("account", {})
            order_id_str = account.get("order_id")
            amount_tiyin = params.get("amount")
            payme_trans_id = params.get("id")
            payme_time = params.get("time")

            if not order_id_str or amount_tiyin is None or not payme_trans_id:
                return json_rpc_error(-32602, "Invalid parameters", req_id)

            order = await query_row("SELECT * FROM orders WHERE id = ?", int(order_id_str))
            if not order:
                return json_rpc_error(-31050, "Order not found", req_id)

            expected_tiyin = int(order["price"] * 100)
            if expected_tiyin != amount_tiyin:
                return json_rpc_error(PAYME_ERR_AMOUNT, "Amount mismatch", req_id)

            # Check if transaction already exists
            tx = await query_row("SELECT * FROM transactions WHERE external_id = ? AND payment_provider = ?", payme_trans_id, "payme")
            if tx:
                # If transaction exists, check state
                # Payme state: 1 = CreateTransaction, 2 = PerformTransaction, -1/-2 = Cancelled
                state = 1 if tx["status"] == "prepare" else (2 if tx["status"] == "complete" else -1)
                
                # Check timeout (expired or not)
                # Payme requires cancellation if transaction stays in state 1 for more than 12 hours (43200 seconds)
                create_time = int(time.time() * 1000) # custom ts or fallback
                
                return json_rpc_success({
                    "create_time": create_time,
                    "transaction": str(tx["id"]),
                    "state": state
                }, req_id)

            # Verify order is not already paid
            if order["payment_status"] != "pending_payment":
                return json_rpc_error(-31051, "Order is already paid or cancelled", req_id)

            # Check if there is another active transaction for this order
            active_tx = await query_row("SELECT * FROM transactions WHERE order_id = ? AND payment_provider = ? AND status = 'prepare'", int(order_id_str), "payme")
            if active_tx:
                return json_rpc_error(-31052, "Another transaction is pending for this order", req_id)

            # Create new transaction
            create_time = int(time.time() * 1000)
            await execute(
                "INSERT INTO transactions (order_id, payment_provider, external_id, amount, status) VALUES (?, ?, ?, ?, ?)",
                int(order_id_str), "payme", payme_trans_id, float(amount_tiyin / 100), "prepare"
            )
            
            new_tx = await query_row("SELECT * FROM transactions WHERE external_id = ? AND payment_provider = ?", payme_trans_id, "payme")
            
            return json_rpc_success({
                "create_time": create_time,
                "transaction": str(new_tx["id"]),
                "state": 1
            }, req_id)

        elif method == "PerformTransaction":
            payme_trans_id = params.get("id")
            if not payme_trans_id:
                return json_rpc_error(-32602, "Invalid parameters", req_id)

            tx = await query_row("SELECT * FROM transactions WHERE external_id = ? AND payment_provider = ?", payme_trans_id, "payme")
            if not tx:
                return json_rpc_error(PAYME_ERR_TRANSACTION, "Transaction not found", req_id)

            order_id = tx["order_id"]
            order = await query_row("SELECT * FROM orders WHERE id = ?", order_id)

            if tx["status"] == "complete":
                # Already performed
                perform_time = int(time.time() * 1000) # placeholder perform time or from tx metadata
                return json_rpc_success({
                    "perform_time": perform_time,
                    "transaction": str(tx["id"]),
                    "state": 2
                }, req_id)

            if tx["status"] != "prepare":
                return json_rpc_error(PAYME_ERR_STATE, "Invalid transaction state", req_id)

            # Update status to complete
            perform_time = int(time.time() * 1000)
            await execute("UPDATE transactions SET status = 'complete' WHERE id = ?", tx["id"])
            await execute("UPDATE orders SET payment_status = 'paid', payment_method = 'payme', payment_id = ?, updated_at = datetime('now') WHERE id = ?", payme_trans_id, order_id)

            # Process referral cashback
            try:
                from app.services.referral import process_referral_cashback
                await process_referral_cashback(order_id)
            except Exception as e:
                logging.error(f"[PaymeWeb] Referral cashback failed for order {order_id}: {e}")

            # Trigger automatic purchase worker
            await add_purchase_job(order_id, {
                "order_id": order_id,
                "game": order["game"],
                "category": order["category"],
                "package_name": order["package_name"],
                "amount": order["amount"],
                "player_id": order["player_id"],
                "player_nickname": order.get("player_nickname")
            })

            return json_rpc_success({
                "perform_time": perform_time,
                "transaction": str(tx["id"]),
                "state": 2
            }, req_id)

        elif method == "CancelTransaction":
            payme_trans_id = params.get("id")
            reason = params.get("reason")
            if not payme_trans_id or reason is None:
                return json_rpc_error(-32602, "Invalid parameters", req_id)

            tx = await query_row("SELECT * FROM transactions WHERE external_id = ? AND payment_provider = ?", payme_trans_id, "payme")
            if not tx:
                return json_rpc_error(PAYME_ERR_TRANSACTION, "Transaction not found", req_id)

            order_id = tx["order_id"]
            order = await query_row("SELECT * FROM orders WHERE id = ?", order_id)

            if tx["status"] == "cancel":
                # Already cancelled
                cancel_time = int(time.time() * 1000)
                return json_rpc_success({
                    "cancel_time": cancel_time,
                    "transaction": str(tx["id"]),
                    "state": -2 if order["status"] == "completed" else -1
                }, req_id)

            # If transaction is in state 2 (complete), we cancel it but notify admin if order already fulfilled!
            state = -1
            if tx["status"] == "complete":
                state = -2 # completed order cancelled
                if order["status"] == "completed":
                    # Alert admin that a completed order was canceled!
                    from app.services.notification import send_admin_alert
                    alert_text = (
                        f"⚠️ <b>TO'LOV BEKOR QILINDI (Payme)!</b>\n"
                        f"E'tibor bering, allaqachon bajarilgan buyurtma bekor qilindi.\n"
                        f"Buyurtma ID: #{order_id}\n"
                        f"Payme Trans ID: {payme_trans_id}\n"
                        f"O'yinchi ID: {order['player_id']}\n"
                        f"Miqdor: {order['amount']}\n"
                        f"Sababi: {reason}"
                    )
                    await send_admin_alert(alert_text)

            cancel_time = int(time.time() * 1000)
            await execute("UPDATE transactions SET status = 'cancel' WHERE id = ?", tx["id"])
            await execute("UPDATE orders SET payment_status = 'cancelled', status = 'failed', error_message = 'Payme orqali bekor qilindi', updated_at = datetime('now') WHERE id = ?", order_id)

            return json_rpc_success({
                "cancel_time": cancel_time,
                "transaction": str(tx["id"]),
                "state": state
            }, req_id)

        elif method == "CheckTransaction":
            payme_trans_id = params.get("id")
            if not payme_trans_id:
                return json_rpc_error(-32602, "Invalid parameters", req_id)

            tx = await query_row("SELECT * FROM transactions WHERE external_id = ? AND payment_provider = ?", payme_trans_id, "payme")
            if not tx:
                return json_rpc_error(PAYME_ERR_TRANSACTION, "Transaction not found", req_id)

            # Determine state
            state = 1 if tx["status"] == "prepare" else (2 if tx["status"] == "complete" else -1)
            create_time = int(time.time() * 1000) # fallback
            perform_time = create_time if state == 2 else 0
            cancel_time = create_time if state == -1 else 0

            return json_rpc_success({
                "create_time": create_time,
                "perform_time": perform_time,
                "cancel_time": cancel_time,
                "transaction": str(tx["id"]),
                "state": state,
                "reason": 1
            }, req_id)

        else:
            return json_rpc_error(PAYME_ERR_METHOD, f"Method '{method}' not found", req_id)

    except Exception as e:
        logging.error(f"[PaymeWeb] Error: {e}", exc_info=True)
        return json_rpc_error(PAYME_ERR_SYSTEM, "Internal system error")

# Helper functions for JSON-RPC response
def json_rpc_success(result: Dict[str, Any], req_id: Any) -> JSONResponse:
    return JSONResponse(content={
        "jsonrpc": "2.0",
        "result": result,
        "id": req_id
    })

def json_rpc_error(code: int, message: str, req_id: Any = None) -> JSONResponse:
    return JSONResponse(content={
        "jsonrpc": "2.0",
        "error": {
            "code": code,
            "message": message
        },
        "id": req_id
    })
