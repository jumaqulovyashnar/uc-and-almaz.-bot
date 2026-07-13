import os
import json
import logging
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from playwright.async_api import async_playwright, Page, Browser

# Base directory for services
SERVICES_DIR = Path(__file__).resolve().parent
COOKIES_DIR = SERVICES_DIR.parent / "config"
SCREENSHOTS_DIR = SERVICES_DIR.parent.parent / "screenshots"

# Ensure directories exist
COOKIES_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

GARENA_COOKIES_PATH = COOKIES_DIR / "garena_sg_cookies.json"
MIDASBUY_COOKIES_PATH = COOKIES_DIR / "midasbuy_cookies.json"

def get_chrome_path() -> str:
    possible_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe")
    ]
    for p in possible_paths:
        if os.path.exists(p):
            return p
    raise RuntimeError("Google Chrome was not found on your system. Please install Google Chrome to run this bot.")

def load_cookies(file_path: Path) -> List[Dict[str, Any]]:
    if not file_path.exists():
        raise FileNotFoundError(f"Cookie file not found at: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        raw_cookies = json.load(f)

    mapped_cookies = []
    for cookie in raw_cookies:
        mapped = {
            "name": cookie["name"],
            "value": cookie["value"],
            "domain": cookie["domain"],
            "path": cookie.get("path") or "/",
            "secure": cookie.get("secure") if cookie.get("secure") is not None else True,
            "httpOnly": cookie.get("httpOnly") if cookie.get("httpOnly") is not None else False
        }

        # Playwright expects sameSite to be Lax, Strict, or None (case-sensitive)
        same_site = cookie.get("sameSite")
        if same_site:
            same_site_lower = same_site.lower()
            if "restriction" in same_site_lower:
                mapped["sameSite"] = "None"
            elif "lax" in same_site_lower:
                mapped["sameSite"] = "Lax"
            elif "strict" in same_site_lower:
                mapped["sameSite"] = "Strict"

        # Playwright expects expirationDate as float
        exp = cookie.get("expirationDate")
        if exp is not None:
            mapped["expires"] = float(exp)

        mapped_cookies.append(mapped)
    return mapped_cookies

async def run_garena_automation(player_id: str) -> Dict[str, Any]:
    logging.info(f"[Automation] Starting automation for Garena Player ID: {player_id}")
    browser: Optional[Browser] = None
    
    try:
        # 1. Load cookies
        cookies = load_cookies(GARENA_COOKIES_PATH)
        logging.info(f"[Automation] Loaded {len(cookies)} cookies from {GARENA_COOKIES_PATH}")

        # 2. Get Chrome path
        chrome_path = get_chrome_path()
        logging.info(f"[Automation] Using local Google Chrome: {chrome_path}")

        async with async_playwright() as p:
            # 3. Launch browser in visible mode
            browser = await p.chromium.launch(
                headless=False,
                executable_path=chrome_path,
                args=[
                    "--start-maximized",
                    "--no-sandbox",
                    "--disable-setuid-sandbox"
                ]
            )

            # Create context with maximized viewport
            context = await browser.new_context(no_viewport=True)
            await context.add_cookies(cookies)
            logging.info("[Automation] Injected session cookies into Playwright context")

            page = await context.new_page()

            # 4. Navigate to shop.garena.sg
            logging.info("[Automation] Navigating to shop.garena.sg...")
            await page.goto("https://shop.garena.sg/app?app=100067", wait_until="networkidle", timeout=45000)

            # 5. Click "Player ID" option
            logging.info("[Automation] Selecting Player ID login option...")
            
            # Recreate TS wait function using page.evaluate
            player_id_button_found = False
            for _ in range(30): # 15 seconds timeout equivalent
                found = await page.evaluate("""() => {
                    const elements = Array.from(document.querySelectorAll('div, button, a, p, span'));
                    const target = elements.find(el => {
                        const text = el.textContent?.trim().toLowerCase() || '';
                        return text === 'player id' || text === 'id игрока' || text === 'id o\\'yinchi' || text === 'player_id';
                    });
                    if (target) {
                        target.click();
                        return true;
                    }
                    return false;
                }""")
                if found:
                    player_id_button_found = True
                    break
                await asyncio.sleep(0.5)

            if not player_id_button_found:
                raise RuntimeError("Could not find or click Garena 'Player ID' login button")

            # 6. Type Player ID
            logging.info(f"[Automation] Entering Player ID: {player_id}")
            input_selector = 'input[type="text"], input[type="number"], input[placeholder*="ID"], input[placeholder*="id"]'
            await page.wait_for_selector(input_selector, timeout=10000)
            
            # Click and select all to clear, then type
            await page.click(input_selector, click_count=3)
            await page.keyboard.press("Backspace")
            await page.type(input_selector, player_id, delay=100)

            # 7. Submit Player ID
            logging.info("[Automation] Clicking Login...")
            login_clicked = False
            for _ in range(20):
                clicked = await page.evaluate("""() => {
                    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], div[role="button"]'));
                    const target = buttons.find(el => {
                        const text = el.textContent?.trim().toLowerCase() || '';
                        return text === 'login' || text === 'войти' || text === 'ok' || text === 'next' || text === 'продолжить';
                    });
                    if (target) {
                        target.click();
                        return true;
                    }
                    return false;
                }""")
                if clicked:
                    login_clicked = True
                    break
                await asyncio.sleep(0.5)

            if not login_clicked:
                raise RuntimeError("Could not click Garena login/submit button")

            # 8. Wait for payment methods to load
            logging.info("[Automation] Waiting for payment methods...")
            shells_loaded = False
            for _ in range(40):
                loaded = await page.evaluate("""() => {
                    const elements = Array.from(document.querySelectorAll('div, button, a, p, span'));
                    return elements.some(el => {
                        const text = el.textContent?.trim().toLowerCase() || '';
                        return text.includes('shells') || text.includes('prepaid card') || text.includes('шеллы') || text.includes('garena ppc');
                    });
                }""")
                if loaded:
                    shells_loaded = True
                    break
                await asyncio.sleep(0.5)

            if not shells_loaded:
                raise RuntimeError("Payment methods (Garena Shells) did not load in time")

            # 9. Click Garena Shells payment option
            logging.info("[Automation] Clicking Garena Shells payment option...")
            await page.evaluate("""() => {
                const elements = Array.from(document.querySelectorAll('div, button, a, p, span'));
                const target = elements.find(el => {
                    const text = el.textContent?.trim().toLowerCase() || '';
                    return text.includes('shells') || text.includes('prepaid card') || text.includes('шеллы') || text.includes('garena ppc');
                });
                if (target) {
                    target.click();
                }
            }""")

            # 10. Check session status (cookies expired?)
            logging.info("[Automation] Checking session status...")
            await asyncio.sleep(5.0)

            is_login_screen = await page.evaluate("""() => {
                const inputs = Array.from(document.querySelectorAll('input[type="password"], input[name="password"]'));
                return inputs.length > 0;
            }""")

            if is_login_screen:
                raise RuntimeError("Garena session cookie is expired or invalid. Please update the cookies in garena_sg_cookies.json")

            # 11. Take screenshot
            logging.info("[Automation] Reached payment screen. Capturing screenshot...")
            screenshot_path = SCREENSHOTS_DIR / f"order_{int(time.time() * 1000)}.png"
            await page.screenshot(path=str(screenshot_path), full_page=True)
            logging.info(f"[Automation] Screenshot saved to: {screenshot_path}")

            # 12. Visual wait
            logging.info("[Automation] Keeping browser open for 15 seconds for verification...")
            await asyncio.sleep(15.0)
            
            await browser.close()
            return {
                "success": True,
                "screenshotPath": str(screenshot_path)
            }
            
    except Exception as e:
        err_msg = str(e)
        logging.error(f"[Automation] Error during Garena browser automation: {err_msg}")
        if browser:
            try:
                await browser.close()
            except Exception:
                pass
        return {
            "success": False,
            "error": err_msg
        }

async def run_midasbuy_automation(player_id: str, package_name: str) -> Dict[str, Any]:
    logging.info(f"[MidasbuyAutomation] Starting automation. Player ID: {player_id}, Package: {package_name}")
    browser: Optional[Browser] = None
    
    try:
        # 1. Load cookies if they exist
        cookies = []
        if MIDASBUY_COOKIES_PATH.exists():
            cookies = load_cookies(MIDASBUY_COOKIES_PATH)
            logging.info(f"[MidasbuyAutomation] Loaded {len(cookies)} cookies from {MIDASBUY_COOKIES_PATH}")
        else:
            logging.info("[MidasbuyAutomation] No cookies found. Continuing as guest...")

        # 2. Get Chrome path
        chrome_path = get_chrome_path()
        logging.info(f"[MidasbuyAutomation] Using local Google Chrome: {chrome_path}")

        async with async_playwright() as p:
            # 3. Launch browser in visible mode
            browser = await p.chromium.launch(
                headless=False,
                executable_path=chrome_path,
                args=[
                    "--start-maximized",
                    "--no-sandbox",
                    "--disable-setuid-sandbox"
                ]
            )

            context = await browser.new_context(no_viewport=True)
            if cookies:
                await context.add_cookies(cookies)
                logging.info("[MidasbuyAutomation] Injected session cookies into Playwright context")

            page = await context.new_page()

            # 4. Navigate to Midasbuy
            logging.info("[MidasbuyAutomation] Navigating to Midasbuy...")
            await page.goto("https://www.midasbuy.com/midasbuy/uz/buy/pubgm", wait_until="networkidle", timeout=60000)

            # 5. Type Player ID
            logging.info("[MidasbuyAutomation] Entering Player ID...")
            input_selector = 'input[placeholder*="ID"], input[placeholder*="id"], input[placeholder*="Идентификатор"], input.input-bar__input, input.id-input'
            await page.wait_for_selector(input_selector, timeout=20000)
            
            await page.click(input_selector, click_count=3)
            await page.keyboard.press("Backspace")
            await page.type(input_selector, player_id, delay=100)

            # 6. Click Verify
            logging.info("[MidasbuyAutomation] Clicking OK/Verify...")
            await page.evaluate("""() => {
                const buttons = Array.from(document.querySelectorAll('button, div[role="button"], span, p, a, input[type="button"]'));
                const target = buttons.find(el => {
                    const text = el.textContent?.trim().toLowerCase() || '';
                    return text === 'ok' || text === 'ввод' || text === 'войти' || text === 'подтвердить' || text === 'check' || text === 'verify';
                });
                if (target) {
                    target.click();
                }
            }""")

            # Wait for validation
            await asyncio.sleep(3.0)

            # 7. Select package matching name
            logging.info(f"[MidasbuyAutomation] Selecting package matching '{package_name}'...")
            package_selected = await page.evaluate("""(pkgName) => {
                const cards = Array.from(document.querySelectorAll('div, li, button, span'));
                const cleanPkgName = pkgName.replace(/\\s+/g, '').toLowerCase();
                
                const target = cards.find(el => {
                    const text = el.textContent?.replace(/\\s+/g, '').toLowerCase() || '';
                    return text.includes(cleanPkgName) && text.includes('uc');
                });
                if (target) {
                    target.click();
                    return true;
                }
                return false;
            }""", package_name)

            if package_selected:
                logging.info(f"[MidasbuyAutomation] Package '{package_name}' card clicked.")
            else:
                logging.warning(f"[MidasbuyAutomation] Could not click package matching '{package_name}' dynamically.")

            # Check payment options
            await asyncio.sleep(2.0)

            # 8. Capture screenshot
            logging.info("[MidasbuyAutomation] Capturing final checkout screenshot...")
            screenshot_path = SCREENSHOTS_DIR / f"midasbuy_order_{int(time.time() * 1000)}.png"
            await page.screenshot(path=str(screenshot_path), full_page=True)
            logging.info(f"[MidasbuyAutomation] Screenshot saved to: {screenshot_path}")

            # 9. Visual wait
            logging.info("[MidasbuyAutomation] Keeping browser open for 15 seconds for verification...")
            await asyncio.sleep(15.0)

            await browser.close()
            return {
                "success": True,
                "screenshotPath": str(screenshot_path)
            }

    except Exception as e:
        err_msg = str(e)
        logging.error(f"[MidasbuyAutomation] Error during Midasbuy browser automation: {err_msg}")
        if browser:
            try:
                await browser.close()
            except Exception:
                pass
        return {
            "success": False,
            "error": err_msg
        }

import asyncio

async def verify_freefire_id(player_id: str) -> Dict[str, Any]:
    logging.info(f"[Automation] Verifying Free Fire Player ID: {player_id}")
    browser = None
    try:
        chrome_path = get_chrome_path()
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                executable_path=chrome_path,
                args=[
                    "--no-sandbox", 
                    "--disable-setuid-sandbox",
                    "--disable-blink-features=AutomationControlled"
                ]
            )
            context = await browser.new_context()
            
            # Load user cookies if they exist
            if GARENA_COOKIES_PATH.exists():
                try:
                    cookies = load_cookies(GARENA_COOKIES_PATH)
                    await context.add_cookies(cookies)
                except Exception as ce:
                    logging.warning(f"[Automation] Failed to load cookies: {ce}")
                    
            page = await context.new_page()
            
            # Go to Garena shop (using kzshop as provided by the user)
            try:
                await page.goto("https://kzshop.garena.com/app?app=100067", wait_until="domcontentloaded", timeout=20000)
            except Exception as te:
                logging.error(f"[Automation] Navigation timeout/error: {te}")
                await browser.close()
                return {"success": False, "error_code": "TIMEOUT", "error": f"Page load timeout: {str(te)}"}
            
            # Check if captcha/access restriction page is loaded immediately
            has_captcha = await page.evaluate("""() => {
                const text = document.body.textContent || '';
                const hasSliderText = text.includes('Проведите вправо') || text.includes('подтвердить доступ') || text.includes('captcha') || text.includes('geetest');
                const hasSliderElement = !!document.querySelector('.geetest_holder, .geetest_window, iframe[src*="captcha"], [class*="captcha"], [id*="captcha"]');
                const hasBlockText = text.includes('Доступ временно ограничен') || text.includes('behavior made us suspicious') || text.includes('поведение браузера нас насторожило');
                return hasSliderText || hasSliderElement || hasBlockText;
            }""")
            if has_captcha:
                logging.warning(f"[Automation] Captcha or access restriction detected on page load.")
                await browser.close()
                return {"success": False, "error_code": "CAPTCHA_TRIGGERED", "error": "Geetest/DataDome captcha or block page was triggered by the target website."}
            
            # Input selector
            input_selector = 'input[type="text"], input[type="number"], input[placeholder*="ID"], input[placeholder*="id"], input[placeholder*="игрока"]'
            
            # Check if input is already visible
            input_visible = False
            try:
                await page.wait_for_selector(input_selector, timeout=3000)
                input_visible = True
                logging.info("[Automation] Login input already visible, skipping click.")
            except Exception:
                pass

            if not input_visible:
                # Click Player ID login button (in RU: "ID игрока")
                player_id_button_found = False
                for _ in range(15):
                    # Check captcha during loop
                    captcha_check = await page.evaluate("""() => {
                        const text = document.body.textContent || '';
                        return text.includes('Проведите вправо') || text.includes('подтвердить доступ') || text.includes('captcha') || text.includes('geetest') || text.includes('Доступ временно ограничен');
                    }""")
                    if captcha_check:
                        await browser.close()
                        return {"success": False, "error_code": "CAPTCHA_TRIGGERED", "error": "Geetest/DataDome captcha triggered while searching for Player ID button."}
                        
                    found = await page.evaluate("""() => {
                        const elements = Array.from(document.querySelectorAll('div, button, a, p, span'));
                        const target = elements.find(el => {
                            const text = el.textContent?.trim().toLowerCase() || '';
                            return text === 'player id' || text === 'id игрока' || text === 'id o\\'yinchi' || text === 'player_id';
                        });
                        if (target) {
                            target.click();
                            return true;
                        }
                        return false;
                    }""")
                    if found:
                        player_id_button_found = True
                        break
                    await asyncio.sleep(0.5)
                    
                if not player_id_button_found:
                    await browser.close()
                    return {"success": False, "error_code": "SCRAPER_BLOCKED", "error": "Could not find Player ID login button."}
                
                try:
                    await page.wait_for_selector(input_selector, timeout=5000)
                except Exception as se:
                    await browser.close()
                    return {"success": False, "error_code": "TIMEOUT", "error": f"Timeout waiting for Player ID input field: {str(se)}"}

            # Input Player ID
            await page.click(input_selector, click_count=3)
            await page.keyboard.press("Backspace")
            await page.type(input_selector, player_id, delay=50)
            
            # Click Login (Войти)
            login_clicked = False
            for _ in range(15):
                clicked = await page.evaluate("""() => {
                    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], div[role="button"]'));
                    const target = buttons.find(el => {
                        const text = el.textContent?.trim().toLowerCase() || '';
                        return text === 'login' || text === 'войti' || text === 'войти' || text === 'ok' || text === 'next' || text === 'продолжить';
                    });
                    if (target) {
                        target.click();
                        return true;
                    }
                    return false;
                }""")
                if clicked:
                    login_clicked = True
                    break
                await asyncio.sleep(0.5)
                
            if not login_clicked:
                await browser.close()
                return {"success": False, "error_code": "SCRAPER_BLOCKED", "error": "Could not click Login button."}
                
            # Wait for user info or error to load
            nickname = None
            for _ in range(20):
                # Check for captcha slider popup
                captcha_popup = await page.evaluate("""() => {
                    const text = document.body.textContent || '';
                    const hasSliderText = text.includes('Проведите вправо') || text.includes('подтвердить доступ') || text.includes('captcha') || text.includes('geetest');
                    const hasSliderElement = !!document.querySelector('.geetest_holder, .geetest_window, iframe[src*="captcha"]');
                    return hasSliderText || hasSliderElement;
                }""")
                if captcha_popup:
                    logging.warning("[Automation] Captcha slider triggered after entering ID.")
                    await browser.close()
                    return {"success": False, "error_code": "CAPTCHA_TRIGGERED", "error": "Verification blocked by Garena Geetest Slider Captcha."}

                has_error = await page.evaluate("""() => {
                    const elements = Array.from(document.querySelectorAll('div, span, p, .error-msg, .error'));
                    return elements.some(el => {
                        const t = el.textContent?.trim().toLowerCase() || '';
                        return t.includes('неверный id') || t.includes('invalid id') || t.includes('user not found') || t.includes('пользователь не найден');
                    });
                }""")
                if has_error:
                    logging.warning(f"[Automation] Invalid Free Fire player ID: {player_id}")
                    await browser.close()
                    return {"success": False, "error_code": "INVALID_ID", "error": f"Free Fire Player ID '{player_id}' is invalid or does not exist."}
                    
                nickname = await page.evaluate("""() => {
                    const loginNameEl = document.querySelector('.login_name, .user-name, .username, .login-name');
                    if (loginNameEl && loginNameEl.textContent.trim()) {
                        return loginNameEl.textContent.trim();
                    }
                    
                    const elements = Array.from(document.querySelectorAll('div, span, p'));
                    const logoutEl = elements.find(el => {
                        const t = el.textContent?.trim().toLowerCase();
                        return t === 'выйти' || t === 'logout';
                    });
                    if (logoutEl && logoutEl.parentElement) {
                        return logoutEl.parentElement.textContent.replace('Выйти', '').replace('Logout', '').trim();
                    }
                    return null;
                }""")
                if nickname:
                    break
                await asyncio.sleep(0.5)
                
            await browser.close()
            if nickname:
                return {"success": True, "nickname": nickname}
            else:
                return {"success": False, "error_code": "TIMEOUT", "error": "Verification timed out waiting for nickname to load."}
                
    except Exception as e:
        logging.error(f"[Automation] Free Fire ID verification failed: {e}", exc_info=True)
        if browser:
            try:
                await browser.close()
            except Exception:
                pass
        return {"success": False, "error_code": "SERVICE_DOWN", "error": f"Internal Playwright/Scraper exception: {str(e)}"}

