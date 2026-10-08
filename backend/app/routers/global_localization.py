"""
OH-ID Phase 8 Router: Multi-Language Localization Dictionaries
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/global/localization", tags=["Global - Multi-Language Localization"])
repo = SPViewsRepository()

class LocalizationEntryPayload(BaseModel):
    language_code: str = Field(..., max_length=10, description="en, ta, hi, ar, fr, es, de")
    resource_key: str
    resource_value: str
    category: str = "COMMON"

@router.get("/dictionary/{language_code}", response_model=Dict[str, str])
def get_localization_dictionary(
    language_code: str,
    category: Optional[str] = Query(None)
):
    """Retrieves key-value localization dictionary for the specified language and category."""
    return repo.get_localization_dictionary(language_code=language_code, category=category)

@router.post("/entries/upsert", response_model=Dict[str, Any])
def upsert_localization_entry(payload: LocalizationEntryPayload):
    """Creates or updates a localized text translation string in the central global dictionary."""
    return repo.upsert_localization_entry(
        language_code=payload.language_code,
        resource_key=payload.resource_key,
        resource_value=payload.resource_value,
        category=payload.category
    )
