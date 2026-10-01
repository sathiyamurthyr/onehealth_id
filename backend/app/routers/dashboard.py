from fastapi import APIRouter, Query
from typing import Dict, Any, Optional
from backend.app.repositories.sp_views_repository import sp_repository

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Metrics"])

@router.get("/summary", response_model=Dict[str, Any])
def get_dashboard_summary(hospital_id: Optional[str] = Query("hosp-kedar")):
    """
    Live Operational Summary for Kedar Hospital (Mugalivakkam Branch).
    All statistics are computed dynamically from real database views with zero hardcoded values.
    """
    summary = sp_repository.get_dashboard_summary(hospital_id=hospital_id)
    return summary

@router.get("/metrics", response_model=Dict[str, Any])
def get_dashboard_metrics():
    """
    Hospital-wide clinical and revenue metrics from oh_id.vw_dashboard_metrics.
    """
    metrics = sp_repository.get_dashboard_metrics()
    result = {}
    for k, v in metrics.items():
        result[k] = float(v) if hasattr(v, '__float__') and not isinstance(v, int) else v
    return result
