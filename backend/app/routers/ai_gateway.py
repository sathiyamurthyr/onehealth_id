"""
OH-ID Phase 6: AI Gateway, Models & Governance Telemetry Router
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Dict, Any, Optional
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    require_any_permission,
    get_current_user_context,
    validate_hospital_tenant_scope
)
from backend.app.core.logging import logger

router = APIRouter(prefix="/ai", tags=["AI Foundation & Gateway Governance"])

@router.get("/providers")
def get_providers(
    user: Dict[str, Any] = Depends(require_any_permission("hospital.view", "system.manage", "doctor.workspace"))
):
    """Returns active and configured AI providers (Gemini, OpenAI, Claude, Ollama, Mock)."""
    try:
        return sp_repository.get_ai_providers()
    except Exception as e:
        logger.error("Failed to load AI providers: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load AI providers")

@router.get("/models")
def get_models(
    user: Dict[str, Any] = Depends(require_any_permission("hospital.view", "system.manage", "doctor.workspace"))
):
    """Returns registered AI models with token costs, capabilities, and context limits."""
    try:
        return sp_repository.get_ai_models()
    except Exception as e:
        logger.error("Failed to load AI models: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load AI models")

@router.get("/prompts")
def get_prompts(
    user: Dict[str, Any] = Depends(require_any_permission("hospital.view", "system.manage", "doctor.workspace"))
):
    """Returns versioned system prompts and configuration templates."""
    try:
        return sp_repository.get_ai_prompts()
    except Exception as e:
        logger.error("Failed to load AI prompts: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load AI prompts")

@router.get("/telemetry")
def get_governance_telemetry(
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("system.manage", "hospital.manage"))
):
    """Returns real-time AI governance telemetry: token usage, latency, safety flags, and estimated costs."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id")
    try:
        return sp_repository.get_ai_governance_telemetry(target_hosp)
    except Exception as e:
        logger.error("Failed to load AI telemetry: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load AI telemetry")
