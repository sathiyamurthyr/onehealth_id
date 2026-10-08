from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import get_current_user_context, get_optional_user_context

router = APIRouter(prefix="/discharges", tags=["Inpatient Discharge Summaries & Bed Release"])

class DischargeMedicationPayload(BaseModel):
    medicine_name: str
    dose: str
    frequency: str
    duration: str
    instructions: Optional[str] = None

class CreateOrUpdateDischargeRequest(BaseModel):
    admission_id: str
    patient_id: str
    attending_doctor_id: Optional[str] = None
    diagnosis: str
    discharge_type: Optional[str] = "ROUTINE"  # ROUTINE, TRANSFER, REFERRAL, LAMA, DEATH
    condition_at_discharge: Optional[str] = "STABLE"  # RECOVERED, IMPROVED, STABLE, GUARDED, CRITICAL
    clinical_summary: Optional[str] = None
    procedures_performed: Optional[List[str]] = None
    discharge_medications: Optional[List[DischargeMedicationPayload]] = None
    follow_up_instructions: Optional[str] = None
    status: Optional[str] = "DRAFT"

@router.get("/{admission_id}")
def get_discharge_summary(
    admission_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Retrieves the discharge summary for an inpatient admission."""
    summary = sp_repository.get_inpatient_discharge_summary(admission_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Discharge summary not found for this admission")
    return summary

@router.post("")
@router.post("/")
def create_or_update_discharge_summary(
    payload: CreateOrUpdateDischargeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Creates or updates a structured discharge summary."""
    doctor_id = payload.attending_doctor_id or current_user.get("user_ref_id") or current_user.get("id") or "doc-general"
    hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    meds_json = [m.model_dump() for m in payload.discharge_medications] if payload.discharge_medications else None

    try:
        discharge = sp_repository.create_or_update_discharge_summary(
            admission_id=payload.admission_id,
            patient_id=payload.patient_id,
            hospital_id=hospital_id,
            attending_doctor_id=doctor_id,
            diagnosis=payload.diagnosis,
            discharge_type=payload.discharge_type or "ROUTINE",
            condition_at_discharge=payload.condition_at_discharge or "STABLE",
            clinical_summary=payload.clinical_summary,
            procedures_performed=payload.procedures_performed,
            discharge_medications=meds_json,
            follow_up_instructions=payload.follow_up_instructions,
            status=payload.status or "DRAFT"
        )
        return {"status": "SUCCESS", "message": "Discharge summary saved", "data": discharge}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{discharge_id}/finalize")
def finalize_discharge_summary(
    discharge_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Finalizes inpatient discharge:
    - Sets discharge summary to immutable status FINALIZED
    - Updates IPD admission record to DISCHARGED with timestamp
    - Concurrency-safe automatic release of allocated bed
    - Records event to Patient Health Timeline
    """
    finalized_by = current_user.get("user_ref_id") or current_user.get("id") or "doc-general"
    try:
        finalized = sp_repository.finalize_discharge(
            discharge_id=discharge_id,
            finalized_by=finalized_by
        )
        return {"status": "SUCCESS", "message": "Discharge finalized, patient discharged and bed released", "data": finalized}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
