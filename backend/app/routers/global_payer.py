"""
OH-ID Phase 8 Router: Global Payer Network & Multi-Country Insurance Claims
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/global/payer", tags=["Global - Payers & International Claims"])
repo = SPViewsRepository()

class ClaimSubmissionPayload(BaseModel):
    id: Optional[str] = None
    patient_id: str
    provider_id: Optional[str] = None
    country_code: str
    payer_identifier: str
    policy_number: str
    claim_amount: float
    currency_code: str = "USD"
    diagnosis_codes: List[str] = ["E11.9"]
    procedure_codes: List[str] = ["99213"]
    adjudication_status: str = "SUBMITTED"

class ClaimAdjudicationPayload(BaseModel):
    status: str = Field(..., description="APPROVED, PARTIALLY_APPROVED, REJECTED, REQUIRES_ADDITIONAL_INFO")
    approved_amount: float
    adjudication_notes: str

@router.get("/claims", response_model=List[Dict[str, Any]])
def list_global_payer_claims(
    patient_id: Optional[str] = Query(None),
    country_code: Optional[str] = Query(None),
    adjudication_status: Optional[str] = Query(None)
):
    """Lists multi-country insurance claims across international payers with adjudication status."""
    return repo.list_global_payer_claims(
        patient_id=patient_id,
        country_code=country_code,
        adjudication_status=adjudication_status
    )

@router.post("/claims/submit", response_model=Dict[str, Any])
def submit_global_payer_claim(payload: ClaimSubmissionPayload):
    """Submits a standardized global health insurance claim to an international payer registry."""
    return repo.submit_global_payer_claim(payload.model_dump())

@router.patch("/claims/{claim_id}/adjudicate", response_model=Dict[str, Any])
@router.post("/claims/{claim_id}/adjudicate", response_model=Dict[str, Any])
def adjudicate_global_claim(claim_id: str, payload: ClaimAdjudicationPayload):
    """Performs real-time claims adjudication with approved reimbursement amounts and audit notes."""
    claim = repo.adjudicate_global_payer_claim(
        claim_id=claim_id,
        status=payload.status,
        approved_amount=payload.approved_amount,
        adjudication_notes=payload.adjudication_notes
    )
    if not claim:
        raise HTTPException(status_code=404, detail="Global payer claim not found")
    return claim
