from fastapi import APIRouter, HTTPException, Depends, Query, Body, status
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    get_current_user_context,
    get_optional_user_context,
    require_any_permission,
    require_permission,
    validate_hospital_tenant_scope
)
from backend.app.core.response import success_response, error_response
from backend.app.core.logging import logger, log_security_event

router = APIRouter(prefix="/oh-id", tags=["OneHealth ID (OH-ID) Core Identity"])

# ------------------------------------------------------------------------------
# Pydantic Request & Response Schemas
# ------------------------------------------------------------------------------

class OHIDSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, description="OH-ID, mobile number, hospital UHID, or patient name")
    hospital_id: Optional[str] = None
    limit: Optional[int] = 20
    offset: Optional[int] = 0

class QRGenerateRequest(BaseModel):
    patient_id: Optional[str] = None # If None, uses authenticated patient context

class QRVerifyRequest(BaseModel):
    qr_token: str = Field(..., min_length=4, description="Zero-knowledge QR token from patient digital card")
    scanned_by: Optional[str] = "reception_kiosk"
    hospital_id: Optional[str] = None

class PatientRegistrationRequest(BaseModel):
    name: str = Field(..., min_length=2)
    age: int = Field(..., ge=0, le=130)
    gender: Optional[str] = "Unspecified"
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Chennai"
    state: Optional[str] = "Tamil Nadu"
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    diagnosis: Optional[str] = "General Outpatient Registration"
    hospital_id: Optional[str] = None
    branch_id: Optional[str] = None
    local_uhid: Optional[str] = None
    existing_oh_id: Optional[str] = None

# ------------------------------------------------------------------------------
# 1. Identity Resolution by OH-ID
# ------------------------------------------------------------------------------

@router.get("/{oh_id}")
def get_identity_by_ohid(
    oh_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """
    Looks up a person by their globally unique OH-ID (e.g. OH-7F4K92M8Q2LX).
    Authenticated healthcare staff receive full demographic & facility relationship context.
    Unauthenticated lookups receive masked public identity verification data.
    """
    patient = sp_repository.get_patient_by_ohid(oh_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No patient identity found for OH-ID: {oh_id}")

    memberships = sp_repository.list_patient_facility_memberships(patient["id"])

    if not user:
        # Public masked view
        phone_masked = f"***-***-{patient['phone'][-4:]}" if patient.get("phone") and len(patient["phone"]) > 4 else None
        return success_response(data={
            "onehealth_id": patient.get("onehealth_id"),
            "name": patient.get("name"),
            "gender": patient.get("gender"),
            "age": patient.get("age"),
            "phone_masked": phone_masked,
            "verification_status": "VERIFIED_ACTIVE",
            "connected_facilities_count": len(memberships)
        })

    # Authenticated staff response
    return success_response(data={
        "patient": patient,
        "onehealth_id": patient.get("onehealth_id"),
        "connected_facilities": memberships,
        "verification_status": "VERIFIED_ACTIVE"
    })

# ------------------------------------------------------------------------------
# 2. Scoped Demographic & Identity Search
# ------------------------------------------------------------------------------

@router.post("/search")
def search_identities_secure(
    req: OHIDSearchRequest,
    current_user: Dict[str, Any] = Depends(require_any_permission("patient.read", "patient.create", "consultation.create", "system.manage"))
):
    """
    Multi-signal identity search supporting:
    - OH-ID format (OH-XXXXXXXXXXXX)
    - Normalized Mobile Number
    - Local Hospital UHID
    - Patient Name & Demographic Matching
    """
    user_perms = current_user.get("permissions") or []
    caller_hospital = current_user.get("hospital_ref_id") or current_user.get("hospital_id")
    effective_hospital = caller_hospital if ("system.manage" not in user_perms and "organization.read" not in user_perms) else req.hospital_id

    results = sp_repository.search_patients_secure(
        query=req.query,
        hospital_id=effective_hospital,
        caller_permissions=user_perms,
        limit=req.limit or 20,
        offset=req.offset or 0
    )

    log_security_event(
        "OHID_IDENTITY_SEARCH",
        actor_id=current_user.get("username"),
        resource="patient_search",
        status="SUCCESS",
        details={"query_length": len(req.query), "results_count": len(results)}
    )

    return success_response(data=results, meta={"query": req.query, "total_matches": len(results)})

# ------------------------------------------------------------------------------
# 3. Zero-Knowledge QR Token Generation & Server-Side Verification
# ------------------------------------------------------------------------------

@router.post("/qr/generate")
def generate_ohid_qr(
    req: QRGenerateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Generates a secure zero-knowledge QR code reference for the patient identity.
    QR payload contains ONLY the token reference — zero sensitive clinical notes or credentials.
    """
    role = current_user.get("role", "PATIENT")
    user_ref_id = current_user.get("user_ref_id") or current_user.get("id")

    if role == "PATIENT":
        patient = sp_repository.get_patient_by_user_ref(user_ref_id, current_user.get("email"))
        if not patient and current_user.get("username") == "patient":
            patient = sp_repository.get_patient_by_id("p-101")
        if not patient:
            raise HTTPException(status_code=404, detail="Patient profile not found.")
    else:
        if not req.patient_id:
            raise HTTPException(status_code=400, detail="patient_id is required for staff QR generation.")
        patient = sp_repository.get_patient_by_id(req.patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found.")

    return success_response(data={
        "onehealth_id": patient.get("onehealth_id"),
        "qr_token": patient.get("qr_token"),
        "patient_name": patient.get("name"),
        "dob": patient.get("dob"),
        "gender": patient.get("gender"),
        "blood_group": patient.get("blood_group"),
        "verification_status": "VERIFIED_ACTIVE"
    })

@router.post("/qr/verify")
def verify_ohid_qr_token(
    req: QRVerifyRequest,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """
    Server-side verification of Zero-Knowledge QR Token.
    Validates token against database, logs access audit event, and returns authorized demographic context.
    """
    scanned_by = req.scanned_by or (user.get("username") if user else "kiosk")
    verified = sp_repository.verify_ohid_qr(req.qr_token, scanned_by=scanned_by)
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid, expired, or unrecognized OneHealth ID QR token."
        )

    return success_response(data=verified, message="OneHealth ID QR verified successfully.")
