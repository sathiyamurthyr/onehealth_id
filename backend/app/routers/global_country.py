"""
OH-ID Phase 8 Router: Global Country Configurations & Sovereign Identifiers
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/global", tags=["Global - Countries & Sovereign Identifiers"])
repo = SPViewsRepository()

class CountryConfigPayload(BaseModel):
    country_code: str = Field(..., max_length=10, description="ISO-3166-1 alpha-3 code, e.g. IND, ARE, GBR, SGP, USA")
    country_name: str
    currency_code: str = "INR"
    currency_symbol: str = "₹"
    default_timezone: str = "Asia/Kolkata"
    supported_languages: List[str] = ["en", "ta", "hi"]
    date_format: str = "DD/MM/YYYY"
    phone_prefix: str = "+91"
    national_health_id_name: str = "National Health ID"
    interop_standard: str = "FHIR_R4_ABDM"
    data_residency_region: str = "INDIA_CENTRAL"
    tax_rate: float = 18.0
    is_active: bool = True

class GlobalIdentityLinkPayload(BaseModel):
    master_patient_id: str
    country_code: str
    identifier_type: str = Field(..., description="PASSPORT, NATIONAL_ID, EMIRATES_ID, NHS_NUMBER, SINGPASS_NRIC, SSN")
    identifier_value: str
    issuing_authority: Optional[str] = None
    is_verified: bool = True

@router.get("/countries", response_model=List[Dict[str, Any]])
def list_country_configurations(is_active: Optional[bool] = Query(None)):
    """Lists all configured countries with regional localization, health ID schemes, and residency settings."""
    return repo.list_country_configs(is_active=is_active)

@router.get("/countries/{country_code}", response_model=Dict[str, Any])
def get_country_configuration(country_code: str):
    """Retrieves country configuration and regional rules by country code."""
    config = repo.get_country_config(country_code)
    if not config:
        raise HTTPException(status_code=404, detail=f"Country configuration '{country_code}' not found")
    return config

@router.post("/countries/upsert", response_model=Dict[str, Any])
def upsert_country_configuration(payload: CountryConfigPayload):
    """Creates or updates a sovereign country configuration in OH-ID Global Platform."""
    return repo.upsert_country_config(payload.model_dump())

@router.get("/identities", response_model=List[Dict[str, Any]])
def list_global_identities(
    patient_id: Optional[str] = Query(None),
    country_code: Optional[str] = Query(None)
):
    """Lists linked cross-border national and global sovereign identifiers for patients."""
    return repo.list_global_identities(patient_id=patient_id, country_code=country_code)

@router.post("/identities/link", response_model=Dict[str, Any])
def link_global_identity(payload: GlobalIdentityLinkPayload):
    """Links a verified national/international health identifier (Passport, NHS, Emirates ID) to a patient's master OH-ID."""
    return repo.link_global_identity(payload.model_dump())

@router.get("/identities/lookup", response_model=Dict[str, Any])
def lookup_patient_by_identifier(
    country_code: str = Query(...),
    identifier_type: str = Query(...),
    identifier_value: str = Query(...)
):
    """Performs global sovereign identity discovery to locate a patient record via foreign health identifiers."""
    patient = repo.lookup_patient_by_global_identity(
        country_code=country_code,
        identifier_type=identifier_type,
        identifier_value=identifier_value
    )
    if not patient:
        raise HTTPException(status_code=404, detail="No patient found with specified global identifier")
    return patient

@router.get("/telemetry", response_model=Dict[str, Any])
def get_global_platform_telemetry():
    """Retrieves high-level platform telemetry across countries, third-party apps, active RPM feeds, and claims."""
    return repo.get_global_platform_telemetry()
