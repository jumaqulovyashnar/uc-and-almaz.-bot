from fastapi import APIRouter, HTTPException, status
from typing import Optional, Dict, Any, List
from app.services import package as package_service

router = APIRouter()

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
