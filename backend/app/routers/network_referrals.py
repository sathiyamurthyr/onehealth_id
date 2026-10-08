"""
OH-ID Phase 7 Router: Inter-Provider Digital Referrals
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/network/referrals", tags=["Network - Referrals"])
repo = SPViewsRepository()

class CreateReferralPayload(BaseModel):
    patient_id: str
    referring_provider_id: str
    referring_doctor_id: str
    referring_doctor_name: Optional[str] = None
    target_provider_id: str
    target_specialty: str
    clinical_summary: str
    referral_question: Optional[str] = None
    urgency: str = Field("ROUTINE", description="ROUTINE, URGENT, STAT_EMERGENCY")
    attached_record_ids: Optional[List[str]] = None

class UpdateReferralStatusPayload(BaseModel):
    status: str = Field(..., description="PENDING, ACCEPTED, REJECTED, COMPLETED, CANCELLED")
    response_notes: Optional[str] = None
    target_appointment_id: Optional[str] = None

@router.post("/", response_model=Dict[str, Any])
@router.post("/create", response_model=Dict[str, Any])
def create_referral(payload: CreateReferralPayload):
    """Creates a structured digital referral dispatched to another participating hospital or specialist."""
    return repo.create_network_referral(
        patient_id=payload.patient_id,
        referring_provider_id=payload.referring_provider_id,
        referring_doctor_id=payload.referring_doctor_id,
        referring_doctor_name=payload.referring_doctor_name,
        target_provider_id=payload.target_provider_id,
        target_specialty=payload.target_specialty,
        clinical_summary=payload.clinical_summary,
        referral_question=payload.referral_question,
        urgency=payload.urgency,
        attached_record_ids=payload.attached_record_ids
    )

@router.get("/incoming", response_model=List[Dict[str, Any]])
@router.get("/{provider_id}/incoming", response_model=List[Dict[str, Any]])
def list_incoming_referrals(provider_id: Optional[str] = None):
    """Lists incoming referrals received by a specialist provider."""
    if not provider_id:
        raise HTTPException(status_code=400, detail="provider_id required")
    return repo.list_network_referrals(provider_id=provider_id, direction="INCOMING")

@router.get("/outgoing", response_model=List[Dict[str, Any]])
@router.get("/{provider_id}/outgoing", response_model=List[Dict[str, Any]])
def list_outgoing_referrals(provider_id: Optional[str] = None):
    """Lists outgoing referrals dispatched by a referring hospital or clinic."""
    if not provider_id:
        raise HTTPException(status_code=400, detail="provider_id required")
    return repo.list_network_referrals(provider_id=provider_id, direction="OUTGOING")

@router.patch("/{referral_id}/status", response_model=Dict[str, Any])
@router.post("/{referral_id}/status", response_model=Dict[str, Any])
def update_referral_status(referral_id: str, payload: UpdateReferralStatusPayload):
    """Updates referral state (e.g. ACCEPTED, REJECTED, COMPLETED) with return clinical notes."""
    updated = repo.update_network_referral_status(
        referral_id=referral_id,
        status=payload.status,
        response_notes=payload.response_notes,
        target_appointment_id=payload.target_appointment_id
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Referral record not found.")
    return updated
