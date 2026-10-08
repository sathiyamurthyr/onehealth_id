"""
OH-ID Consent-Driven Health Record Sharing & Patient Privacy REST Router
========================================================================
Implements patient data-sharing authorization, granular consent approval,
revocation, access audit logging, and authorized cross-hospital record fetch.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import logging
from backend.app.core.rbac import get_current_user_context
from backend.app.repositories.sp_views_repository import sp_repository

logger = logging.getLogger("ohid.routers.data_sharing")
router = APIRouter(tags=["Data Sharing & Consent Governance"])

repo = sp_repository

class ConsentApproveRequest(BaseModel):
    allowed_categories: Optional[List[str]] = None # ["OPConsultation", "Prescription", "DiagnosticReport", "DischargeSummary"]
    expires_hours: int = 72

class ConsentRevokeRequest(BaseModel):
    reason: str = "Revoked by patient"

class HospitalConsentRequest(BaseModel):
    patient_id: str
    purpose_code: str = "CARETREAT" # CARETREAT, REFERRAL, SECOND_OPINION
    purpose_text: str = "Care and Treatment at Hospital Facility"
    data_categories: Optional[List[str]] = None
    expires_hours: int = 72

class CrossHospitalFetchRequest(BaseModel):
    patient_id: str
    purpose: str = "TREATMENT"

class BreakGlassRequest(BaseModel):
    patient_id: str
    break_glass_reason: str # Mandatory emergency justification

# =============================================================================
# 1. PATIENT-FACING ENDPOINTS (/api/v1/me/...)
# =============================================================================

@router.get("/me/data-sharing", response_model=List[Dict[str, Any]])
def get_patient_data_shares(
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns all active, pending, and past consent requests for the logged-in patient."""
    patient_id = current_user.get("patient_id") or current_user.get("user_id")
    return repo.list_patient_data_shares(patient_id=patient_id)

@router.post("/me/data-sharing/{id}/approve", response_model=Dict[str, Any])
def approve_data_sharing_consent(
    id: str,
    payload: ConsentApproveRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Patient grants consent to share specific scoped records with requesting provider."""
    patient_id = current_user.get("patient_id") or current_user.get("user_id")
    try:
        return repo.grant_data_sharing_consent(
            consent_id=id,
            patient_id=patient_id,
            allowed_categories=payload.allowed_categories,
            expires_hours=payload.expires_hours
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/me/data-sharing/{id}/deny", response_model=Dict[str, Any])
def deny_data_sharing_consent(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Patient explicitly denies a consent request."""
    patient_id = current_user.get("patient_id") or current_user.get("user_id")
    success = repo.revoke_data_sharing_consent(
        consent_id=id,
        patient_id=patient_id,
        revocation_reason="Patient explicitly denied request."
    )
    if not success:
        raise HTTPException(status_code=404, detail="Consent request not found.")
    return {"consent_id": id, "status": "DENIED", "message": "Consent request denied."}

@router.post("/me/data-sharing/{id}/revoke", response_model=Dict[str, Any])
def revoke_data_sharing_consent(
    id: str,
    payload: ConsentRevokeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Patient revokes an active data sharing consent."""
    patient_id = current_user.get("patient_id") or current_user.get("user_id")
    success = repo.revoke_data_sharing_consent(
        consent_id=id,
        patient_id=patient_id,
        revocation_reason=payload.reason
    )
    if not success:
        raise HTTPException(status_code=404, detail="Consent not found.")
    return {"consent_id": id, "status": "REVOKED", "message": "Data sharing access revoked immediately."}

@router.get("/me/access-history", response_model=List[Dict[str, Any]])
def get_patient_access_history(
    limit: int = 50,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Health Data Access History: Shows who accessed patient records, purpose, and timestamp."""
    patient_id = current_user.get("patient_id") or current_user.get("user_id")
    return repo.list_patient_access_history(patient_id=patient_id, limit=limit, offset=offset)

@router.get("/me/external-records", response_model=List[Dict[str, Any]])
def get_patient_external_records(
    record_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns all external clinical records imported from connected network providers."""
    patient_id = current_user.get("patient_id") or current_user.get("user_id")
    return repo.list_external_health_records(patient_id=patient_id, record_type=record_type, limit=limit, offset=offset)

# =============================================================================
# 2. HOSPITAL-FACING ENDPOINTS (/api/v1/hospital/data-sharing/...)
# =============================================================================

@router.post("/hospital/data-sharing/request", response_model=Dict[str, Any])
def create_hospital_sharing_request(
    payload: HospitalConsentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Hospital initiates a digital consent request to access external patient records."""
    hospital_id = current_user.get("hospital_id")
    doctor_id = current_user.get("doctor_id") or current_user.get("user_id")

    if not hospital_id:
        raise HTTPException(status_code=400, detail="Missing hospital tenancy header.")

    return repo.create_data_sharing_request(
        patient_id=payload.patient_id,
        requesting_hospital_id=hospital_id,
        requesting_doctor_id=doctor_id,
        purpose_code=payload.purpose_code,
        purpose_text=payload.purpose_text,
        data_categories=payload.data_categories,
        expires_hours=payload.expires_hours
    )

@router.post("/hospital/data-sharing/fetch", response_model=Dict[str, Any])
def fetch_cross_hospital_records(
    payload: CrossHospitalFetchRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Fetches scoped clinical records for a patient across all participating providers.
    Enforces active patient consent before granting access.
    """
    hospital_id = current_user.get("hospital_id")
    doctor_id = current_user.get("doctor_id") or current_user.get("user_id")

    if not hospital_id:
        raise HTTPException(status_code=400, detail="Missing hospital tenancy.")

    try:
        return repo.cross_hospital_fetch_records(
            requesting_hospital_id=hospital_id,
            requesting_doctor_id=doctor_id,
            patient_id=payload.patient_id,
            purpose=payload.purpose,
            is_break_glass=False
        )
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/hospital/data-sharing/break-glass", response_model=Dict[str, Any])
def execute_emergency_break_glass(
    payload: BreakGlassRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Emergency Break-Glass Protocol.
    Grants emergency clinical access when patient is unconscious or in life-threatening condition.
    Mandatory reason is audited into immutable compliance log.
    """
    hospital_id = current_user.get("hospital_id")
    doctor_id = current_user.get("doctor_id") or current_user.get("user_id")

    if not hospital_id:
        raise HTTPException(status_code=400, detail="Missing hospital tenancy.")

    try:
        return repo.cross_hospital_fetch_records(
            requesting_hospital_id=hospital_id,
            requesting_doctor_id=doctor_id,
            patient_id=payload.patient_id,
            purpose="EMERGENCY",
            is_break_glass=True,
            break_glass_reason=payload.break_glass_reason
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
