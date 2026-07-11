import { query } from '../config/database.js';

interface CbuCurrency {
  Ccy: string;
  Rate: string;
}

interface DbPackage {
  id: number;
  game: string;
  name: string;
  usd_price: string;
  markup_percent: string;
}

/**
 * Fetches the current USD to UZS exchange rate from the Central Bank of Uzbekistan API.
 */
export async function getUsdExchangeRate(): Promise<number> {
  try {
    console.log('[PriceSync] Fetching exchange rates from CBU API...');
    const response = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/');
    if (!response.ok) {
      throw new Error(`CBU API returned status code: ${response.status}`);
    }

    const data = (await response.json()) as CbuCurrency[];
    const usdInfo = data.find((curr) => curr.Ccy === 'USD');

    if (!usdInfo || !usdInfo.Rate) {
      throw new Error('USD exchange rate not found in CBU response');
    }

    const rate = parseFloat(usdInfo.Rate);
    if (isNaN(rate) || rate <= 0) {
      throw new Error(`Invalid USD exchange rate received: ${usdInfo.Rate}`);
    }

    console.log(`[PriceSync] Current USD Exchange Rate: 1 USD = ${rate} UZS`);
    return rate;
  } catch (error) {
    console.error('[PriceSync] getUsdExchangeRate error:', (error as Error).message);
    throw error;
  }
}

/**
 * Rounds the calculated price to the nearest 100 UZS for clean display.
 */
function roundToNearest100(value: number): number {
  return Math.round(value / 100) * 100;
}

/**
 * Synchronizes all package prices based on current USD exchange rate and markup.
 */
export async function syncPackagePrices(): Promise<{ success: boolean; updatedCount: number; rate: number }> {
  try {
    const rate = await getUsdExchangeRate();

    // Fetch all packages with a defined USD price
    const packagesResult = await query<DbPackage>(
      'SELECT id, game, name, usd_price, markup_percent FROM game_packages WHERE usd_price > 0'
    );
    const packages = packagesResult.rows;
    console.log(`[PriceSync] Found ${packages.length} packages to synchronize`);

    let updatedCount = 0;

    for (const pkg of packages) {
      const usdPrice = parseFloat(pkg.usd_price);
      const markupPercent = parseFloat(pkg.markup_percent);

      if (isNaN(usdPrice) || usdPrice <= 0) continue;

      // Base price = raw conversion
      const basePrice = usdPrice * rate;
      // Sell price = base price + profit markup
      const rawSellPrice = basePrice * (1 + markupPercent / 100);
      
      const roundedBase = roundToNearest100(basePrice);
      const roundedSell = roundToNearest100(rawSellPrice);

      // Update in database
      await query(
        `UPDATE game_packages 
         SET base_price = $1, sell_price = $2, updated_at = NOW() 
         WHERE id = $3`,
        [roundedBase, roundedSell, pkg.id]
      );

      updatedCount++;
    }

    console.log(`[PriceSync] Successfully updated ${updatedCount} package prices in the database.`);
    return {
      success: true,
      updatedCount,
      rate,
    };
  } catch (error) {
    console.error('[PriceSync] syncPackagePrices failed:', (error as Error).message);
    throw error;
  }
}
