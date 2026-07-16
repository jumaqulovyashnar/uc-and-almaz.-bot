from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.middleware.auth import get_current_user
from app.core.database import query
from app.core.env import env

router = APIRouter()

@router.get("/me")
async def get_my_referrals(current_user: Dict[str, Any] = Depends(get_current_user)):
    telegram_id = current_user["telegram_id"]
    user_db_id = current_user["id"]
    
    # Generate referral link
    referral_link = f"https://t.me/{env.BOT_USERNAME}?start={telegram_id}"
    
    # Query recent earnings
    recent_earnings = await query("""
        SELECT re.amount, re.created_at as date, u.first_name as fromUser
        FROM referral_earnings re
        JOIN users u ON re.referred_user_id = u.id
        WHERE re.referrer_id = ?
        ORDER BY re.created_at DESC
        LIMIT 10
    """, user_db_id)
    
    return {
        "success": True,
        "data": {
            "referralLink": referral_link,
            "referralsCount": current_user.get("referrals_count", 0),
            "referralBalance": current_user.get("referral_balance", 0.0),
            "recentEarnings": [
                {
                    "fromUser": row["fromUser"],
                    "amount": row["amount"],
                    "date": row["date"]
                }
                for row in recent_earnings
            ]
        }
    }
