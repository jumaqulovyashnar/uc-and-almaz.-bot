import logging
import httpx
from typing import Dict, Any
from app.config.database import query

async def get_usd_exchange_rate() -> float:
    try:
        logging.info("[PriceSync] Fetching exchange rates from CBU API...")
        async with httpx.AsyncClient() as client:
            response = await client.get("https://cbu.uz/uz/arkhiv-kursov-valyut/json/", timeout=15.0)
            if response.status_code != 200:
                raise RuntimeError(f"CBU API returned status code: {response.status_code}")
            
            data = response.json()
            
        usd_info = next((curr for curr in data if curr.get("Ccy") == "USD"), None)
        if not usd_info or not usd_info.get("Rate"):
            raise ValueError("USD exchange rate not found in CBU response")
            
        rate = float(usd_info["Rate"])
        if rate <= 0:
            raise ValueError(f"Invalid USD exchange rate received: {usd_info.get('Rate')}")
            
        logging.info(f"[PriceSync] Current USD Exchange Rate: 1 USD = {rate} UZS")
        return rate
    except Exception as e:
        logging.error(f"[PriceSync] get_usd_exchange_rate error: {e}")
        raise e

def round_to_nearest_100(value: float) -> float:
    return round(value / 100.0) * 100.0

async def sync_package_prices() -> Dict[str, Any]:
    try:
        rate = await get_usd_exchange_rate()
        
        # Fetch all packages with defined USD price
        packages = await query(
            "SELECT id, game, name, usd_price, markup_percent FROM game_packages WHERE usd_price > 0"
        )
        logging.info(f"[PriceSync] Found {len(packages)} packages to synchronize")
        
        updated_count = 0
        for pkg in packages:
            try:
                usd_price = float(pkg["usd_price"])
                markup_percent = float(pkg["markup_percent"])
                
                if usd_price <= 0:
                    continue
                    
                # Base price = raw conversion
                base_price = usd_price * rate
                # Sell price = base price + profit markup
                raw_sell_price = base_price * (1 + markup_percent / 100.0)
                
                rounded_base = round_to_nearest_100(base_price)
                rounded_sell = round_to_nearest_100(raw_sell_price)
                
                await query(
                    """UPDATE game_packages 
                       SET base_price = $1, sell_price = $2, updated_at = NOW() 
                       WHERE id = $3""",
                    rounded_base, rounded_sell, pkg["id"]
                )
                updated_count += 1
            except (ValueError, TypeError) as parse_err:
                logging.warning(f"[PriceSync] Skipping package {pkg.get('name')}: {parse_err}")
                
        logging.info(f"[PriceSync] Successfully updated {updated_count} package prices in database.")
        return {
            "success": True,
            "updatedCount": updated_count,
            "rate": rate
        }
    except Exception as e:
        logging.error(f"[PriceSync] sync_package_prices failed: {e}")
        raise e
