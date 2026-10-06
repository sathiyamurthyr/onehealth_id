"""
OH-ID India Healthcare Compliance & Governance Router
====================================================
Implements:
1. Statutory Hospital Licenses (Tamil Nadu CEA, Pharmacy, AERB, Fire Safety, TNPCB, NABH/NABL)
2. ABDM National Health Stack Integration (HFR Facility Registry, HPR Professional Registry, M1-M3 Milestones)
3. Hospital-Level Consent Governance & Cross-Hospital Record Sharing Requests
4. DPDP Act Privacy Governance & Patient Grievance Redressal
5. Regulatory Audit Reports & Inspection Export for Tamil Nadu DMRHS / NHA
"""

from fastapi import APIRouter, Query, HTTPException, Depends, Body, Path
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    get_current_user_context,
    validate_hospital_tenant_scope,
)

router = APIRouter(prefix="/hospital/compliance", tags=["Compliance, ABDM & Regulatory Governance"])

def _check_compliance_manage_permission(user: Dict[str, Any]):
    perms = user.get("permissions") or []
    role = user.get("role")
    if "system.manage" in perms or "hospital.update" in perms or "compliance.manage" in perms or role in ("SUPER_ADMIN", "HOSPITAL_ADMIN"):
        return True
    raise HTTPException(status_code=403, detail="Forbidden: User lacks required compliance management permissions.")

def _check_doctor_or_admin_permission(user: Dict[str, Any]):
    perms = user.get("permissions") or []
    role = user.get("role")
    if "system.manage" in perms or "hospital.update" in perms or "consultation.create" in perms or role in ("SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"):
        return True
    raise HTTPException(status_code=403, detail="Forbidden: User lacks permission to request patient consent.")

def _resolve_target_hospital(user: Dict[str, Any], requested_hosp: Optional[str] = None) -> str:
    target = requested_hosp or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target)
    return target

# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================

class StatutoryLicenseUpsertRequest(BaseModel):
    id: Optional[str] = None
    hospital_id: Optional[str] = "hosp-kedar"
    license_category: str = Field(..., max_length=64) # CEA_REGISTRATION, PHARMACY_20B_21B, FIRE_SAFETY_NOC, etc.
    title: str = Field(..., min_length=3, max_length=255)
    license_number: str = Field(..., min_length=2, max_length=128)
    issuing_authority: str = Field(..., min_length=3, max_length=255)
    state_code: Optional[str] = "TN"
    facility_branch_id: Optional[str] = "br-kedar-01"
    issue_date: str = Field(...) # YYYY-MM-DD
    expiry_date: str = Field(...) # YYYY-MM-DD
    status: Optional[str] = "VALID" # VALID, EXPIRING_SOON, EXPIRED, UNDER_RENEWAL
    verification_status: Optional[str] = "VERIFIED"
    verified_by: Optional[str] = "State District Registrar (Kanchipuram)"
    document_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}

class LicenseVerifyRequest(BaseModel):
    verifier_name: str = Field("State District Registrar (Kanchipuram)", max_length=255)

class AbdmHfrUpdateRequest(BaseModel):
    hfr_id: str = Field(..., min_length=5, max_length=64)
    facility_name: Optional[str] = "Kedar Health Multi-Speciality Hospital"
    facility_type: Optional[str] = "HOSPITAL_SECONDARY"
    ownership_type: Optional[str] = "PRIVATE_COMMERCIAL"
    abdm_m1_status: Optional[str] = "ACTIVE"
    abdm_m2_status: Optional[str] = "ACTIVE"
    abdm_m3_status: Optional[str] = "ACTIVE"
    bridge_url: Optional[str] = "https://abdm-bridge.kedarhealth.com/v0.5"
    client_id: Optional[str] = "SBX_KEDAR_HFR_008892"

class DoctorHprSyncRequest(BaseModel):
    hpr_id: Optional[str] = None
    doctor_name: Optional[str] = "Dr. Senthil Nathan"
    council_registration_number: str = Field(..., max_length=128)
    registration_council: str = Field("Tamil Nadu Medical Council", max_length=255)
    is_allied_health: bool = False
    ncahp_enrolment_id: Optional[str] = None
    ncahp_status_label: Optional[str] = "REGISTRATION_EXEMPT_OR_NMC_DOCTOR"
    hpr_verification_status: Optional[str] = "VERIFIED"

class ConsentRequestPayload(BaseModel):
    patient_id: str = Field(..., max_length=64)
    requester_hospital_id: Optional[str] = "hosp-kedar"
    requester_doctor_id: Optional[str] = "doc-k-01"
    requester_name: Optional[str] = "Dr. Senthil Nathan"
    provider_hospital_id: Optional[str] = "hosp-001"
    provider_hospital_name: Optional[str] = "Apollo City Hospital - Chennai Central"
    purpose_code: Optional[str] = "CARETREAT"
    purpose_text: Optional[str] = "Direct patient consultation and cross-hospital medical history review"
    data_categories: Optional[List[str]] = ["OPConsultation", "Prescription", "DiagnosticReport", "DischargeSummary"]
    validity_days: Optional[int] = 180

