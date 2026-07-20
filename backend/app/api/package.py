from fastapi import APIRouter, HTTPException, status
from typing import Optional, Dict, Any, List
import httpx
from app.services import package as package_service

router = APIRouter()

@router.get("/games")
async def get_games():
    url = "https://69544e6345d5c.xvest5.ru/DonatlarimBot/api.php?action=get_games"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=15.0)
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=502, detail="Failed to fetch games from provider")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/products/{game_key}")
async def get_products(game_key: str):
    url = f"https://69544e6345d5c.xvest5.ru/DonatlarimBot/api.php?action=get_products&game_key={game_key}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=15.0)
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=502, detail="Failed to fetch products from provider")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{game}")
@router.get("/{game}/{category}")
async def get_packages(game: str, category: Optional[str] = None):
    if game not in ["pubg", "freefire"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Invalid game. Must be "pubg" or "freefire"'
        )
        
    packages = await package_service.get_by_game(game, category)
    
    # Group by category if no specific category is requested
    if not category:
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for pkg in packages:
            cat = pkg["category"]
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(pkg)
            
        return {
            "success": True,
            "data": {
                "game": game,
                "packages": grouped
            }
        }
        
    return {
        "success": True,
        "data": {
            "game": game,
            "category": category,
            "packages": packages
        }
    }
