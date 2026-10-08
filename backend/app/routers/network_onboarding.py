"""
OH-ID Phase 7 Router: Provider & Facility Onboarding Lifecycle
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/network", tags=["Network - Provider Onboarding"])
repo = SPViewsRepository()

class ProviderRegistrationPayload(BaseModel):
    id: Optional[str] = None
    organization_name: str
    provider_type: str = Field("HOSPITAL", description="HOSPITAL, CLINIC, LAB, PHARMACY, DIAGNOSTIC, SPECIALIST, EMERGENCY")
    registration_number: str
    tax_id: Optional[str] = None
    primary_contact_name: str
    primary_email: str
    primary_phone: str
    city: str
    state: str
    country: str = "India"
    verification_documents: Optional[List[Any]] = None

class ProviderStageUpdatePayload(BaseModel):
    stage: str = Field(..., description="PENDING, UNDER_REVIEW, VERIFIED, ACTIVE, SUSPENDED, INACTIVE")
    verified_by: Optional[str] = None

@router.get("/providers", response_model=List[Dict[str, Any]])
def list_network_providers(
    provider_type: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    city: Optional[str] = Query(None)
):
    """Lists participating network providers with optional filtering."""
    return repo.list_network_providers(provider_type=provider_type, stage=stage, city=city)

@router.get("/providers/{provider_id}", response_model=Dict[str, Any])
def get_network_provider(provider_id: str):
    """Retrieves detailed profile for a network provider."""
    provider = repo.get_network_provider(provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Network provider not found")
    return provider

@router.post("/providers/register", response_model=Dict[str, Any])
def register_provider(payload: ProviderRegistrationPayload):
    """Registers a new healthcare provider into the OH-ID Network Onboarding Pipeline."""
    return repo.register_network_provider(payload.model_dump())

@router.patch("/providers/{provider_id}/stage", response_model=Dict[str, Any])
@router.post("/providers/{provider_id}/stage", response_model=Dict[str, Any])
def update_provider_stage(provider_id: str, payload: ProviderStageUpdatePayload):
    """Advances or updates the provider onboarding verification stage."""
    updated = repo.update_network_provider_stage(provider_id, payload.stage, payload.verified_by)
    if not updated:
        raise HTTPException(status_code=404, detail="Network provider not found")
    return updated

@router.get("/facilities", response_model=List[Dict[str, Any]])
def list_network_facilities(
    provider_id: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    emergency_only: bool = Query(False)
):
    """Lists physical facilities across the network."""
    return repo.list_network_facilities(provider_id=provider_id, city=city, emergency_only=emergency_only)
