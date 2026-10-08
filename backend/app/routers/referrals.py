from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import get_current_user_context, get_optional_user_context

router = APIRouter(prefix="/referrals", tags=["Clinical Referrals & Inter-Hospital Transfers"])

class CreateReferralRequest(BaseModel):
    patient_id: str
    destination_hospital_id: str
    specialty_needed: str
    reason_for_referral: str
    urgency: Optional[str] = "ROUTINE"  # ROUTINE, URGENT, EMERGENCY
    clinical_summary: Optional[str] = None
    destination_doctor_id: Optional[str] = None

class UpdateReferralStatusRequest(BaseModel):
    status: str  # ACCEPTED, IN_PROGRESS, COMPLETED, DECLINED
    notes: Optional[str] = None

@router.get("")
@router.get("/")
def list_referrals(
    hospital_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Lists incoming and outgoing clinical referrals."""
    h_id = hospital_id or (current_user.get("hospital_id") if current_user else None)
    return sp_repository.list_clinical_referrals(
        hospital_id=h_id,
        patient_id=patient_id,
        status=status,
        limit=limit,
        offset=offset
    )

@router.post("")
@router.post("/")
def create_referral(
    payload: CreateReferralRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Creates a digital medical referral with clinical summary."""
    referring_doctor_id = current_user.get("user_ref_id") or current_user.get("id") or "doc-general"
    referring_hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    try:
        referral = sp_repository.create_clinical_referral(
            patient_id=payload.patient_id,
            referring_hospital_id=referring_hospital_id,
            referring_doctor_id=referring_doctor_id,
            destination_hospital_id=payload.destination_hospital_id,
            specialty_needed=payload.specialty_needed,
            reason_for_referral=payload.reason_for_referral,
            urgency=payload.urgency or "ROUTINE",
            clinical_summary=payload.clinical_summary,
            destination_doctor_id=payload.destination_doctor_id
        )
        return {"status": "SUCCESS", "message": "Clinical referral created successfully", "data": referral}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{referral_id}/status")
def update_referral_status(
    referral_id: str,
    payload: UpdateReferralStatusRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Transitions referral status."""
    updated_by = current_user.get("user_ref_id") or current_user.get("id") or "usr-staff"
    try:
        updated = sp_repository.update_referral_status(
            referral_id=referral_id,
            status=payload.status,
            updated_by=updated_by,
            notes=payload.notes
        )
        return {"status": "SUCCESS", "message": "Referral status updated", "data": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
