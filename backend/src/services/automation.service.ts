import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// @ts-ignore
puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COOKIES_PATH = path.join(__dirname, '../config/garena_sg_cookies.json');

interface AutomationResult {
  success: boolean;
  screenshotPath?: string;
  error?: string;
}

/**
 * Finds the local Google Chrome installation on Windows.
 */
function getChromePath(): string {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  throw new Error('Google Chrome was not found on your system. Please install Google Chrome to run this bot.');
}

/**
 * Maps raw extension cookies to Puppeteer cookie format
 */
function loadCookies(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Cookie file not found at: ${filePath}`);
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  const rawCookies = JSON.parse(rawData);

  return rawCookies.map((cookie: any) => {
    const mapped: any = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      secure: cookie.secure ?? true,
      httpOnly: cookie.httpOnly ?? false,
    };

    if (cookie.expirationDate) {
      mapped.expires = cookie.expirationDate;
    }

    if (cookie.sameSite) {
      if (cookie.sameSite === 'no_restriction') {
        mapped.sameSite = 'None';
      } else if (cookie.sameSite === 'lax') {
        mapped.sameSite = 'Lax';
      } else if (cookie.sameSite === 'strict') {
        mapped.sameSite = 'Strict';
      }
    }

    return mapped;
  });
}

/**
 * Automates Garena SG Free Fire topup flow up to the payment screen.
 */
export async function runGarenaAutomation(playerId: string): Promise<AutomationResult> {
  console.log(`[Automation] Starting automation for Player ID: ${playerId}`);
  
  let browser;
  try {
    // 1. Load session cookies
    const cookies = loadCookies(COOKIES_PATH);
    console.log(`[Automation] Loaded ${cookies.length} cookies from ${COOKIES_PATH}`);

    // Find local Google Chrome executable on Windows
    const chromePath = getChromePath();
    console.log(`[Automation] Using local Google Chrome: ${chromePath}`);

    // 2. Launch Puppeteer browser in visible mode (headless: false) using local Chrome
    browser = await (puppeteer as any).launch({
      headless: false,
      executablePath: chromePath,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ],
    });

    const page = await browser.newPage();

    // 3. Set cookies on the page matching shop.garena.sg
    await page.setCookie(...cookies);
    console.log('[Automation] Injected session cookies into browser context');

    // 4. Navigate to Garena Free Fire Topup page
    console.log('[Automation] Navigating to shop.garena.sg...');
    await page.goto('https://shop.garena.sg/app?app=100067', {
      waitUntil: 'networkidle2',
      timeout: 45000,
    });

    // 5. Select "Player ID" option
    console.log('[Automation] Selecting Player ID login option...');
    await page.waitForFunction(() => {
      // Find element by text content (case insensitive, English or Russian)
      const elements = Array.from(document.querySelectorAll('div, button, a, p, span'));
      const found = elements.find(el => {
        const text = el.textContent?.trim().toLowerCase() || '';
        return text === 'player id' || text === 'id игрока' || text === 'id o\'yinchi' || text === 'player_id';
      });
      if (found) {
        (found as HTMLElement).click();
        return true;
      }
      return false;
    }, { timeout: 15000 });

    // 6. Enter Player ID in the input field
    console.log(`[Automation] Entering Player ID: ${playerId}...`);
    const inputSelector = 'input[type="text"], input[type="number"], input[placeholder*="ID"], input[placeholder*="id"]';
    await page.waitForSelector(inputSelector, { timeout: 10000 });
    
    // Clear and type
    await page.click(inputSelector, { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type(inputSelector, playerId, { delay: 100 });

    // 7. Submit Player ID
    console.log('[Automation] Clicking Login...');
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], div[role="button"]'));
      const found = buttons.find(el => {
        const text = el.textContent?.trim().toLowerCase() || '';
        return text === 'login' || text === 'войти' || text === 'ok' || text === 'next' || text === 'продолжить';
      });
      if (found) {
        (found as HTMLElement).click();
        return true;
      }
      return false;
    }, { timeout: 10000 });

    // 8. Wait for the page to transition and load payment options
    console.log('[Automation] Waiting for payment methods to load...');
    
    // Garena Shells option is usually identified by its text
    await page.waitForFunction(() => {
      const elements = Array.from(document.querySelectorAll('div, button, a, p, span'));
      return elements.some(el => {
        const text = el.textContent?.trim().toLowerCase() || '';
        return text.includes('shells') || text.includes('prepaid card') || text.includes('шеллы') || text.includes('garena ppc');
      });
    }, { timeout: 20000 });

    // 9. Click on Garena Shells payment method
    console.log('[Automation] Clicking Garena Shells option...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('div, button, a, p, span'));
      const found = elements.find(el => {
        const text = el.textContent?.trim().toLowerCase() || '';
        return text.includes('shells') || text.includes('prepaid card') || text.includes('шеллы') || text.includes('garena ppc');
      });
      if (found) {
        (found as HTMLElement).click();
      }
    });

    // 10. Check if we need to log in to Garena account or if we are already logged in via cookies
    console.log('[Automation] Checking session status...');
    
    // We wait a few seconds to see if the session loads or if it gets stuck on login screen
    await new Promise(resolve => setTimeout(resolve, 5000));

    // If there is an input field for "Garena Username" or password, it means the cookies are invalid or expired!
    const isLoginScreen = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="password"], input[name="password"]'));
      return inputs.length > 0;
    });

    if (isLoginScreen) {
      throw new Error('Garena session cookie is expired or invalid. Please update the cookies in garena_sg_cookies.json');
    }

    // 11. Take screenshot at the final payment screen (for confirmation/debugging)
    console.log('[Automation] Reached final payment screen. Capturing screenshot...');
    const screenshotsDir = path.join(__dirname, '../../screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotsDir, `order_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[Automation] Screenshot saved to: ${screenshotPath}`);

    // Keep the browser open for 15 seconds so the user can see it on their screen
    console.log('[Automation] Keeping browser open for 15 seconds so you can verify the screen...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    await browser.close();
    console.log('[Automation] Browser closed. Automation successful.');
    
    return {
      success: true,
      screenshotPath,
    };

  } catch (error) {
    const errMessage = (error as Error).message;
    console.error('[Automation] Error during browser automation:', errMessage);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    
    return {
      success: false,
      error: errMessage,
    };
  }
}
