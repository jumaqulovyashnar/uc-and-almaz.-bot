import logging
from typing import Optional, Dict, Any
from app.core.database import query_row, get_db
from app.core.env import env

async def register_referral(referred_user: Dict[str, Any], ref_param: Optional[str]) -> bool:
    """
    Idempotent referral registration.
    - ref_param: referrer's telegram_id as string (from ?start= or start_param in initData)
    - Returns True if referral was newly registered, False otherwise (already set / invalid)
    """
    if not ref_param or not ref_param.strip().isdigit():
        return False

    referrer_tg_id = int(ref_param.strip())
    referred_tg_id = referred_user.get("telegram_id") or referred_user.get("id")

    if not referred_tg_id:
        return False

    # Never refer yourself
    if referrer_tg_id == referred_tg_id:
        return False

    # Already has a referrer — first touch wins
    if referred_user.get("referred_by"):
        return False

    try:
        # Check referrer exists
        referrer = await query_row(
            "SELECT id, first_name FROM users WHERE telegram_id = ?", referrer_tg_id
        )
        if not referrer:
            logging.warning(f"[Referral] Referrer telegram_id={referrer_tg_id} not found in DB.")
            return False

        db = get_db()
        # Atomic update: only set referred_by if still NULL (race condition guard)
        await db.execute(
            """
            UPDATE users
            SET referred_by = ?, updated_at = datetime('now')
            WHERE telegram_id = ? AND referred_by IS NULL
            """,
            (referrer["id"], referred_tg_id)
        )
        # Check how many rows were affected
        cursor = await db.execute("SELECT changes()")
        row = await cursor.fetchone()
        changes = row[0] if row else 0

        if changes == 0:
            await db.rollback()
            logging.info(f"[Referral] User {referred_tg_id} already has referrer. Skipping.")
            return False

        # Increment referrer's count
        await db.execute(
            "UPDATE users SET referrals_count = referrals_count + 1 WHERE id = ?",
            (referrer["id"],)
        )
        await db.commit()

        logging.info(
            f"[Referral] User {referred_tg_id} registered under referrer "
            f"telegram_id={referrer_tg_id} (db_id={referrer['id']})"
        )

        # Send notification to referrer (non-blocking)
        try:
            referred_first_name = (
                referred_user.get("first_name")
                or referred_user.get("firstName")
                or "Foydalanuvchi"
            )
            from app.services.notification import send_referral_notification
            await send_referral_notification(referrer_tg_id, referred_first_name)
        except Exception as notif_e:
            logging.warning(f"[Referral] Notification failed (non-critical): {notif_e}")

        return True

    except Exception as e:
        logging.error(f"[Referral] register_referral error: {e}")
        try:
            db = get_db()
            await db.rollback()
        except Exception:
            pass
        return False


async def process_referral_cashback(order_id: int) -> None:
    """Credit 5% cashback to the referrer when a referred user completes an order."""
    try:
        order = await query_row("SELECT user_id, price FROM orders WHERE id = ?", order_id)
        if not order:
            logging.warning(f"[Referral] Order {order_id} not found. Skipping cashback.")
            return

        buyer = await query_row("SELECT referred_by FROM users WHERE id = ?", order["user_id"])
        if not buyer or not buyer["referred_by"]:
            return

        referrer_id = buyer["referred_by"]
        cashback_amount = float(order["price"]) * env.REFERRAL_CASHBACK_PERCENT

        db = get_db()
        try:
            await db.execute(
                """
                INSERT INTO referral_earnings (referrer_id, referred_user_id, order_id, amount)
                VALUES (?, ?, ?, ?)
                """,
                (referrer_id, order["user_id"], order_id, cashback_amount)
            )
            await db.execute(
                "UPDATE users SET referral_balance = referral_balance + ? WHERE id = ?",
                (cashback_amount, referrer_id)
            )
            await db.commit()
            logging.info(
                f"[Referral] Cashback {cashback_amount} credited to referrer_id={referrer_id} "
                f"for order {order_id}"
            )
        except Exception as inner_e:
            await db.rollback()
            if "UNIQUE" in str(inner_e).upper() or "constraint" in str(inner_e).lower():
                logging.info(f"[Referral] Cashback already processed for order {order_id}.")
                return
            logging.error(f"[Referral] Cashback transaction failed: {inner_e}")

    except Exception as e:
        logging.error(f"[Referral] process_referral_cashback error: {e}")
