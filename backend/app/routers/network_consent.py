"""
OH-ID Phase 7 Router: Granular Multi-Provider Consent & Access Audit
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/network/consents", tags=["Network - Granular Consent"])
repo = SPViewsRepository()

class GrantConsentPayload(BaseModel):
    patient_id: str
    grantee_provider_id: str
    consent_scope: str = Field("ALL_RECORDS", description="ALL_RECORDS, LABS_ONLY, PRESCRIPTIONS_ONLY, CONSULTATIONS_ONLY, EPISODE_ONLY")
    purpose: str = Field("CARE_TREATMENT", description="CARE_TREATMENT, SECOND_OPINION, DIAGNOSTIC_REVIEW, EMERGENCY")
    valid_days: int = 30
    grantee_doctor_id: Optional[str] = None
    grantor_provider_id: Optional[str] = None

class RevokeConsentPayload(BaseModel):
    reason: str = "Revoked by patient"

class VerifyConsentPayload(BaseModel):
    patient_id: str
    requester_provider_id: str
    record_type: str
    purpose: str = "CARE_TREATMENT"

@router.post("/grant", response_model=Dict[str, Any])
def grant_consent(payload: GrantConsentPayload):
    """Grants a scoped, time-limited consent to a participating provider."""
    return repo.grant_network_consent(
        patient_id=payload.patient_id,
        grantee_provider_id=payload.grantee_provider_id,
        consent_scope=payload.consent_scope,
        purpose=payload.purpose,
        valid_days=payload.valid_days,
        grantee_doctor_id=payload.grantee_doctor_id,
        grantor_provider_id=payload.grantor_provider_id
    )

@router.post("/{consent_id}/revoke", response_model=Dict[str, Any])
def revoke_consent(consent_id: str, patient_id: str, payload: Optional[RevokeConsentPayload] = None):
    """Revokes an active consent immediately, blocking any subsequent record access."""
    reason = payload.reason if payload else "Revoked by patient"
    revoked = repo.revoke_network_consent(consent_id, patient_id, reason)
    if not revoked:
        raise HTTPException(status_code=404, detail="Active consent not found or patient mismatch.")
    return revoked

@router.get("/patient/{patient_id}", response_model=List[Dict[str, Any]])
def list_patient_consents(patient_id: str):
    """Lists all active and historical consents granted by the patient."""
    return repo.list_patient_network_consents(patient_id)

@router.post("/verify", response_model=Dict[str, Any])
@router.get("/verify-access", response_model=Dict[str, Any])
def verify_consent_access(
    patient_id: Optional[str] = Query(None),
    requester_provider_id: Optional[str] = Query(None),
    record_type: Optional[str] = Query(None),
    purpose: Optional[str] = Query("CARE_TREATMENT"),
    payload: Optional[VerifyConsentPayload] = None
):
    """Verifies whether a provider has active patient consent to access a specific record type."""
    t_patient_id = patient_id or (payload.patient_id if payload else None)
    t_req_prov = requester_provider_id or (payload.requester_provider_id if payload else None)
    t_rec_type = record_type or (payload.record_type if payload else None)
    t_purp = purpose or (payload.purpose if payload else "CARE_TREATMENT")

    if not t_patient_id or not t_req_prov or not t_rec_type:
        raise HTTPException(status_code=400, detail="patient_id, requester_provider_id, and record_type are required.")

    return repo.verify_network_consent_access(
        patient_id=t_patient_id,
        requester_provider_id=t_req_prov,
        record_type=t_rec_type,
        purpose=t_purp
    )

@router.get("/patient/{patient_id}/access-history", response_model=List[Dict[str, Any]])
def get_access_history(patient_id: str):
    """Audits every cross-provider record retrieval with cryptographic provenance."""
    return repo.get_patient_network_access_history(patient_id)
