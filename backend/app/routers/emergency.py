from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import get_current_user_context, get_optional_user_context

router = APIRouter(prefix="/emergency", tags=["Emergency Department Rapid Intake, Triage & Temporary ID Reconciliation"])

class EmergencyIntakeRequest(BaseModel):
    arrival_mode: str  # AMBULANCE, WALK_IN, POLICE, AIR_AMBULANCE, OTHER
    presenting_complaint: str
    patient_id: Optional[str] = None
    is_unknown_identity: bool = False
    temporary_identifier: Optional[str] = None

class EmergencyTriageRequest(BaseModel):
    triage_category: str  # RESUSCITATION, EMERGENT, URGENT, LESS_URGENT, NON_URGENT
    triage_priority: int  # 1 to 5
    vital_signs: Optional[Dict[str, Any]] = None
    pain_score: Optional[int] = None
    observations: Optional[str] = None

class EmergencyDispositionRequest(BaseModel):
    disposition: str  # ADMITTED_IPD, DISCHARGED, TRANSFERRED, EXPIRED, LEFT_AGAINST_MEDICAL_ADVICE
    attending_doctor_id: Optional[str] = None
    disposition_notes: Optional[str] = None

class EmergencyReconcileRequest(BaseModel):
    verified_patient_id: str

@router.get("/encounters")
def list_emergency_encounters(
    hospital_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Lists active emergency cases and triage tracking board."""
    h_id = hospital_id or (current_user.get("hospital_id") if current_user else "hosp-kedar")
    return sp_repository.list_emergency_encounters(
        hospital_id=h_id,
        status=status,
        limit=limit,
        offset=offset
    )

@router.post("/intake")
def create_emergency_intake(
    payload: EmergencyIntakeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Rapid intake registration in emergency room.
    Supports unidentified patients without creating permanent duplicate OH-IDs.
    """
    staff_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-emergency"
    hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    intake = sp_repository.create_emergency_intake(
        hospital_id=hospital_id,
        arrival_mode=payload.arrival_mode,
        presenting_complaint=payload.presenting_complaint,
        registered_by=staff_id,
        patient_id=payload.patient_id,
        is_unknown_identity=payload.is_unknown_identity,
        temporary_identifier=payload.temporary_identifier
    )
    return {"status": "SUCCESS", "message": "Emergency intake registered", "data": intake}

@router.post("/encounters/{encounter_id}/triage")
def update_emergency_triage(
    encounter_id: str,
    payload: EmergencyTriageRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Records clinical triage score and baseline vitals."""
    nurse_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-triagenurse"

    try:
        updated = sp_repository.update_emergency_triage(
            encounter_id=encounter_id,
            triage_nurse_id=nurse_id,
            triage_category=payload.triage_category,
            triage_priority=payload.triage_priority,
            vital_signs=payload.vital_signs,
            pain_score=payload.pain_score,
            observations=payload.observations
        )
        return {"status": "SUCCESS", "message": "Triage evaluation recorded", "data": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/encounters/{encounter_id}/disposition")
def update_emergency_disposition(
    encounter_id: str,
    payload: EmergencyDispositionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Finalizes emergency room outcome and transition of care."""
    doctor_id = payload.attending_doctor_id or current_user.get("user_ref_id") or current_user.get("id")

    try:
        updated = sp_repository.update_emergency_disposition(
            encounter_id=encounter_id,
            disposition=payload.disposition,
            attending_doctor_id=doctor_id,
            disposition_notes=payload.disposition_notes
        )
        return {"status": "SUCCESS", "message": "Emergency disposition updated", "data": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/encounters/{encounter_id}/reconcile")
def reconcile_emergency_identity(
    encounter_id: str,
    payload: EmergencyReconcileRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Reconciles unknown emergency patient with verified permanent OH-ID profile."""
    verified_by = current_user.get("user_ref_id") or current_user.get("id") or "usr-staff"

    try:
        updated = sp_repository.reconcile_emergency_identity(
            encounter_id=encounter_id,
            verified_patient_id=payload.verified_patient_id,
            verified_by=verified_by
        )
        return {"status": "SUCCESS", "message": "Emergency encounter identity reconciled successfully", "data": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