class PrivacyGrievanceResolveRequest(BaseModel):
    grievance_officer_name: Optional[str] = "Kedar Admin (Data Protection Officer)"
    grievance_officer_id: Optional[str] = None
    resolution_notes: str = Field(..., min_length=10)
    status: Optional[str] = "RESOLVED"

# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/overview")
def get_compliance_overview(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns statutory compliance scorecard, license health, and ABDM readiness."""
    target_hosp = _resolve_target_hospital(current_user, hospital_id)
    return sp_repository.get_hospital_compliance_overview(target_hosp)

@router.get("/licenses")
def list_statutory_licenses(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    category: Optional[str] = Query("ALL"),
    status: Optional[str] = Query("ALL"),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """List registered statutory licenses (TN-CEA, AERB, Pharmacy, Fire Safety, etc.)."""
    target_hosp = _resolve_target_hospital(current_user, hospital_id)
    return sp_repository.list_statutory_licenses(target_hosp, category, status)

@router.post("/licenses")
def upsert_statutory_license(
    req: StatutoryLicenseUpsertRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Add or update statutory license or accreditation record."""
    _check_compliance_manage_permission(current_user)
    target_hosp = _resolve_target_hospital(current_user, req.hospital_id or "hosp-kedar")
    payload = req.model_dump()
    payload["hospital_id"] = target_hosp
    return sp_repository.upsert_statutory_license(payload, actor_id=current_user.get("username", "admin"))

@router.post("/licenses/{license_id}/verify")
def verify_statutory_license(
    license_id: str = Path(...),
    req: LicenseVerifyRequest = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Officially record verification of statutory certificate."""
    _check_compliance_manage_permission(current_user)
    try:
        return sp_repository.verify_statutory_license(
            license_id,
            req.verifier_name,
            actor_id=current_user.get("username", "admin")
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/abdm")
def get_abdm_facility_config(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Get ABDM HFR Facility Registry configuration and milestone status."""
    target_hosp = _resolve_target_hospital(current_user, hospital_id)
    return sp_repository.get_abdm_facility_config(target_hosp)

@router.post("/abdm/hfr")
def update_abdm_hfr(
    req: AbdmHfrUpdateRequest,
    hospital_id: Optional[str] = Query("hosp-kedar"),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Update ABDM HFR Facility ID and configure bridge integration."""
    _check_compliance_manage_permission(current_user)
    target_hosp = _resolve_target_hospital(current_user, hospital_id)
    return sp_repository.update_abdm_facility_config(target_hosp, req.model_dump(), actor_id=current_user.get("username", "admin"))

@router.get("/abdm/practitioners")
def list_doctor_hpr_mappings(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """List doctor HPR registry verification statuses, Council Reg Numbers, and NCAHP distinctions."""
    target_hosp = _resolve_target_hospital(current_user, hospital_id)
    return sp_repository.list_doctor_hpr_mappings(target_hosp)

@router.post("/abdm/practitioners/{doctor_id}/sync")
def sync_doctor_hpr_mapping(
    doctor_id: str = Path(...),
    req: DoctorHprSyncRequest = Body(...),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Sync and verify doctor professional credentials against HPR/NMC/State Council."""
    _check_compliance_manage_permission(current_user)
    target_hosp = _resolve_target_hospital(current_user, hospital_id)
    return sp_repository.update_doctor_hpr_mapping(
        doctor_id,
        target_hosp,
        req.model_dump(),
        actor_id=current_user.get("username", "admin")
    )

@router.get("/consents")
def list_hospital_consents(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    status: Optional[str] = Query("ALL"),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Hospital consent register for tracking cross-provider record sharing agreements."""
    target_hosp = _resolve_target_hospital(current_user, hospital_id)
    return sp_repository.list_hospital_consent_artifacts(target_hosp, status)

@router.post("/consents/request")
def request_patient_consent(
    req: ConsentRequestPayload,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Initiate a formal electronic consent request to access a patient's historical records."""
    _check_doctor_or_admin_permission(current_user)
    return sp_repository.create_consent_request(req.model_dump(), actor_id=current_user.get("username", "doc"))

@router.get("/grievances")
def list_privacy_grievances(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    status: Optional[str] = Query("ALL"),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """DPDP Act Privacy Grievance register with statutory 30-day resolution SLA tracking."""
    target_hosp = _resolve_target_hospital(current_user, hospital_id)
    return sp_repository.list_privacy_grievances(target_hosp, status)

@router.post("/grievances/{grievance_id}/resolve")
def resolve_privacy_grievance(
    grievance_id: str = Path(...),
    req: PrivacyGrievanceResolveRequest = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Record official resolution notes by Data Protection Officer (DPO)."""
    _check_compliance_manage_permission(current_user)
    try:
        return sp_repository.resolve_privacy_grievance(
            grievance_id,
            req.model_dump(),
            actor_id=current_user.get("username", "admin")
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/reports/regulatory-export")
def generate_regulatory_export(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Consolidated statutory inspection dossier for Tamil Nadu DMRHS and NHA/ABDM audit."""
    target_hosp = _resolve_target_hospital(current_user, hospital_id)
    return sp_repository.generate_regulatory_compliance_report(target_hosp)
