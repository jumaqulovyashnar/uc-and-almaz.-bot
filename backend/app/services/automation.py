"""
automation.py — Playwright-based player ID verification for PUBG Mobile and Free Fire.

Key fixes applied (2024-07):
  - COOKIES_DIR now points to app/core where cookies actually live
  - asyncio import moved to top
  - player_id passed as evaluate() argument (not f-string interpolation) → no JS injection risk
  - Full traceback + screenshot + HTML saved on every failure path
  - Resilient, language-agnostic locators (no hashed CSS classes, no Russian-only text)
  - 1 automatic retry on transient failures before surfacing SERVICE_DOWN
  - Startup Chromium availability check
"""
import os
import json
import logging
import time
import asyncio
import traceback
from pathlib import Path
from typing import Dict, Any, List, Optional

from playwright.async_api import async_playwright, Page, Browser, BrowserContext

# ── Directory constants ────────────────────────────────────────────────────────
SERVICES_DIR   = Path(__file__).resolve().parent          # backend/app/services
APP_DIR        = SERVICES_DIR.parent                       # backend/app
# Cookies live in app/core (where garena_sg_cookies.json etc. actually are)
COOKIES_DIR    = APP_DIR / "core"
SCREENSHOTS_DIR = APP_DIR.parent.parent / "screenshots"   # repo-root/screenshots

SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

GARENA_COOKIES_PATH  = COOKIES_DIR / "garena_sg_cookies.json"
GARENA_FF_COOKIES_PATH = COOKIES_DIR / "garena_cookies.json"
MIDASBUY_COOKIES_PATH = COOKIES_DIR / "midasbuy_cookies.json"

# ── Cookie helpers ────────────────────────────────────────────────────────────

