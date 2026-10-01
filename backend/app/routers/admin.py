from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import require_any_permission, get_current_user_context

router = APIRouter(prefix="/admin", tags=["Administration & Audit"])

@router.get("/departments", response_model=List[Dict[str, Any]])
def list_departments(
    user: Dict[str, Any] = Depends(require_any_permission("organization.read", "department.read", "system.manage", "appointment.create", "patient.read"))
):
    """List hospital departments with administrative or operational permission."""
    try:
        return sp_repository.list_departments()
    except Exception:
        return []

@router.get("/audit-logs", response_model=List[Dict[str, Any]])
def list_audit_logs(
    user: Dict[str, Any] = Depends(require_any_permission("audit.read", "system.manage"))
):
    """Retrieve immutable audit logs. Requires audit.read permission."""
    try:
        return sp_repository.list_audit_logs()
    except Exception:
        return []
