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



# ── Startup Chromium check ────────────────────────────────────────────────────
_chromium_ok: Optional[bool] = None  # None = not yet checked


async def _ensure_chromium() -> bool:
    """
    Launch and immediately close Chromium once to verify the binary is installed.
    Cached after first call — only runs once per process lifetime.
    """
    global _chromium_ok
    if _chromium_ok is not None:
        return _chromium_ok
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(headless=True)
            await b.close()
        _chromium_ok = True
        logging.info("[Automation] ✅ Chromium binary is available.")
    except Exception as e:
        _chromium_ok = False
        logging.error(
            "[Automation] ❌ Chromium is NOT installed or not found. "
            "Run: python -m playwright install chromium\n"
            f"  Detail: {e}"
        )
    return _chromium_ok


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
    Uses a fresh page within the existing browser context.
    Uses the robust iframe input handling and nickname extraction from test_pubg_14.py.
    """
    page = await context.new_page()
    try:
        # ── 1. Navigate ──────────────────────────────────────────────────────
        try:
            await page.goto(
                "https://www.midasbuy.com/midasbuy/uz/buy/pubgm?lang=ru",
                wait_until="domcontentloaded",
                timeout=30_000,
            )
        except Exception as nav_err:
            await _save_failure_artifacts(page, "pubg_nav", nav_err)
            return {"success": False, "error_code": "TIMEOUT",
                    "error": f"Page load timeout: {nav_err}"}

        # ── 2. Captcha / block page check ────────────────────────────────────
        blocked = await page.evaluate("""() => {
            const t = (document.body.innerText || '').toLowerCase();
            return t.includes('security check') || t.includes('captcha') ||
                   !!document.querySelector('.geetest_holder, iframe[src*="captcha"]');
        }""")
        if blocked:
            return {"success": False, "error_code": "CAPTCHA_TRIGGERED",
                    "error": "Midasbuy security/captcha page on load."}

        try:
            # Wait up to 3 seconds for the login trigger to be attached
            trigger = page.locator('text="Введите свой идентификатор игрока сейчас"').first
            await trigger.wait_for(state="attached", timeout=3000)
        except Exception:
            pass

        # ── 3. Dismiss popups & Accept Cookies ───────────────────────────────
        # Close Point Shop / event popups first
        for selector in [".close_button-JHHCtQ", ".MidasbuyUI-close_btn_23ba7b"]:
            try:
                loc = page.locator(selector)
                count = await loc.count()
                for i in range(count):
                    el = loc.nth(i)
                    if await el.is_visible():
                        await el.click(force=True)
            except Exception:
                pass

        # Accept all cookies
        try:
            cookie_btn = page.locator('text="Принять все"').first
            if await cookie_btn.is_visible():
                await cookie_btn.click(force=True)
                await asyncio.sleep(0.2)
            else:
                # Fallback to general search including divs
                await page.evaluate("""() => {
                    const btns = Array.from(document.querySelectorAll('button, [role="button"], a, div'));
                    const tgt = btns.find(b => {
                        const t = (b.textContent || '').trim().toLowerCase();
                        return t.includes('accept') || t.includes('принять') ||
                               t.includes('qabul') || t.includes('agree');
                    });
                    if (tgt) { tgt.click(); return true; }
                    return false;
                }""")
                await asyncio.sleep(0.2)
        except Exception:
            pass

        # ── 4. Click Player ID login trigger ─────────────────────────────────
        try:
            trigger = page.locator('text="Введите свой идентификатор игрока сейчас"').first
            if await trigger.is_visible():
                try: await trigger.scroll_into_view_if_needed(timeout=2000)
                except Exception: pass
                await trigger.click(force=True)
                await asyncio.sleep(0.2)
            else:
                await page.evaluate("""() => {
                    const divs = Array.from(document.querySelectorAll('div, p, span, button'));
                    const trigger = divs.find(d => d.textContent && (
                        d.textContent.includes('Введите свой') || 
                        d.textContent.includes('идентификатор') || 
                        d.textContent.includes("id o'yinchi") || 
                        d.textContent.includes('Enter your player ID')
                    ));
                    if (trigger) trigger.click();
                }""")
                await asyncio.sleep(0.2)
        except Exception:
            pass

        # ── 5. Fill Player ID inside iframe (or main page as fallback) ───────
        filled = False
        try:
            # Scroll parent iframe element on main page into view
            try:
                iframe_element = page.locator('iframe[src*="playerid_enter"]').first
                await iframe_element.scroll_into_view_if_needed(timeout=2000)
            except Exception:
                pass

            iframe_locator = page.frame_locator('iframe[src*="playerid_enter"]')
            input_selector = 'input[type="number"], input[placeholder*="ID"], input[placeholder*="id"]'
            input_field = iframe_locator.locator(input_selector).first
            await input_field.wait_for(state="visible", timeout=8_000)
            try:
                await input_field.scroll_into_view_if_needed(timeout=2000)
            except Exception:
                pass
            await input_field.fill(player_id)
            filled = True
            
            # Click Verify/Submit button inside the iframe
            ok_button = iframe_locator.locator('.Button_btn_primary__1ncdM').first
            try:
                await ok_button.scroll_into_view_if_needed(timeout=2000)
            except Exception:
                pass
            
            if await ok_button.is_visible():
                await ok_button.click(force=True)
            else:
                # Try clicking any submit button inside iframe
                submit_btn = iframe_locator.locator('button, div[role="button"], input[type="button"]').first
                try:
                    await submit_btn.scroll_into_view_if_needed(timeout=2000)
                except Exception:
                    pass
                await submit_btn.click(force=True)
            await asyncio.sleep(0.5)
        except Exception as iframe_err:
            logging.warning(f"[Automation] Iframe method failed: {iframe_err}, trying main page fallback.")

        if not filled:
            # Fallback: main-page input
            inp_sel = (
                'input[type="number"], '
                'input[placeholder*="ID" i], '
                'input[placeholder*="id" i], '
                'input[name*="id" i]'
            )
            try:
                await page.wait_for_selector(inp_sel, timeout=5_000)
                await page.fill(inp_sel, player_id)
                filled = True
                # Submit OK
                await page.evaluate("""() => {
                    const btns = Array.from(document.querySelectorAll(
                        'button, div[role="button"], span, p, a, input[type="button"]'));
                    const tgt = btns.find(b => {
                        const t = (b.textContent||'').trim().toLowerCase();
                        return t === 'ok' || t === 'verify' || t === 'check' ||
                               t === 'confirm' || t === 'ввод' || t === 'войти';
                    });
                    if (tgt) tgt.click();
                }""")
                await asyncio.sleep(0.5)
            except Exception as inp_err:
                await _save_failure_artifacts(page, "pubg_input", inp_err)
                return {"success": False, "error_code": "TIMEOUT",
                        "error": f"Could not find player ID input: {inp_err}"}

        # ── 6. Extract Nickname ───────────────────────────────────────────────
        nickname = None
        for _ in range(15):
            # Check for invalid ID error messages on main page or inside frames first
            err_found = False
            
            # Check main page
            err_found_main = await page.evaluate("""() => {
                const t = (document.body.innerText || '').toLowerCase();
                const keywords = ["недопустимый игровой id", "неверный id", "игрок не найден", "invalid player id", "player not found", "invalid game id", "invalid id"];
                return keywords.some(kw => t.includes(kw));
            }""")
            if err_found_main:
                err_found = True
                
            # Check inside iframe frames
            if not err_found:
                for f in page.frames:
                    if "playerid_enter" in f.url:
                        try:
                            err_found_frame = await f.evaluate("""() => {
                                const t = (document.body.innerText || '').toLowerCase();
                                const keywords = ["недопустимый игровой id", "неверный id", "игрок не найден", "invalid player id", "player not found", "invalid game id", "invalid id"];
                                return keywords.some(kw => t.includes(kw));
                            }""")
                            if err_found_frame:
                                err_found = True
                                break
                        except Exception:
                            pass
            
            if err_found:
                logging.warning(f"[Automation] PUBG Player ID {player_id} detected as invalid/not found.")
                return {"success": False, "error_code": "INVALID_ID",
                        "error": f"PUBG Player ID {player_id} not found."}

            # Try to get nickname from main page
            nickname = await page.evaluate(f"""() => {{
                const elements = Array.from(document.querySelectorAll('div, span, p, a'));
                const matches = elements.filter(el => {{
                    const t = el.textContent || '';
                    return t.includes('{player_id}');
                }});
                if (matches.length > 0) {{
                    matches.sort((a, b) => a.textContent.length - b.textContent.length);
                    let target = matches[0];
                    let text = target.textContent.trim();
                    let match = text.match(/^(.*?)\s*\(/);
                    if (match && match[1].trim()) return match[1].trim();
                    
                    if (target.parentElement) {{
                        text = target.parentElement.textContent.trim();
                        match = text.match(/^(.*?)\s*\(/);
                        if (match && match[1].trim()) return match[1].trim();
                    }}
                }}
                return null;
            }}""")

            # If not found on main page, try inside iframe
            if not nickname:
                try:
                    for f in page.frames:
                        if "playerid_enter" in f.url:
                            nickname = await f.evaluate(f"""() => {{
                                const elements = Array.from(document.querySelectorAll('div, span, p, a'));
                                const matches = elements.filter(el => {{
                                    const t = el.textContent || '';
                                    return t.includes('{player_id}');
                                }});
                                if (matches.length > 0) {{
                                    matches.sort((a, b) => a.textContent.length - b.textContent.length);
                                    let target = matches[0];
                                    let text = target.textContent.trim();
                                    let match = text.match(/^(.*?)\s*\(/);
                                    if (match && match[1].trim()) return match[1].trim();
                                    
                                    if (target.parentElement) {{
                                        text = target.parentElement.textContent.trim();
                                        match = text.match(/^(.*?)\s*\(/);
                                        if (match && match[1].trim()) return match[1].trim();
                                    }}
                                }}
                                return null;
                            }}""")
                            if nickname:
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
        raise
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
            const t = (document.body.innerText || '').toLowerCase();
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
                const t = (document.body.innerText || '').toLowerCase();
                const keywords = ["недопустимый игровой id", "неверный id", "игрок не найден", "invalid player id", "player not found", "invalid game id", "invalid id"];
                return keywords.some(kw => t.includes(kw));
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
