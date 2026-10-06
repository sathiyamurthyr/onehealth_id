from fastapi import APIRouter, HTTPException, Query, Depends, status
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.response import success_response, error_response
from backend.app.core.logging import logger

router = APIRouter(prefix="/discovery", tags=["Patient Healthcare Discovery & Provider Search"])

# --------------------------------------------------------------------------
# 1. SPECIALTIES & SYMPTOM REQUIREMENTS CATALOG
# --------------------------------------------------------------------------

@router.get("/specialties")
def list_specialties_catalog(
    category: Optional[str] = Query(None, description="Filter by category e.g. General, Dental, Bone, Joint & Trauma, Heart, Women, Children, etc."),
    search: Optional[str] = Query(None, description="Search specialty by keyword or description")
):
    """
    Returns full medical specialties catalog grouped by department & clinical discipline.
    Dynamically driven from OH-ID database catalog (never hardcoded).
    """
    try:
        specs = sp_repository.list_specialties(category=category, search=search)
        return success_response(data=specs)
    except Exception as e:
        logger.error(f"Error fetching specialties catalog: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch specialties catalog.")

@router.get("/symptoms")
def list_symptom_problem_mappings(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """
    Returns patient-friendly health problem / requirement quick-search chips
    that map intelligently to medical specialties (without giving clinical diagnoses).
    """
    try:
        problems = sp_repository.list_symptom_mappings(category=category, search=search)
        return success_response(data=problems)
    except Exception as e:
        logger.error(f"Error fetching symptom problem mappings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch healthcare problem mappings.")

# --------------------------------------------------------------------------
# 2. PROVIDER (HOSPITAL / CLINIC) SEARCH
# --------------------------------------------------------------------------

@router.get("/providers")
def search_registered_providers(
    query: Optional[str] = Query(None, description="Search query by hospital name, doctor name, area, etc."),
    specialty: Optional[str] = Query(None, description="Specialty requirement e.g. Cardiology, Orthopedics, Pediatrics"),
    category: Optional[str] = Query(None, description="Specialty category e.g. General, Dental, Heart"),
    location: Optional[str] = Query(None, description="Search location text: city, area, locality, PIN code or landmark"),
    city: Optional[str] = Query(None, description="City name"),
    area: Optional[str] = Query(None, description="Locality or area name"),
    pin_code: Optional[str] = Query(None, description="PIN code"),
    latitude: Optional[float] = Query(None, description="User current latitude coordinate"),
    longitude: Optional[float] = Query(None, description="User current longitude coordinate"),
    radius_km: float = Query(25.0, description="Search distance radius in kilometers (1, 3, 5, 10, 25)"),
    sort_by: str = Query("recommended", description="Sorting criterion: recommended, nearest, earliest")
):
    """
    Patient-First Discovery:
    Finds active and verified OH-ID registered healthcare providers matching location,
    distance radius, and medical specialty.
    CRITICAL RULE: Returns ONLY providers registered & active on OH-ID with appointment booking enabled.
    """
    try:
        providers = sp_repository.search_discovery_providers(
            query=query,
            specialty=specialty,
            category=category,
            location_query=location,
            city=city,
            area=area,
            pin_code=pin_code,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            sort_by=sort_by
        )
        return success_response(
            data=providers,
            message=f"Found {len(providers)} registered healthcare provider(s)."
        )
    except Exception as e:
        logger.error(f"Error searching discovery providers: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to search healthcare providers.")

@router.get("/providers/{hospital_id}")
def get_provider_details(hospital_id: str):
    """
    Returns full details for an OH-ID registered hospital or clinic:
    Address, geodata, verified status, departments, available specialties, and doctor roster.
    """
    hosp = sp_repository.get_discovery_provider_detail(hospital_id)
    if not hosp:
        raise HTTPException(status_code=404, detail="Registered healthcare provider not found.")
    return success_response(data=hosp)

# --------------------------------------------------------------------------
# 3. DOCTOR & REAL-TIME SLOT AVAILABILITY
# --------------------------------------------------------------------------

@router.get("/doctors")
def list_discovery_doctors(
    hospital_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """
    Returns list of available doctors at registered facilities matching department or specialty.
    """
    try:
        doctors = sp_repository.list_discovery_doctors(
            hospital_id=hospital_id,
            department_id=department_id,
            specialty=specialty,
            search=search
        )
        return success_response(data=doctors)
    except Exception as e:
        logger.error(f"Error fetching doctors: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch available doctors.")

@router.get("/slots")
def get_available_appointment_slots(
    doctor_id: str = Query(..., description="Doctor ID or 'any' for any available doctor in department"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    hospital_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None)
):
    """
    Dynamically computes real-time time slot availability for the selected doctor or department.
    Real-time database validation: Booked slots are flagged so patients cannot double-book.
    """
    try:
        slots = sp_repository.get_doctor_available_slots(
            doctor_id=doctor_id,
            date_str=date,
            hospital_id=hospital_id,
            department_id=department_id
        )
        return success_response(data=slots)
    except Exception as e:
        logger.error(f"Error fetching available slots: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to calculate slot availability.")
