import asyncio
import logging
import sys
import os
from playwright.async_api import async_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.automation import get_chrome_path

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

async def test():
    player_id = "16342296705"
    chrome_path = get_chrome_path()
    user_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "garena_user_data")
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False,
            executable_path=chrome_path,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled"
            ]
        )
        page = await context.new_page()
        
        print("Navigating...")
        await page.goto("https://kzshop.garena.com/app?app=100067", wait_until="domcontentloaded", timeout=20000)
        await page.screenshot(path="step1_loaded.png")
        
        input_selector = 'input[type="text"], input[type="number"], input[placeholder*="ID"], input[placeholder*="id"], input[placeholder*="игрока"]'
        await page.wait_for_selector(input_selector, timeout=5000)
        await page.click(input_selector, click_count=3)
        await page.keyboard.press("Backspace")
        await page.type(input_selector, player_id, delay=50)
        await page.screenshot(path="step2_typed.png")
        
        # Click login
        clicked = await page.evaluate("""() => {
            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], div[role="button"]'));
            const target = buttons.find(el => {
                const text = el.textContent?.trim().toLowerCase() || '';
                return text === 'login' || text === 'войti' || text === 'войti' || text === 'войти' || text === 'ok' || text === 'next' || text === 'продолжить';
            });
            if (target) {
                target.click();
                return true;
            }
            return false;
        }""")
        print("Clicked login button:", clicked)
        await page.screenshot(path="step3_clicked_login.png")
        
        # Wait 5 seconds and take final screenshot & HTML
        await asyncio.sleep(5.0)
        await page.screenshot(path="step4_final.png")
        body = await page.content()
        with open("step4_body.html", "w", encoding="utf-8") as f:
            f.write(body)
            
        await context.close()
        print("Done. Saved screenshots and step4_body.html")

asyncio.run(test())