async def verify_pubg_id(player_id: str) -> Dict[str, Any]:
    logging.info(f"[Automation] Verifying PUBG Player ID: {player_id}")
    browser = None
    try:
        chrome_path = get_chrome_path()
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                executable_path=chrome_path,
                args=[
                    "--no-sandbox", 
                    "--disable-setuid-sandbox",
                    "--disable-blink-features=AutomationControlled"
                ]
            )
            context = await browser.new_context()
            
            if MIDASBUY_COOKIES_PATH.exists():
                try:
                    cookies = load_cookies(MIDASBUY_COOKIES_PATH)
                    await context.add_cookies(cookies)
                except Exception as ce:
                    logging.warning(f"[Automation] Failed to load cookies: {ce}")
                    
            page = await context.new_page()
            
            # Go to Midasbuy PUBG Mobile page
            try:
                await page.goto("https://www.midasbuy.com/midasbuy/uz/buy/pubgm", wait_until="domcontentloaded", timeout=20000)
            except Exception as te:
                logging.error(f"[Automation] Navigation timeout/error: {te}")
                await browser.close()
                return {"success": False, "error_code": "TIMEOUT", "error": f"Page load timeout: {str(te)}"}
            
            # Check for Midasbuy captcha/block page
            has_captcha = await page.evaluate("""() => {
                const text = document.body.textContent || '';
                return text.includes('verify') || text.includes('captcha') || text.includes('security check') || text.includes('робот') || text.includes('подтвердите');
            }""")
            if has_captcha:
                await browser.close()
                return {"success": False, "error_code": "CAPTCHA_TRIGGERED", "error": "Midasbuy security verification/captcha triggered on page load."}
            
            # Type Player ID
            input_selector = 'input[placeholder*="ID"], input[placeholder*="id"], input[placeholder*="Идентификатор"], input.input-bar__input, input.id-input'
            try:
                await page.wait_for_selector(input_selector, timeout=10000)
            except Exception as se:
                await browser.close()
                return {"success": False, "error_code": "TIMEOUT", "error": f"Timeout waiting for PUBG Player ID input: {str(se)}"}
                
            await page.click(input_selector, click_count=3)
            await page.keyboard.press("Backspace")
            await page.type(input_selector, player_id, delay=50)
            
            # Click Verify OK
            clicked = await page.evaluate("""() => {
                const buttons = Array.from(document.querySelectorAll('button, div[role="button"], span, p, a, input[type="button"]'));
                const target = buttons.find(el => {
                    const text = el.textContent?.trim().toLowerCase() || '';
                    return text === 'ok' || text === 'ввод' || text === 'войти' || text === 'подтвердить' || text === 'check' || text === 'verify';
                });
                if (target) {
                    target.click();
                    return true;
                }
                return false;
            }""")
            if not clicked:
                await browser.close()
                return {"success": False, "error_code": "SCRAPER_BLOCKED", "error": "Could not find or click PUBG verification button."}
            
            # Wait for nickname to load
            nickname = None
            for _ in range(15):
                # Check for captcha or blocker
                captcha_popup = await page.evaluate("""() => {
                    const text = document.body.textContent || '';
                    return text.includes('verify') || text.includes('captcha') || text.includes('security check');
                }""")
                if captcha_popup:
                    await browser.close()
                    return {"success": False, "error_code": "CAPTCHA_TRIGGERED", "error": "Blocked by Midasbuy Security Captcha Verification."}

                has_error = await page.evaluate("""() => {
                    const elements = Array.from(document.querySelectorAll('div, span, p, .error-msg, .error'));
                    return elements.some(el => {
                        const t = el.textContent?.trim().toLowerCase() || '';
                        return t.includes('error') || t.includes('не найден') || t.includes('invalid') || t.includes('not found') || t.includes('неverny id') || t.includes('неверный id');
                    });
                }""")
                if has_error:
                    logging.warning(f"[Automation] Invalid PUBG player ID: {player_id}")
                    await browser.close()
                    return {"success": False, "error_code": "INVALID_ID", "error": f"PUBG Player ID '{player_id}' is invalid or does not exist."}
                    
                nickname = await page.evaluate("""() => {
                    const elements = Array.from(document.querySelectorAll('div, span, p'));
                    const labelEl = elements.find(el => {
                        const t = el.textContent?.trim().toLowerCase() || '';
                        return t.includes('character name') || t.includes('имя персонажа') || t.includes('nickname') || t.includes('taxallus');
                    });
                    if (labelEl && labelEl.parentElement) {
                        return labelEl.parentElement.textContent.replace(labelEl.textContent, '').trim();
                    }
                    
                    const nickEl = document.querySelector('.nickname, .user-name, .character-name, .info-value, .name');
                    if (nickEl && nickEl.textContent.trim()) {
                        return nickEl.textContent.trim();
                    }
                    return null;
                }""")
                if nickname:
                    break
                await asyncio.sleep(0.5)
                
            await browser.close()
            if nickname:
                return {"success": True, "nickname": nickname}
            else:
                return {"success": False, "error_code": "TIMEOUT", "error": "Verification timed out waiting for PUBG character name to load."}
                
    except Exception as e:
        logging.error(f"[Automation] PUBG ID verification failed: {e}", exc_info=True)
        if browser:
            try:
                await browser.close()
            except Exception:
                pass
        return {"success": False, "error_code": "SERVICE_DOWN", "error": f"Internal Playwright/Scraper exception: {str(e)}"}


