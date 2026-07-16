import logging
from app.core.database import query_row, get_db
from app.core.env import env

async def process_referral_cashback(order_id: int) -> None:
    try:
        # Check if cashback was already processed for this order (idempotency check)
        existing = await query_row("SELECT id FROM referral_earnings WHERE order_id = ?", order_id)
        if existing:
            logging.info(f"[ReferralService] Cashback already credited for order {order_id}. Skipping.")
            return

        # Fetch order details
        order = await query_row("SELECT user_id, price FROM orders WHERE id = ?", order_id)
        if not order:
            logging.warning(f"[ReferralService] Order {order_id} not found. Skipping cashback.")
            return

        # Fetch buyer's referrer (referred_by)
        buyer = await query_row("SELECT referred_by FROM users WHERE id = ?", order["user_id"])
        if not buyer or not buyer["referred_by"]:
            logging.debug(f"[ReferralService] Buyer of order {order_id} has no referrer. Skipping.")
            return

        referrer_id = buyer["referred_by"]
        cashback_amount = order["price"] * env.REFERRAL_CASHBACK_PERCENT

        # Atomically credit cashback and insert log row
        db = get_db()
        async with db.execute("BEGIN TRANSACTION"):
            try:
                # 1. Increment referrer's balance
                await db.execute(
                    "UPDATE users SET referral_balance = referral_balance + ? WHERE id = ?",
                    (cashback_amount, referrer_id)
                )
                # 2. Log earning in referral_earnings
                await db.execute(
                    "INSERT INTO referral_earnings (referrer_id, referred_user_id, order_id, amount) VALUES (?, ?, ?, ?)",
                    (referrer_id, order["user_id"], order_id, cashback_amount)
                )
                await db.commit()
                logging.info(f"[ReferralService] Credited {cashback_amount} UZS cashback to referrer {referrer_id} for order {order_id}")
            except Exception as inner_e:
                await db.rollback()
                logging.error(f"[ReferralService] Transaction failed: {inner_e}")
                raise inner_e

    except Exception as e:
        logging.error(f"[ReferralService] Error processing cashback for order {order_id}: {e}")
