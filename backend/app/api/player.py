"""
api/player.py — Player ID verification endpoint.

Changes:
  - Per-IP and per-player_id rate limiting via Redis (token bucket pattern)
  - error_code is always preserved from automation.py result through to HTTP response
  - Chromium availability surfaced as SERVICE_DOWN (not a 500)
"""
import logging
import time
from fastapi import APIRouter, HTTPException, Request, status
from app.services.automation import verify_freefire_id, verify_pubg_id
from app.models.player import VerifyPlayerInput

router = APIRouter()

# ── Rate limiting constants ───────────────────────────────────────────────────
# Each caller (per IP) gets RATE_LIMIT_MAX_CALLS attempts in RATE_LIMIT_WINDOW seconds.
# Each player_id gets a separate shorter cooldown to deter brute-force.
RATE_LIMIT_WINDOW      = 60    # seconds
RATE_LIMIT_MAX_CALLS   = 5     # requests per IP per window
PLAYER_ID_COOLDOWN     = 30    # seconds between retries of the SAME player_id


async def _check_rate_limit(request: Request, player_id: str) -> None:
    """
    Raises HTTP 429 if:
      - The calling IP has exceeded RATE_LIMIT_MAX_CALLS in the last window, OR
      - The same player_id was verified within PLAYER_ID_COOLDOWN seconds.

    Uses Redis INCR + EXPIRE for the IP bucket, and SET NX EX for the player_id lock.
    Falls back silently if Redis is unavailable (never blocks a legitimate request
    due to a Redis outage).
    """
    try:
        from app.core.redis import get_redis
        r = get_redis()

        # ── 1. Per-IP bucket ──────────────────────────────────────────────────
        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or request.client.host
        )
        ip_key = f"verify_rl:ip:{client_ip}"

        count = await r.incr(ip_key)
        if count == 1:
            await r.expire(ip_key, RATE_LIMIT_WINDOW)

        if count > RATE_LIMIT_MAX_CALLS:
            ttl = await r.ttl(ip_key)
            logging.warning(
                f"[RateLimit] IP {client_ip} exceeded {RATE_LIMIT_MAX_CALLS} "
                f"verify calls/min. count={count}"
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error_code": "RATE_LIMITED",
                    "message": (
                        f"Too many verification requests. "
                        f"Please wait {max(ttl, 1)} seconds and try again."
                    ),
                },
            )

        # ── 2. Per-player_id cooldown ─────────────────────────────────────────
        pid_key = f"verify_rl:pid:{player_id}"
        # SET key 1 NX EX cooldown  →  returns True only if key was newly created
        is_new = await r.set(pid_key, 1, nx=True, ex=PLAYER_ID_COOLDOWN)
        if not is_new:
            ttl = await r.ttl(pid_key)
            logging.info(
                f"[RateLimit] player_id={player_id!r} cooldown active, "
                f"ttl={ttl}s"
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error_code": "RATE_LIMITED",
                    "message": (
                        f"This player ID was already verified recently. "
                        f"Please wait {max(ttl, 1)} seconds before retrying."
                    ),
                },
            )

    except HTTPException:
        raise
    except Exception as e:
        # Redis unavailable — log and allow the request through
        logging.warning(f"[RateLimit] Redis check failed (skipping): {e}")


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("")
async def verify_player(payload: VerifyPlayerInput, request: Request):
    """
    POST /api/verify-player
    Body: { game: "pubg"|"freefire", player_id: "<string>" }

    Returns:
      200  { success: true,  data: { valid: true, player_id, nickname, game } }
      400  { detail: { error_code, message } }   — SERVICE_DOWN / TIMEOUT / etc.
      404  { detail: { error_code: "INVALID_ID", message } }
      422  validation error (FastAPI default)
      429  { detail: { error_code: "RATE_LIMITED", message } }
    """

    # ── Basic input validation ────────────────────────────────────────────────
    if len(payload.player_id) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_ID",
                "message": "Player ID is too short (minimum 5 digits).",
            },
        )

    # ── Rate limiting ─────────────────────────────────────────────────────────
    await _check_rate_limit(request, payload.player_id)

    # ── Call automation service ───────────────────────────────────────────────
    logging.info(
        f"[PlayerAPI] Verifying {payload.game!r} player_id={payload.player_id!r}"
    )

    res: dict | None = None
    if payload.game == "freefire":
        res = await verify_freefire_id(payload.player_id)
    elif payload.game == "pubg":
        res = await verify_pubg_id(payload.player_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_GAME",
                "message": f"Unknown game: {payload.game!r}. Use 'pubg' or 'freefire'.",
            },
        )

    # ── Handle result ─────────────────────────────────────────────────────────
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

    # Failure — preserve exact error_code from automation layer
    error_code = (res or {}).get("error_code") or "SERVICE_DOWN"
    error_msg  = (res or {}).get("error")      or "Verification failed."

    # Never leak raw Python exception strings — truncate/sanitise for UI safety
    # (full detail already logged with traceback inside automation.py)
    if "Internal" in error_msg or "Playwright" in error_msg or "Exception" in error_msg:
        error_msg = "Verification service is temporarily unavailable."

    http_status = (
        status.HTTP_404_NOT_FOUND
        if error_code == "INVALID_ID"
        else status.HTTP_400_BAD_REQUEST
    )

    logging.warning(
        f"[PlayerAPI] Verification failed: error_code={error_code!r} "
        f"player_id={payload.player_id!r}"
    )

    raise HTTPException(
        status_code=http_status,
        detail={"error_code": error_code, "message": error_msg},
    )
