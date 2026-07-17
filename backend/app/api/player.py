"""
api/player.py — Player ID verification endpoint.

PUBG:     JollyMax HTTP API (fast, ~1-2 s) with optional Playwright/Midasbuy fallback
FreeFire: Playwright/Garena scraper (unchanged)

Error codes returned to frontend:
  INVALID_ID       — player not found
  TIMEOUT          — verification timed out / all retries exhausted
  SERVICE_DOWN     — API unavailable or unexpected error
  CAPTCHA_TRIGGERED — only possible when Playwright fallback fires
  RATE_LIMITED     — too many requests
"""
import logging
from fastapi import APIRouter, HTTPException, Request, status

from app.core.env import env
from app.services.automation import verify_freefire_id, verify_pubg_id   # Playwright fallback
from app.services.jollymax_verify import verify_pubg_id_jollymax
from app.models.player import VerifyPlayerInput

router = APIRouter()

# ── Rate limiting constants ───────────────────────────────────────────────────
RATE_LIMIT_WINDOW    = 60   # seconds
RATE_LIMIT_MAX_CALLS = 5    # requests per IP per window
PLAYER_ID_COOLDOWN   = 15   # seconds between retries of the SAME player_id
                             # (reduced from 30 — JollyMax is fast enough)


async def _check_rate_limit(request: Request, player_id: str) -> None:
    """
    Per-IP bucket + per-player_id cooldown via Redis.
    Falls back silently if Redis is unavailable.
    """
    try:
        from app.core.redis import get_redis
        r = get_redis()

        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )

        # Per-IP bucket
        ip_key = f"verify_rl:ip:{client_ip}"
        count  = await r.incr(ip_key)
        if count == 1:
            await r.expire(ip_key, RATE_LIMIT_WINDOW)
        if count > RATE_LIMIT_MAX_CALLS:
            ttl = await r.ttl(ip_key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error_code": "RATE_LIMITED",
                    "message": f"Too many requests. Wait {max(ttl, 1)}s and try again.",
                },
            )

        # Per-player_id cooldown
        pid_key = f"verify_rl:pid:{player_id}"
        is_new  = await r.set(pid_key, 1, nx=True, ex=PLAYER_ID_COOLDOWN)
        if not is_new:
            ttl = await r.ttl(pid_key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error_code": "RATE_LIMITED",
                    "message": f"This ID was verified recently. Wait {max(ttl, 1)}s.",
                },
            )

    except HTTPException:
        raise
    except Exception as e:
        logging.warning(f"[RateLimit] Redis unavailable (skipping): {e}")


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("")
async def verify_player(payload: VerifyPlayerInput, request: Request):
    """
    POST /api/verify-player
    Body: { "game": "pubg" | "freefire",  "player_id": "<string>" }
    """

    # Basic validation
    if len(payload.player_id) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_ID",
                "message":    "Player ID is too short (minimum 5 digits).",
            },
        )

    # Rate limiting
    await _check_rate_limit(request, payload.player_id)

    logging.info(
        "[PlayerAPI] Verifying game=%r player_id=%r",
        payload.game, payload.player_id,
    )

    res: dict | None = None

    if payload.game == "freefire":
        # FreeFire still uses Playwright/Garena (unchanged)
        res = await verify_freefire_id(payload.player_id)

    elif payload.game == "pubg":
        # ── Primary: JollyMax HTTP API (~1-2 s, no browser) ─────────────────
        res = await verify_pubg_id_jollymax(payload.player_id)

        # ── Optional fallback: Playwright/Midasbuy scraper ───────────────────
        # Only triggers if JollyMax is unreachable (SERVICE_DOWN / TIMEOUT).
        # Never retries a confirmed INVALID_ID through the slower path.
        if (
            not res.get("success")
            and res.get("error_code") in ("SERVICE_DOWN", "TIMEOUT")
            and env.JOLLYMAX_FALLBACK_ENABLED
        ):
            logging.warning(
                "[PlayerAPI] JollyMax failed (%s), falling back to Playwright.",
                res.get("error_code"),
            )
            res = await verify_pubg_id(payload.player_id)

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_GAME",
                "message":    f"Unknown game {payload.game!r}. Use 'pubg' or 'freefire'.",
            },
        )

    # ── Success ───────────────────────────────────────────────────────────────
    if res and res.get("success"):
        return {
            "success": True,
            "data": {
                "valid":     True,
                "player_id": payload.player_id,
                "nickname":  res.get("nickname"),
                "game":      payload.game,
            },
        }

    # ── Failure — sanitise before returning to client ─────────────────────────
    error_code = (res or {}).get("error_code") or "SERVICE_DOWN"
    error_msg  = (res or {}).get("error")      or "Verification failed."

    # Strip raw exception strings — full detail already logged server-side
    if any(kw in error_msg for kw in ("Internal", "Playwright", "Exception", "Traceback")):
        error_msg = "Verification service is temporarily unavailable."

    http_status = (
        status.HTTP_404_NOT_FOUND
        if error_code == "INVALID_ID"
        else status.HTTP_400_BAD_REQUEST
    )

    logging.warning(
        "[PlayerAPI] Verification failed: error_code=%r player_id=%r",
        error_code, payload.player_id,
    )

    raise HTTPException(
        status_code=http_status,
        detail={"error_code": error_code, "message": error_msg},
    )