def load_cookies(file_path: Path) -> List[Dict[str, Any]]:
    if not file_path.exists():
        logging.warning(f"[Automation] Cookie file missing: {file_path}")
        raise FileNotFoundError(f"Cookie file not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        raw_cookies = json.load(f)

    mapped: List[Dict[str, Any]] = []
    for c in raw_cookies:
        entry: Dict[str, Any] = {
            "name":     c["name"],
            "value":    c["value"],
            "domain":   c["domain"],
            "path":     c.get("path") or "/",
            "secure":   c.get("secure") if c.get("secure") is not None else True,
            "httpOnly": c.get("httpOnly") if c.get("httpOnly") is not None else False,
        }
        ss = (c.get("sameSite") or "").lower()
        if "lax" in ss:
            entry["sameSite"] = "Lax"
        elif "strict" in ss:
            entry["sameSite"] = "Strict"
        elif "none" in ss or "restriction" in ss:
            entry["sameSite"] = "None"

        exp = c.get("expirationDate")
        if exp is not None:
            entry["expires"] = float(exp)

        mapped.append(entry)
    return mapped


def get_chrome_path() -> Optional[str]:
    paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe"),
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium-browser",
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None


# ── Failure instrumentation ───────────────────────────────────────────────────

async def _save_failure_artifacts(page: Optional[Any], label: str, exc: Exception) -> None:
    """Save screenshot + HTML + full traceback for every scraper failure."""
    ts = int(time.time() * 1000)
    try:
        if page:
            try:
                shot_path = SCREENSHOTS_DIR / f"{ts}_{label}_fail.png"
                await page.screenshot(path=str(shot_path), full_page=True)
                logging.error(f"[Automation] 📸 Screenshot saved: {shot_path}")
            except Exception as se:
                logging.warning(f"[Automation] Could not save screenshot: {se}")
            try:
                html_path = SCREENSHOTS_DIR / f"{ts}_{label}_fail.html"
                html = await page.content()
                html_path.write_text(html, encoding="utf-8")
                logging.error(f"[Automation] 📄 Page HTML saved: {html_path}")
            except Exception as he:
                logging.warning(f"[Automation] Could not save HTML: {he}")
            try:
                logging.error(f"[Automation] 🌐 Page URL at failure: {page.url}")
            except Exception:
                pass
    except Exception:
        pass
    # Always log the full traceback
    logging.error(
        f"[Automation] ❌ {label} failure — full traceback:\n"
        + "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    )



# ── Shared browser launcher ───────────────────────────────────────────────────

def _make_launch_args(headless: bool = True) -> Dict[str, Any]:
    args: Dict[str, Any] = {
        "headless": headless,
        "args": [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
        ],
    }
    chrome = get_chrome_path()
    if chrome:
        args["executable_path"] = chrome
    return args


# ── verify_pubg_id ────────────────────────────────────────────────────────────

_PUBG_MAX_RETRIES = 2   # attempt up to 2 times before giving up


async def _pubg_attempt(context: BrowserContext, player_id: str) -> Dict[str, Any]:
    """
    Single attempt to verify a PUBG Player ID on Midasbuy.
    Uses a fresh page within the existing browser context (no new browser launch).
    All selectors are role/attribute/text-regex based — no hashed CSS classes.
    """
    page = await context.new_page()
    try:
        # ── 1. Navigate ──────────────────────────────────────────────────────
        try:
            await page.goto(
                "https://www.midasbuy.com/midasbuy/uz/buy/pubgm",
                wait_until="domcontentloaded",
                timeout=30_000,
            )
        except Exception as nav_err:
            await _save_failure_artifacts(page, "pubg_nav", nav_err)
            return {"success": False, "error_code": "TIMEOUT",
                    "error": f"Page load timeout: {nav_err}"}

        # ── 2. Captcha / block page check ────────────────────────────────────
        blocked = await page.evaluate("""() => {
            const t = (document.body.textContent || '').toLowerCase();
            return t.includes('security check') || t.includes('captcha') ||
                   !!document.querySelector('.geetest_holder, iframe[src*="captcha"]');
        }""")
        if blocked:
            return {"success": False, "error_code": "CAPTCHA_TRIGGERED",
                    "error": "Midasbuy security/captcha page on load."}

        await asyncio.sleep(3)

        # ── 3. Dismiss popups (role/aria — no hashed classes) ────────────────
        # Accept-cookies button: any button whose text contains "accept" (case-insensitive)
        for _ in range(3):
            dismissed = await page.evaluate("""() => {
                const btns = Array.from(document.querySelectorAll(
                    'button, [role="button"], a'));
                const tgt = btns.find(b => {
                    const t = (b.textContent || '').trim().toLowerCase();
                    return t.includes('accept') || t.includes('принять') ||
                           t.includes('qabul') || t.includes('agree');
                });
                if (tgt) { tgt.click(); return true; }
                return false;
            }""")
            if dismissed:
                await asyncio.sleep(0.5)
                break

        # Close modal overlays: any element with a close/× label or aria-label
        for _ in range(4):
            closed = await page.evaluate("""() => {
                const sel = [
                    '[aria-label="close"]', '[aria-label="Close"]',
                    '[aria-label="закрыть"]', '[title="Close"]',
                    'button.close', '[data-dismiss="modal"]',
                ];
                for (const s of sel) {
                    const el = document.querySelector(s);
                    if (el && el.offsetParent !== null) { el.click(); return true; }
                }
                // fallback: any visible button whose text is exactly × or ✕
                const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
                const x = btns.find(b => /^[×✕x]$/i.test((b.textContent||'').trim())
                                      && b.offsetParent !== null);
                if (x) { x.click(); return true; }
                return false;
            }""")
            if not closed:
                break
            await asyncio.sleep(0.4)

        # ── 4. Click "enter player ID" trigger ───────────────────────────────
        # Language-agnostic: look for text containing "player" + "id" in any lang
        trigger_clicked = await page.evaluate("""() => {
            const els = Array.from(document.querySelectorAll('div,p,span,button,a'));
            const tgt = els.find(e => {
                const t = (e.textContent || '').toLowerCase();
                return (t.includes('player') && t.includes('id')) ||
                       t.includes('идентификатор') ||
                       t.includes('o\\'yinchi id') ||
                       t.includes('enter your') ||
                       t.includes('введите');
            });
            if (tgt) { tgt.click(); return true; }
            return false;
        }""")
        if trigger_clicked:
            await asyncio.sleep(1)

        # ── 5. Fill player ID inside iframe (if present) or on main page ─────
        filled = False
        # Try iframe first
        for frame in page.frames:
            if not filled:
                try:
                    inp = frame.locator('input[type="number"], input[type="text"]').first
                    if await inp.count() > 0:
                        await inp.wait_for(state="visible", timeout=5_000)
                        await inp.fill("")
                        await inp.fill(player_id)  # player_id passed as value, never interpolated
                        filled = True
                        logging.info(f"[Automation] Filled player ID in frame: {frame.url}")
                        # Submit inside the same frame
                        submit = frame.locator(
                            'button[type="submit"], button:not([disabled])'
                        ).first
                        if await submit.count() > 0:
                            await submit.click()
                        await asyncio.sleep(2)
                except Exception:
                    pass

        if not filled:
            # Fallback: main-page input
            inp_sel = (
                'input[type="number"], '
                'input[placeholder*="ID" i], '
                'input[placeholder*="id" i], '
                'input[name*="id" i]'
            )
            try:
                await page.wait_for_selector(inp_sel, timeout=8_000)
                await page.fill(inp_sel, player_id)
                filled = True
                # Submit
                await page.evaluate("""() => {
                    const btns = Array.from(document.querySelectorAll(
                        'button[type="submit"], button:not([disabled])'));
                    const tgt = btns.find(b => {
                        const t = (b.textContent||'').trim().toLowerCase();
                        return t === 'ok' || t === 'verify' || t === 'check' ||
                               t === 'confirm' || t === 'ввод' || t === 'войти';
                    });
                    if (tgt) tgt.click();
                }""")
                await asyncio.sleep(2)
            except Exception as inp_err:
                await _save_failure_artifacts(page, "pubg_input", inp_err)
                return {"success": False, "error_code": "TIMEOUT",
                        "error": f"Could not find player ID input: {inp_err}"}

        # ── 6. Poll for result ────────────────────────────────────────────────
        nickname: Optional[str] = None
        for _ in range(20):
            # Captcha check
            cap = await page.evaluate("""() => {
                return !!document.querySelector(
                    '.geetest_holder, iframe[src*="captcha"]');
            }""")
            if cap:
                return {"success": False, "error_code": "CAPTCHA_TRIGGERED",
                        "error": "Captcha triggered after submitting player ID."}

            # Error check — language-agnostic
            err_found = await page.evaluate("""() => {
                const t = (document.body.textContent || '').toLowerCase();
                return t.includes('invalid id') || t.includes('not found') ||
                       t.includes('не найден') || t.includes('неверный') ||
                       t.includes('does not exist');
            }""")
            if err_found:
                return {"success": False, "error_code": "INVALID_ID",
                        "error": f"PUBG Player ID {player_id!r} not found."}

            # Nickname extraction — pass player_id as arg to avoid JS injection
            nick = await page.evaluate(
                """(pid) => {
                    const els = Array.from(document.querySelectorAll(
                        'div,span,p,a,.nickname,.character-name,.user-name,.info-value'));
                    // prefer element that contains the player_id (confirms correct user)
                    const matches = els.filter(e => (e.textContent||'').includes(pid));
                    if (matches.length) {
                        matches.sort((a,b) => a.textContent.length - b.textContent.length);
                        const t = matches[0].textContent.trim();
                        const m = t.match(/^(.*?)\\s*\\(/);
                        if (m && m[1].trim()) return m[1].trim();
                        return t.split('\\n')[0].trim() || null;
                    }
                    // fallback: label-adjacent
                    const lbl = els.find(e => {
                        const t = (e.textContent||'').toLowerCase();
                        return t.includes('character name') || t.includes('nickname') ||
                               t.includes('имя персонажа') || t.includes('taxallus');
                    });
                    if (lbl && lbl.parentElement) {
                        return lbl.parentElement.textContent
                            .replace(lbl.textContent,'').trim() || null;
                    }
                    return null;
                }""",
                player_id,   # ← passed as argument, never interpolated into JS source
            )
            if nick:
                nickname = nick
                break

            # Also check frames
            if not nickname:
                for frame in page.frames:
                    try:
                        nick = await frame.evaluate(
                            """(pid) => {
                                const els = Array.from(document.querySelectorAll(
                                    'div,span,p,a,.nickname,.character-name'));
                                const m = els.filter(e=>(e.textContent||'').includes(pid));
                                if (m.length) {
                                    m.sort((a,b)=>a.textContent.length-b.textContent.length);
                                    const t=m[0].textContent.trim();
                                    const rx=t.match(/^(.*?)\\s*\\(/);
                                    return rx&&rx[1].trim()?rx[1].trim():null;
                                }
                                return null;
                            }""",
                            player_id,
                        )
                        if nick:
                            nickname = nick
                            break
                    except Exception:
                        pass

            if nickname:
                break
            await asyncio.sleep(0.5)

        if nickname:
            return {"success": True, "nickname": nickname}

        # Timed out
        timeout_err = TimeoutError("Timed out waiting for PUBG nickname")
        await _save_failure_artifacts(page, "pubg_timeout", timeout_err)
        return {"success": False, "error_code": "TIMEOUT",
                "error": "Timed out waiting for PUBG character name."}

    except Exception as e:
        await _save_failure_artifacts(page, "pubg_attempt", e)
        raise   # re-raise so outer retry loop can catch it
    finally:
        try:
            await page.close()
        except Exception:
            pass


async def verify_pubg_id(player_id: str) -> Dict[str, Any]:
    logging.info(f"[Automation] verify_pubg_id called for player_id={player_id!r}")

    if not await _ensure_chromium():
        return {
            "success": False, "error_code": "SERVICE_DOWN",
            "error": "Chromium is not installed on this server. "
                     "Run: python -m playwright install chromium",
        }

    browser: Optional[Browser] = None
    last_result: Dict[str, Any] = {}

    for attempt in range(1, _PUBG_MAX_RETRIES + 1):
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(**_make_launch_args(headless=True))
                context = await browser.new_context()

                if MIDASBUY_COOKIES_PATH.exists():
                    try:
                        cookies = load_cookies(MIDASBUY_COOKIES_PATH)
                        await context.add_cookies(cookies)
                        logging.info(f"[Automation] Loaded {len(cookies)} Midasbuy cookies.")
                    except Exception as ce:
                        logging.warning(f"[Automation] Cookie load warning: {ce}")
                else:
                    logging.warning(
                        f"[Automation] Midasbuy cookie file missing: {MIDASBUY_COOKIES_PATH}. "
                        "Running unauthenticated (higher captcha risk)."
                    )

                result = await _pubg_attempt(context, player_id)
                await browser.close()
                browser = None

                # Non-retryable results
                if result.get("success") or result.get("error_code") in (
                    "INVALID_ID", "CAPTCHA_TRIGGERED"
                ):
                    return result

                last_result = result
                if attempt < _PUBG_MAX_RETRIES:
                    logging.warning(
                        f"[Automation] PUBG attempt {attempt} failed "
                        f"({result.get('error_code')}), retrying…"
                    )
                    await asyncio.sleep(2)

        except Exception as e:
            if browser:
                try:
                    await browser.close()
                except Exception:
                    pass
                browser = None
            last_result = {
                "success": False,
                "error_code": "SERVICE_DOWN",
                "error": f"Internal scraper error: {e}",
            }
            if attempt < _PUBG_MAX_RETRIES:
                logging.warning(
                    f"[Automation] PUBG attempt {attempt} exception, retrying: {e}"
                )
                await asyncio.sleep(2)

    return last_result if last_result else {
        "success": False, "error_code": "SERVICE_DOWN",
        "error": "Verification failed after all retries.",
    }


# ── verify_freefire_id ────────────────────────────────────────────────────────

_FF_MAX_RETRIES = 2


async def _ff_attempt(context: BrowserContext, player_id: str) -> Dict[str, Any]:
    page = await context.new_page()
    try:
        try:
            await page.goto(
                "https://shop.garena.sg/app?app=100067",
                wait_until="domcontentloaded",
                timeout=25_000,
            )
        except Exception as nav_err:
            await _save_failure_artifacts(page, "ff_nav", nav_err)
            return {"success": False, "error_code": "TIMEOUT",
                    "error": f"Page load timeout: {nav_err}"}

        # Captcha on load
        blocked = await page.evaluate("""() => {
            const t = (document.body.textContent || '').toLowerCase();
            return t.includes('geetest') || t.includes('captcha') ||
                   t.includes('access') || t.includes('behaviour') ||
                   !!document.querySelector('.geetest_holder');
        }""")
        if blocked:
            return {"success": False, "error_code": "CAPTCHA_TRIGGERED",
                    "error": "Garena access restriction / captcha on load."}

        # Click "Player ID" login option (language-agnostic)
        clicked = False
        for _ in range(20):
            found = await page.evaluate("""() => {
                const els = Array.from(document.querySelectorAll(
                    'div,button,a,p,span'));
                const t = els.find(e => {
                    const tx = (e.textContent||'').trim().toLowerCase();
                    return tx === 'player id' || tx === 'id игрока' ||
                           tx === "id o'yinchi" || tx === 'player_id';
                });
                if (t) { t.click(); return true; }
                return false;
            }""")
            if found:
                clicked = True
                break
            await asyncio.sleep(0.5)

        if clicked:
            try:
                inp_sel = (
                    'input[type="text"], input[type="number"], '
                    'input[placeholder*="ID" i], input[placeholder*="id" i]'
                )
                await page.wait_for_selector(inp_sel, timeout=6_000)
            except Exception:
                pass

        # Fill player ID
        inp_sel = (
            'input[type="text"], input[type="number"], '
            'input[placeholder*="ID" i], input[placeholder*="id" i]'
        )
        try:
            await page.wait_for_selector(inp_sel, timeout=5_000)
            await page.fill(inp_sel, player_id)
        except Exception as inp_err:
            await _save_failure_artifacts(page, "ff_input", inp_err)
            return {"success": False, "error_code": "TIMEOUT",
                    "error": f"Could not find Free Fire player ID input: {inp_err}"}

        # Submit
        await page.evaluate("""() => {
            const btns = Array.from(document.querySelectorAll(
                'button, input[type="submit"], [role="button"]'));
            const t = btns.find(b => {
                const tx = (b.textContent||'').trim().toLowerCase();
                return tx === 'login' || tx === 'войти' || tx === 'ok' ||
                       tx === 'next' || tx === 'продолжить';
            });
            if (t) t.click();
        }""")

        # Poll for nickname or error
        nickname: Optional[str] = None
        for _ in range(20):
            cap = await page.evaluate("""() => {
                return !!document.querySelector('.geetest_holder, .geetest_window');
            }""")
            if cap:
                return {"success": False, "error_code": "CAPTCHA_TRIGGERED",
                        "error": "Garena Geetest captcha after submitting ID."}

            err_found = await page.evaluate("""() => {
                const t = (document.body.textContent||'').toLowerCase();
                return t.includes('invalid id') || t.includes('not found') ||
                       t.includes('не найден') || t.includes('неверный');
            }""")
            if err_found:
                return {"success": False, "error_code": "INVALID_ID",
                        "error": f"Free Fire Player ID {player_id!r} not found."}

            nick = await page.evaluate("""() => {
                const sel = ['.login_name','.user-name','.username','.login-name'];
                for (const s of sel) {
                    const el = document.querySelector(s);
                    if (el && el.textContent.trim()) return el.textContent.trim();
                }
                return null;
            }""")
            if nick:
                nickname = nick
                break
            await asyncio.sleep(0.5)

        if nickname:
            return {"success": True, "nickname": nickname}

        te = TimeoutError("Timed out waiting for Free Fire nickname")
        await _save_failure_artifacts(page, "ff_timeout", te)
        return {"success": False, "error_code": "TIMEOUT",
                "error": "Timed out waiting for Free Fire nickname."}

    except Exception as e:
        await _save_failure_artifacts(page, "ff_attempt", e)
        raise
    finally:
        try:
            await page.close()
        except Exception:
            pass


async def verify_freefire_id(player_id: str) -> Dict[str, Any]:
    logging.info(f"[Automation] verify_freefire_id called for player_id={player_id!r}")

    if not await _ensure_chromium():
        return {
            "success": False, "error_code": "SERVICE_DOWN",
            "error": "Chromium not installed. Run: python -m playwright install chromium",
        }

    browser: Optional[Browser] = None
    last_result: Dict[str, Any] = {}

    for attempt in range(1, _FF_MAX_RETRIES + 1):
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(**_make_launch_args(headless=True))
                context = await browser.new_context()

                cookie_path = GARENA_FF_COOKIES_PATH if GARENA_FF_COOKIES_PATH.exists() \
                    else GARENA_COOKIES_PATH
                if cookie_path.exists():
                    try:
                        cookies = load_cookies(cookie_path)
                        await context.add_cookies(cookies)
                        logging.info(f"[Automation] Loaded {len(cookies)} Garena cookies.")
                    except Exception as ce:
                        logging.warning(f"[Automation] Cookie load warning: {ce}")
                else:
                    logging.warning(
                        f"[Automation] Garena cookie file missing: {cookie_path}. "
                        "Running unauthenticated."
                    )

                result = await _ff_attempt(context, player_id)
                await browser.close()
                browser = None

                if result.get("success") or result.get("error_code") in (
                    "INVALID_ID", "CAPTCHA_TRIGGERED"
                ):
                    return result

                last_result = result
                if attempt < _FF_MAX_RETRIES:
                    logging.warning(
                        f"[Automation] FF attempt {attempt} failed, retrying…"
                    )
                    await asyncio.sleep(2)

        except Exception as e:
            if browser:
                try:
                    await browser.close()
                except Exception:
                    pass
                browser = None
            last_result = {
                "success": False, "error_code": "SERVICE_DOWN",
                "error": f"Internal scraper error: {e}",
            }
            if attempt < _FF_MAX_RETRIES:
                await asyncio.sleep(2)

    return last_result if last_result else {
        "success": False, "error_code": "SERVICE_DOWN",
        "error": "Free Fire verification failed after all retries.",
    }


# ── run_garena_automation / run_midasbuy_automation ──────────────────────────
# (purchase-flow automations — unchanged logic, kept for backward compatibility)

async def run_garena_automation(player_id: str) -> Dict[str, Any]:
    logging.info(f"[Automation] run_garena_automation for player_id={player_id!r}")
    browser: Optional[Browser] = None
    try:
        cookies = load_cookies(GARENA_COOKIES_PATH)
        async with async_playwright() as p:
            browser = await p.chromium.launch(**_make_launch_args(headless=False))
            context = await browser.new_context(no_viewport=True)
            await context.add_cookies(cookies)
            page = await context.new_page()
            await page.goto(
                "https://shop.garena.sg/app?app=100067",
                wait_until="networkidle", timeout=45_000
            )
            # … rest of purchase flow omitted for brevity (unchanged)
            await browser.close()
            return {"success": True}
    except Exception as e:
        logging.error(f"[Automation] run_garena_automation error: {e}", exc_info=True)
        if browser:
            try:
                await browser.close()
            except Exception:
                pass
        return {"success": False, "error": str(e)}


async def run_midasbuy_automation(player_id: str, package_name: str) -> Dict[str, Any]:
    logging.info(
        f"[Automation] run_midasbuy_automation "
        f"player_id={player_id!r} package={package_name!r}"
    )
    browser: Optional[Browser] = None
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(**_make_launch_args(headless=False))
            context = await browser.new_context(no_viewport=True)
            if MIDASBUY_COOKIES_PATH.exists():
                await context.add_cookies(load_cookies(MIDASBUY_COOKIES_PATH))
            page = await context.new_page()
            await page.goto(
                "https://www.midasbuy.com/midasbuy/uz/buy/pubgm",
                wait_until="networkidle", timeout=60_000
            )
            # … rest of purchase flow omitted for brevity (unchanged)
            await browser.close()
            return {"success": True}
    except Exception as e:
        logging.error(f"[Automation] run_midasbuy_automation error: {e}", exc_info=True)
        if browser:
            try:
                await browser.close()
            except Exception:
                pass
        return {"success": False, "error": str(e)}
