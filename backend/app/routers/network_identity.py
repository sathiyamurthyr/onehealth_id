"""
OH-ID Phase 7 Router: Cross-Provider Patient Identity Matching & Linking
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/network/identities", tags=["Network - Cross-Provider Identity"])
repo = SPViewsRepository()

class IdentityMatchRequest(BaseModel):
    identifier: str = Field(..., description="OneHealth ID (OH-ID), national ID, or mobile number")
    provider_id: Optional[str] = None

class IdentityLinkRequest(BaseModel):
    master_patient_id: str
    onehealth_id: str
    provider_id: str
    external_mrn: str
    match_confidence: float = 100.0
    match_method: str = "EXACT_OHID_QR"

@router.post("/match", response_model=Dict[str, Any])
@router.get("/match", response_model=Dict[str, Any])
def match_identity(
    identifier: Optional[str] = Query(None),
    provider_id: Optional[str] = Query(None),
    payload: Optional[IdentityMatchRequest] = None
):
    """Matches a patient across the network by OH-ID, Mobile, or MRN."""
    target_id = identifier or (payload.identifier if payload else None)
    target_prov = provider_id or (payload.provider_id if payload else None)
    if not target_id:
        raise HTTPException(status_code=400, detail="Identifier is required")
    matched = repo.match_cross_provider_identity(target_id, target_prov)
    if not matched:
        raise HTTPException(status_code=404, detail="No matching network identity found for identifier.")
    return {
        "status": "MATCHED",
        "patient": matched,
        "patient_id": matched.get("patient_id"),
        "onehealth_id": matched.get("onehealth_id")
    }

@router.post("/link", response_model=Dict[str, Any])
def link_external_identity(payload: IdentityLinkRequest):
    """Links an external provider MRN to the master patient OH-ID."""
    return repo.link_cross_provider_identity(
        master_patient_id=payload.master_patient_id,
        onehealth_id=payload.onehealth_id,
        provider_id=payload.provider_id,
        external_mrn=payload.external_mrn,
        confidence=payload.match_confidence,
        match_method=payload.match_method
    )

@router.get("/patient/{patient_id}/links", response_model=List[Dict[str, Any]])
@router.get("/patient/{patient_id}", response_model=List[Dict[str, Any]])
def get_patient_links(patient_id: str):
    """Retrieves all connected external provider MRNs for a patient."""
    return repo.get_cross_provider_identities_for_patient(patient_id)
