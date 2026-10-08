"""
OH-ID Phase 5: Operational Intelligence & Executive KPI Analytics Router
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    require_any_permission,
    require_permission,
    get_current_user_context,
    validate_hospital_tenant_scope
)
from backend.app.core.logging import logger

router = APIRouter(prefix="/hospital/analytics", tags=["Operational Intelligence & Analytics"])

@router.get("/financial")
def get_financial_analytics(
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("billing.read", "billing.manage", "system.manage"))
):
    """Returns aggregated hospital financial metrics (Gross/Net Billed, Collections, Outstanding, Refunds, Claims)."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return sp_repository.get_hospital_financial_analytics(target_hosp)
    except Exception as e:
        logger.error("Failed to load financial analytics for %s: %s", target_hosp, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load financial metrics")

@router.get("/operational-kpis")
def get_operational_kpis(
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.view", "billing.read", "billing.manage", "system.manage", "doctor.workspace"))
):
    """Returns live operational KPIs (OPD volume, IPD active admissions, bed occupancy %, emergency triage, verified lab/imaging)."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return sp_repository.get_hospital_operational_kpis(target_hosp)
    except Exception as e:
        logger.error("Failed to load operational KPIs for %s: %s", target_hosp, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load operational KPIs")

@router.get("/departments")
def get_department_performance(
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.view", "billing.read", "billing.manage", "system.manage"))
):
    """Returns department patient volume, active clinicians, and generated revenue summary."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return sp_repository.get_department_performance_summary(target_hosp)
    except Exception as e:
        logger.error("Failed to load department summary for %s: %s", target_hosp, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load department summary")
