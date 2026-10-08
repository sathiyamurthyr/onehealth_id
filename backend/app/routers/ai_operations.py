"""
OH-ID Phase 6: Hospital Operations AI & Predictive Intelligence Router
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body, Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.services.ai.operations_intel import OperationsIntelligenceService
from backend.app.services.ai.predictive_models import PredictivePatientFlowService
from backend.app.services.ai.management_copilot import ManagementCopilotService
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    require_any_permission,
    get_current_user_context,
    validate_hospital_tenant_scope
)
from backend.app.core.logging import logger

router = APIRouter(prefix="/ai/operations", tags=["Hospital Operations AI & Predictions"])

class ManagementQueryRequest(BaseModel):
    query: str = Field(..., min_length=2)
    hospital_id: Optional[str] = None

class NoShowPredictRequest(BaseModel):
    appointment_id: str
    hospital_id: Optional[str] = None

@router.get("/insights")
async def get_operations_insights(
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.view", "billing.read", "system.manage"))
):
    """Performs automated root-cause analysis for OPD bottlenecks and queue delays."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return await OperationsIntelligenceService.analyze_queue_bottlenecks(
            hospital_id=target_hosp,
            user_context=user
        )
    except Exception as e:
        logger.error("Failed to generate operations insights: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load operations insights")

@router.post("/predict-no-show")
def predict_no_show(
    payload: NoShowPredictRequest = Body(...),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.view", "appointments.manage", "system.manage"))
):
    """Predicts appointment no-show probability and risk tier."""
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return PredictivePatientFlowService.predict_no_show_risk(
            appointment_id=payload.appointment_id,
            hospital_id=target_hosp,
            user_context=user
        )
    except Exception as e:
        logger.error("Failed to predict appointment no-show: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to predict no-show probability")

@router.get("/predict-wait-time")
def predict_wait_time(
    hospital_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    queue_position: int = Query(5, ge=1),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.view", "patient.read", "doctor.workspace", "system.manage"))
):
    """Estimates queue wait time in minutes with confidence intervals."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    try:
        return PredictivePatientFlowService.predict_queue_wait_time(
            hospital_id=target_hosp,
            doctor_id=doctor_id,
            department_id=department_id,
            queue_position=queue_position
        )
    except Exception as e:
        logger.error("Failed to predict queue wait time: %s", e)
        raise HTTPException(status_code=500, detail="Failed to predict wait time")

@router.get("/forecast-occupancy")
def forecast_bed_occupancy(
    hospital_id: Optional[str] = Query(None),
    horizon_hours: int = Query(24, ge=6, le=72),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.view", "billing.read", "system.manage"))
):
    """Forecasts hospital bed occupancy rates for ICU and General Wards."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return PredictivePatientFlowService.forecast_bed_occupancy(
            hospital_id=target_hosp,
            horizon_hours=horizon_hours
        )
    except Exception as e:
        logger.error("Failed to forecast bed occupancy: %s", e)
        raise HTTPException(status_code=500, detail="Failed to forecast bed occupancy")

@router.post("/management-copilot")
async def management_analytics_copilot(
    payload: ManagementQueryRequest = Body(...),
    user: Dict[str, Any] = Depends(require_any_permission("billing.read", "billing.manage", "system.manage"))
):
    """Natural-language to verified schema-safe hospital analytics copilot."""
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return await ManagementCopilotService.query_analytics_nl(
            hospital_id=target_hosp,
            query=payload.query,
            user_context=user
        )
    except Exception as e:
        logger.error("Failed to execute management copilot query: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process management inquiry")

@router.get("/predictions")
def get_recent_predictions(
    hospital_id: Optional[str] = Query(None),
    prediction_type: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.view", "billing.read", "system.manage"))
):
    """Returns stored predictive model outputs."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return sp_repository.get_ai_predictions(target_hosp, prediction_type)
    except Exception as e:
        logger.error("Failed to load predictions: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load predictions")
