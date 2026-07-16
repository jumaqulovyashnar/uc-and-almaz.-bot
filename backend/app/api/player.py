from fastapi import APIRouter, HTTPException, status
from app.services.automation import verify_freefire_id, verify_pubg_id
from app.models.player import VerifyPlayerInput

router = APIRouter()

@router.post("")
async def verify_player(payload: VerifyPlayerInput):
    if len(payload.player_id) < 5:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "INVALID_ID",
                "message": "Player ID is too short."
            }
        )

    # Fetch real nickname using Playwright
    res = None
    if payload.game == "freefire":
        res = await verify_freefire_id(payload.player_id)
    elif payload.game == "pubg":
        res = await verify_pubg_id(payload.player_id)

    if not res or not res.get("success"):
        error_code = res.get("error_code") if res else "SERVICE_DOWN"
        error_msg = res.get("error") if res else "Verification failed."
        
        status_code = status.HTTP_404_NOT_FOUND if error_code == "INVALID_ID" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=status_code,
            detail={
                "error_code": error_code,
                "message": error_msg
            }
        )

    return {
        "success": True,
        "data": {
            "valid": True,
            "player_id": payload.player_id,
            "nickname": res.get("nickname"),
            "game": payload.game
        }
    }
