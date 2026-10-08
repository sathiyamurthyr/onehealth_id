"""
OH-ID Phase 7 Router: Network Marketplace & Provider Directory Search
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/network/marketplace", tags=["Network - Marketplace & Directory"])
repo = SPViewsRepository()

@router.get("/search", response_model=List[Dict[str, Any]])
def search_marketplace(
    q: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    max_price: Optional[float] = Query(None)
):
    """Searches verified healthcare services and consultations across the participating network."""
    return repo.search_network_marketplace(
        query=q,
        specialty=specialty,
        category=category,
        city=city,
        max_price=max_price
    )

@router.get("/providers", response_model=List[Dict[str, Any]])
def get_directory_providers(
    provider_type: Optional[str] = Query(None),
    city: Optional[str] = Query(None)
):
    """Retrieves participating accredited providers in the network directory."""
    return repo.list_network_providers(provider_type=provider_type, stage="ACTIVE", city=city)
