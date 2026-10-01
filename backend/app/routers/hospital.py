from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional, List
from backend.app.repositories.sp_views_repository import sp_repository

router = APIRouter(prefix="/hospital", tags=["Hospital & Facility Configuration"])

@router.get("/config", response_model=Dict[str, Any])
def get_hospital_configuration(hospital_id: Optional[str] = Query("hosp-kedar")):
    """
    Returns dynamic facility configuration for Kedar Hospital (Mugalivakkam Branch, Chennai).
    Controls branding, branches, operational departments, and doctor rosters.
    """
    try:
        config = sp_repository.get_hospital_configuration(hospital_id=hospital_id)
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load hospital configuration: {str(e)}")

@router.get("/audit-logs", response_model=List[Dict[str, Any]])
def get_hospital_audit_logs(limit: int = Query(100, ge=1, le=500)):
    """
    Returns immutable audit trail entries of all patient registry lookups,
    QR scans, check-ins, queue operations, and doctor clinical encounters.
    """
    try:
        return sp_repository.list_audit_logs(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load audit logs: {str(e)}")
