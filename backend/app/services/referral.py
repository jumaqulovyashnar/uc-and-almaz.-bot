import logging
from typing import Optional, Dict, Any
from app.core.database import query_row, get_db
from app.core.env import env


async def register_referral(referred_user: Dict[str, Any], ref_param: Optional[str]) -> bool:
    """
    Idempotent referral registration.

    ref_param: referrer's telegram_id as a string
               (comes from ?start=<id> bot deep-link or start_param in Mini App initData)

    Returns True  — referral was freshly registered.
    Returns False — no-op (invalid param / self-referral / already set / referrer not found).
    """
    if not ref_param or not ref_param.strip().isdigit():
        return False

    referrer_tg_id = int(ref_param.strip())
    referred_tg_id = referred_user.get("telegram_id") or referred_user.get("id")

    if not referred_tg_id:
        return False

    # Never refer yourself
    if referrer_tg_id == int(referred_tg_id):
        return False

    # First-touch wins — never overwrite an existing referred_by
    if referred_user.get("referred_by"):
        return False

    try:
        referrer = await query_row(
            "SELECT id, first_name, telegram_id FROM users WHERE telegram_id = ?",
            referrer_tg_id
        )
        if not referrer:
            logging.warning(
                f"[Referral] Referrer telegram_id={referrer_tg_id} not found in DB."
            )
            return False

        db = get_db()

        # Single atomic transaction guarded with WHERE referred_by IS NULL
        # to prevent double-counting under concurrent requests.
        await db.execute("BEGIN")
        try:
            await db.execute(
                """
                UPDATE users
                   SET referred_by   = ?,
                       updated_at    = datetime('now')
                 WHERE telegram_id   = ?
                   AND referred_by  IS NULL
                """,
                (referrer["id"], referred_tg_id),
            )
            cursor = await db.execute("SELECT changes()")
            row = await cursor.fetchone()
            changes = row[0] if row else 0

            if changes == 0:
                await db.execute("ROLLBACK")
                logging.info(
                    f"[Referral] User {referred_tg_id} already has a referrer — skipping."
                )
                return False

            await db.execute(
                """
                UPDATE users
                   SET referrals_count  = referrals_count + 1,
                       referral_balance = referral_balance + 250.0
                 WHERE id = ?
                """,
                (referrer["id"],),
            )
            await db.execute("COMMIT")
        except Exception as tx_err:
            await db.execute("ROLLBACK")
            logging.error(f"[Referral] Transaction failed: {tx_err}")
            return False

        logging.info(
            f"[Referral] ✅ User telegram_id={referred_tg_id} registered under "
            f"referrer telegram_id={referrer_tg_id} (db_id={referrer['id']})"
        )

        # Send notification — failure must never break the caller
        try:
            referred_first_name = (
                referred_user.get("first_name")
                or referred_user.get("firstName")
                or "Foydalanuvchi"
            )
            from app.services.notification import send_referral_notification
            await send_referral_notification(referrer_tg_id, referred_first_name)
        except Exception as notif_err:
            logging.warning(f"[Referral] Notification failed (non-critical): {notif_err}")

        return True

    except Exception as e:
        logging.error(f"[Referral] register_referral unexpected error: {e}")
        return False


async def process_referral_cashback(order_id: int) -> None:
    """
    Credit REFERRAL_CASHBACK_PERCENT of the order price to the referrer.
    Idempotent: protected by UNIQUE constraint on (order_id) in referral_earnings.
    """
    try:
        order = await query_row(
            "SELECT user_id, price FROM orders WHERE id = ?", order_id
        )
        if not order:
            logging.warning(f"[Referral] Order {order_id} not found — skipping cashback.")
            return

        buyer = await query_row(
            "SELECT referred_by FROM users WHERE id = ?", order["user_id"]
        )
        if not buyer or not buyer["referred_by"]:
            return

        referrer_id = buyer["referred_by"]
        cashback_amount = float(order["price"]) * env.REFERRAL_CASHBACK_PERCENT

        db = get_db()
        await db.execute("BEGIN")
        try:
            await db.execute(
                """
                INSERT INTO referral_earnings
                    (referrer_id, referred_user_id, order_id, amount)
                VALUES (?, ?, ?, ?)
                """,
                (referrer_id, order["user_id"], order_id, cashback_amount),
            )
            await db.execute(
                "UPDATE users SET referral_balance = referral_balance + ? WHERE id = ?",
                (cashback_amount, referrer_id),
            )
            await db.execute("COMMIT")
            logging.info(
                f"[Referral] Cashback {cashback_amount:.0f} UZS credited to "
                f"referrer_id={referrer_id} for order {order_id}"
            )
        except Exception as inner_e:
            await db.execute("ROLLBACK")
            if "UNIQUE" in str(inner_e).upper() or "constraint" in str(inner_e).lower():
                logging.info(
                    f"[Referral] Cashback already processed for order {order_id} — skipping."
                )
                return
            logging.error(f"[Referral] Cashback transaction failed: {inner_e}")

    except Exception as e:
        logging.error(f"[Referral] process_referral_cashback error: {e}")
