from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Dict, Any, Optional, List
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    get_current_user_context,
    require_any_permission,
    validate_hospital_tenant_scope,
)

router = APIRouter(prefix="/hospital", tags=["Hospital & Facility Configuration"])

@router.get("/config", response_model=Dict[str, Any])
def get_hospital_configuration(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "hospital.update")),
):
    """
    Returns dynamic facility configuration for the authorized hospital.
    Requires hospital.read or hospital.update permission.
    SUPER_ADMIN (system.manage) gets platform-wide access.
    """
    # Enforce hospital scope: non-platform users can only access their own hospital
    validate_hospital_tenant_scope(user, hospital_id or "hosp-kedar")
    try:
        config = sp_repository.get_hospital_configuration(hospital_id=hospital_id)
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load hospital configuration: {str(e)}")

@router.get("/audit-logs", response_model=List[Dict[str, Any]])
def get_hospital_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    user: Dict[str, Any] = Depends(require_any_permission("audit.read")),
):
    """
    Returns immutable audit trail entries.
    Requires audit.read permission.
    """
    try:
        return sp_repository.list_audit_logs(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load audit logs: {str(e)}")
