from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.middleware.auth import get_current_user
from app.core.database import query
from app.core.env import env

router = APIRouter()


@router.get("/me")
async def get_my_referrals(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_db_id = current_user["id"]
    telegram_id = current_user["telegram_id"]

    # Use ?startapp= so the Mini App opens directly and start_param is injected into initData
    referral_link = f"https://t.me/{env.BOT_USERNAME}?startapp={telegram_id}"

    referred_users = await query(
        """
        SELECT u.id, u.first_name, u.telegram_id, u.created_at as joinedAt
        FROM users u
        WHERE u.referred_by = ?
        ORDER BY u.created_at DESC
        LIMIT 50
        """,
        user_db_id
    )

    recent_earnings = await query(
        """
        SELECT re.amount, re.created_at as date, u.first_name as fromUser
        FROM referral_earnings re
        JOIN users u ON re.referred_user_id = u.id
        WHERE re.referrer_id = ?
        ORDER BY re.created_at DESC
        LIMIT 20
        """,
        user_db_id
    )

    return {
        "success": True,
        "data": {
            "referralLink": referral_link,
            "referralsCount": current_user.get("referrals_count", 0),
            "referralBalance": float(current_user.get("referral_balance", 0) or 0),
            "referredUsers": [
                {
                    "id": row["id"],
                    "firstName": row["first_name"] or "Foydalanuvchi",
                    "telegramId": row["telegram_id"],
                    "joinedAt": row["joinedAt"],
                }
                for row in referred_users
            ],
            "recentEarnings": [
                {
                    "fromUser": row["fromUser"] or "Foydalanuvchi",
                    "amount": float(row["amount"]),
                    "date": row["date"],
                }
                for row in recent_earnings
            ],
        },
    }
