"""
OH-ID Phase 8 Router: Research Cohort Governance & De-Identified Data Access
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/global/research", tags=["Global - Research Cohorts & IRB Governance"])
repo = SPViewsRepository()

class ResearchCohortPayload(BaseModel):
    id: Optional[str] = None
    study_title: str
    lead_institution: str
    irb_approval_number: str
    inclusion_criteria: Dict[str, Any] = {"min_age": 18, "condition": "DIABETES"}
    de_identification_method: str = "HIPAA_SAFE_HARBOR_K_ANONYMITY"
    cohort_patient_count: int = 0
    status: str = "ACTIVE"

@router.get("/cohorts", response_model=List[Dict[str, Any]])
def list_research_cohorts(
    lead_institution: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    """Lists authorized clinical research cohorts with IRB protocol numbers and de-identification parameters."""
    return repo.list_research_cohorts(lead_institution=lead_institution, status=status)

@router.get("/cohorts/{cohort_id}", response_model=Dict[str, Any])
def get_research_cohort(cohort_id: str):
    """Retrieves detailed research cohort metadata and compliance status."""
    cohort = repo.get_research_cohort(cohort_id)
    if not cohort:
        raise HTTPException(status_code=404, detail="Research cohort not found")
    return cohort

@router.post("/cohorts/create", response_model=Dict[str, Any])
def create_research_cohort(payload: ResearchCohortPayload):
    """Registers an IRB-approved anonymized research cohort study within OH-ID Global Platform."""
    return repo.create_research_cohort(payload.model_dump())
