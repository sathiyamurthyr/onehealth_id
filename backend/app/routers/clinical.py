from fastapi import APIRouter
from typing import List, Dict, Any
from backend.app.repositories.sp_views_repository import sp_repository

router = APIRouter(prefix="/clinical", tags=["Clinical Workflows"])

@router.get("/opd/encounters", response_model=List[Dict[str, Any]])
def list_opd_encounters():
    try:
        return sp_repository.list_opd_encounters()
    except Exception:
        return []

@router.get("/ipd/admissions", response_model=List[Dict[str, Any]])
def list_ipd_admissions():
    try:
        return sp_repository.list_ipd_admissions()
    except Exception:
        return []

@router.get("/ipd/wards-beds", response_model=List[Dict[str, Any]])
def list_wards_and_beds():
    try:
        return sp_repository.list_wards_and_beds()
    except Exception:
        return []

@router.get("/laboratory/orders", response_model=List[Dict[str, Any]])
def list_lab_orders():
    try:
        return sp_repository.list_lab_orders()
    except Exception:
        return []

@router.get("/pharmacy/dispensary", response_model=List[Dict[str, Any]])
def list_pharmacy_dispensary():
    try:
        return sp_repository.list_pharmacy_dispensary()
    except Exception:
        return []
