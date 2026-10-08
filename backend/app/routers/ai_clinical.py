"""
OH-ID Phase 6: Doctor Clinical AI Copilot & Longitudinal Summary Router
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body, Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.services.ai.clinical_copilot import ClinicalCopilotService
from backend.app.services.ai.lab_intelligence import LabIntelligenceService
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    require_any_permission,
    get_current_user_context,
    validate_hospital_tenant_scope
)
from backend.app.core.logging import logger

router = APIRouter(prefix="/ai/clinical", tags=["Doctor Clinical AI Copilot"])

class PatientBriefRequest(BaseModel):
    hospital_id: Optional[str] = None
    chief_complaint: Optional[str] = "Scheduled OPD Review"

class ConsultationAssistRequest(BaseModel):
    patient_id: str
    hospital_id: Optional[str] = None
    raw_notes: str = Field(..., min_length=2)
    vitals: Optional[Dict[str, Any]] = None

@router.post("/patient-brief/{patient_id}")
async def generate_patient_brief(
    patient_id: str = Path(...),
    payload: PatientBriefRequest = Body(...),
    user: Dict[str, Any] = Depends(require_any_permission("doctor.workspace", "clinical.manage", "clinical.consultation", "consultation.create", "system.manage"))
):
    """Generates a 30-second pre-consultation patient briefing citing past encounters, allergies, and medications."""
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return await ClinicalCopilotService.generate_patient_brief(
            patient_id=patient_id,
            hospital_id=target_hosp,
            user_context=user,
            chief_complaint=payload.chief_complaint
        )
    except Exception as e:
        logger.error("Failed to generate clinical brief for %s: %s", patient_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate clinical brief")

@router.post("/consultation-assist")
async def assist_consultation_draft(
    payload: ConsultationAssistRequest = Body(...),
    user: Dict[str, Any] = Depends(require_any_permission("doctor.workspace", "clinical.manage", "clinical.consultation", "consultation.create", "system.manage"))
):
    """Ambient consultation note drafter structuring intake into SOAP format with mandatory clinician sign-off."""
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return await ClinicalCopilotService.draft_consultation_notes(
            raw_notes=payload.raw_notes,
            patient_id=payload.patient_id,
            hospital_id=target_hosp,
            user_context=user,
            vitals=payload.vitals
        )
    except Exception as e:
        logger.error("Failed to draft clinical note: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to draft clinical note")

@router.get("/longitudinal-summary/{patient_id}")
async def get_longitudinal_summary(
    patient_id: str = Path(...),
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("doctor.workspace", "clinical.manage", "patient.read", "system.manage"))
):
    """Synthesizes cross-hospital timeline events into a longitudinal health trajectory."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    try:
        return await ClinicalCopilotService.generate_longitudinal_summary(
            patient_id=patient_id,
            hospital_id=target_hosp,
            user_context=user
        )
    except Exception as e:
        logger.error("Failed to generate longitudinal summary: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate longitudinal summary")

@router.get("/lab-trends/{patient_id}")
async def get_lab_trends(
    patient_id: str = Path(...),
    analyte: str = Query("Hemoglobin", min_length=2),
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("doctor.workspace", "clinical.manage", "patient.read", "system.manage"))
):
    """Analyzes historical laboratory trends for a specific analyte (e.g. Hb, Creatinine, HbA1c, Platelets)."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    try:
        return await LabIntelligenceService.analyze_analyte_trends(
            patient_id=patient_id,
            analyte_name=analyte,
            hospital_id=target_hosp,
            user_context=user
        )
    except Exception as e:
        logger.error("Failed to analyze lab trends: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to analyze lab trends")

@router.get("/insights/{patient_id}")
def get_stored_insights(
    patient_id: str = Path(...),
    user: Dict[str, Any] = Depends(require_any_permission("doctor.workspace", "clinical.manage", "patient.read", "system.manage"))
):
    """Returns past stored AI insights and briefs generated for a patient."""
    try:
        return sp_repository.get_ai_insights_for_patient(patient_id)
    except Exception as e:
        logger.error("Failed to fetch stored AI insights: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load insights")
