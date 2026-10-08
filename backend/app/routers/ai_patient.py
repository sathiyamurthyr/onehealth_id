"""
OH-ID Phase 6: Patient AI Health Journey Assistant Router
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body, Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.services.ai.patient_assistant import PatientAssistantService
from backend.app.services.ai.lab_intelligence import LabIntelligenceService
from backend.app.core.rbac import (
    require_any_permission,
    get_current_user_context
)
from backend.app.core.logging import logger

router = APIRouter(prefix="/ai/patient", tags=["Patient AI Health Journey Assistant"])

class PatientQueryRequest(BaseModel):
    query: str = Field(..., min_length=2)
    patient_id: Optional[str] = None

class PrescriptionExplainRequest(BaseModel):
    prescription_id: str
    patient_id: Optional[str] = None

@router.post("/explain-timeline")
async def explain_health_timeline(
    payload: PatientQueryRequest = Body(...),
    user: Dict[str, Any] = Depends(require_any_permission("patient.read", "doctor.workspace", "system.manage"))
):
    """Conversational assistant explaining the patient's official visits, diagnoses, and treatments."""
    patient_id = payload.patient_id or user.get("patient_id") or user.get("user_id")
    try:
        return await PatientAssistantService.explain_health_journey(
            patient_id=patient_id,
            query=payload.query,
            user_context=user
        )
    except Exception as e:
        logger.error("Failed to explain patient health journey: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to explain timeline")

@router.post("/explain-prescription")
async def explain_prescription(
    payload: PrescriptionExplainRequest = Body(...),
    user: Dict[str, Any] = Depends(require_any_permission("patient.read", "doctor.workspace", "system.manage"))
):
    """Explains medication instructions, food interactions, and precautions."""
    patient_id = payload.patient_id or user.get("patient_id") or user.get("user_id")
    try:
        return await PatientAssistantService.explain_prescription(
            prescription_id=payload.prescription_id,
            patient_id=patient_id,
            user_context=user
        )
    except Exception as e:
        logger.error("Failed to explain prescription: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to explain prescription")

@router.get("/explain-report/{report_id}")
async def explain_report(
    report_id: str = Path(...),
    user: Dict[str, Any] = Depends(require_any_permission("patient.read", "doctor.workspace", "system.manage"))
):
    """Explains a diagnostic laboratory report in plain, patient-friendly language."""
    hospital_id = user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    try:
        return await LabIntelligenceService.explain_lab_report(
            report_id=report_id,
            hospital_id=hospital_id,
            user_context=user
        )
    except Exception as e:
        logger.error("Failed to explain report %s: %s", report_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to explain diagnostic report")
