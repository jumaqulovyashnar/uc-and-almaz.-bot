# -*- coding: utf-8 -*-
"""
jollymax.py — PUBG Mobile player ID verification via JollyMax internal HTTP API.

No browser automation required — pure JSON HTTP requests.
Average response time: ~1-2 seconds vs ~15-20 seconds for Playwright.

Note: This uses JollyMax's undocumented internal API. While more stable than
Midasbuy scraping, it can change without notice. The Playwright fallback in
player.py handles that case.
"""
import asyncio
import logging
from typing import Optional, Dict, Any

import aiohttp

logger = logging.getLogger("jollymax")

TOKEN_URL     = "https://api.jollymax.com/aggregate-pay-gate/api/gateway"
CHECK_UID_URL = "https://topup-center.shoplay365.com/shareit-topup-center/order/check-uid"

DEFAULT_HEADERS = {
    "Accept":       "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Referer":      "https://www.jollymax.com/",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
}

REQUEST_TIMEOUT = aiohttp.ClientTimeout(total=8)


class JollyMaxError(Exception):
    """
    Raised for any JollyMax verification failure.
    error_code is compatible with the existing API contract:
      INVALID_ID | TIMEOUT | SERVICE_DOWN
    """
    def __init__(self, error_code: str, message: str):
        self.error_code = error_code
        self.message    = message
        super().__init__(message)


class JollyMaxParser:
    """
    Fetches a PUBG Mobile nickname by player ID via JollyMax internal
    (undocumented) HTTP API — no browser automation required.

    Usage (async context manager):
        async with JollyMaxParser(player_id, app_id=..., goods_id=..., pay_type_id=...) as user:
            print(user.nick_name)
    """

    def __init__(
        self,
        user_id: int,
        *,
        app_id:      str = "APP20220811034444301",
        goods_id:    str = "G20230718123400139",
        pay_type_id: str = "698832",
        retries:     int = 2,
    ):
        self.user_id     = user_id
        self.app_id      = app_id
        self.goods_id    = goods_id
        self.pay_type_id = pay_type_id
        self.retries     = retries

        self.session:    Optional[aiohttp.ClientSession] = None
        self._user_info: Dict[str, Any]                  = {"id": None, "nickname": None}
        self._token:     Optional[str]                   = None

    # ── Token ─────────────────────────────────────────────────────────────────

    async def get_token(self) -> str:
        payload = {
            "terminalType":    "PC_H5",
            "accessTokenType": "access_token",
            "bizType":         "userLogin",
            "deviceId":        "ddd05e88be7640ffbc949adc705b5cee",
            "loginType":       "visitor",
            "loginInfo": {"country": "tr", "language": "en", "deviceType": "mobile"},
            "version": "1.0",
            "domain":  "www.jollymax.com",
        }
        async with self.session.post(
            TOKEN_URL,
            headers=DEFAULT_HEADERS,
            json=payload,
            timeout=REQUEST_TIMEOUT,
        ) as resp:
            if resp.status != 200:
                raise JollyMaxError(
                    "SERVICE_DOWN",
                    f"Token endpoint returned HTTP {resp.status}",
                )
            data = await resp.json(content_type=None)
            if not data.get("success"):
                msg = data.get("msg", "unknown error")
                raise JollyMaxError("SERVICE_DOWN", f"Token request failed: {msg}")
            token = (data.get("data") or {}).get("token")
            if not token:
                raise JollyMaxError("SERVICE_DOWN", "Token missing in JollyMax response")
            return token

    # ── UID check ─────────────────────────────────────────────────────────────

    async def fetch_user_info(self) -> Dict[str, Any]:
        last_exc: Optional[Exception] = None

        for attempt in range(1, self.retries + 2):
            try:
                self._token = await self.get_token()

                payload = {
                    "token":      self._token,
                    "userId":     self.user_id,
                    "appId":      self.app_id,
                    "country":    "tr",
                    "language":   "en",
                    "appAlias":   "pubg",
                    "goodsId":    self.goods_id,
                    "payTypeId":  self.pay_type_id,
                    "domain":     "www.jollymax.com",
                }
                async with self.session.post(
                    CHECK_UID_URL,
                    headers=DEFAULT_HEADERS,
                    json=payload,
                    timeout=REQUEST_TIMEOUT,
                ) as resp:
                    if resp.status != 200:
                        raise JollyMaxError(
                            "SERVICE_DOWN",
                            f"check-uid endpoint returned HTTP {resp.status}",
                        )
                    data  = await resp.json(content_type=None)
                    inner = data.get("data") or {}
                    nickname = inner.get("nickName")
                    is_valid = inner.get("isValid")
                    if not nickname:
                        if is_valid == 1:
                            raise JollyMaxError(
                                "SERVICE_DOWN",
                                f"JollyMax verified ID {self.user_id} is valid, but did not return a nickname.",
                            )
                        else:
                            raise JollyMaxError(
                                "INVALID_ID",
                                f"PUBG Player ID {self.user_id} not found on JollyMax",
                            )
                    self._user_info = {"id": self.user_id, "nickname": nickname}
                    return self._user_info

            except JollyMaxError as e:
                if e.error_code in ("INVALID_ID", "SERVICE_DOWN"):
                    raise  # never retry a confirmed invalid ID or missing nickname
                last_exc = e
                logger.warning("[JollyMax] attempt %s failed: %s", attempt, e)
                await asyncio.sleep(0.5 * attempt)

            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                last_exc = e
                logger.warning("[JollyMax] network error, attempt %s: %s", attempt, e)
                await asyncio.sleep(0.5 * attempt)

        raise JollyMaxError(
            "TIMEOUT",
            f"JollyMax verification failed after {self.retries + 1} attempts: {last_exc}",
        )

    # ── Properties ────────────────────────────────────────────────────────────

    @property
    def id(self) -> Optional[int]:
        return self._user_info.get("id")

    @property
    def nick_name(self) -> Optional[str]:
        return self._user_info.get("nickname")

    @property
    def token(self) -> Optional[str]:
        return self._token

    # ── Async context manager ─────────────────────────────────────────────────

    async def __aenter__(self) -> "JollyMaxParser":
        self.session = aiohttp.ClientSession()
        await self.fetch_user_info()
        return self

    async def __aexit__(self, exc_type, exc_value, tb) -> None:
        if self.session:
            await self.session.close()
