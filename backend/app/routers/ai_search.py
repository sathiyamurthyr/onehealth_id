"""
OH-ID Phase 6: Semantic & Filtered Search Router
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from backend.app.services.ai.semantic_search import SemanticSearchService
from backend.app.core.rbac import (
    require_any_permission,
    get_current_user_context,
    validate_hospital_tenant_scope
)
from backend.app.core.logging import logger

router = APIRouter(prefix="/ai/search", tags=["Semantic & Consent-Filtered Search"])

@router.get("/semantic")
def search_semantic(
    q: str = Query(..., min_length=2),
    hospital_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    user: Dict[str, Any] = Depends(require_any_permission("doctor.workspace", "hospital.view", "patient.read", "system.manage"))
):
    """Semantic and clinical concept search across authorized patients and records."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return SemanticSearchService.search_records(
            query=q,
            hospital_id=target_hosp,
            user_context=user,
            limit=limit
        )
    except Exception as e:
        logger.error("Failed to execute semantic search: %s", e)
        raise HTTPException(status_code=500, detail="Failed to execute semantic search")
