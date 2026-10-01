from fastapi import APIRouter
from typing import List, Dict, Any
from backend.app.repositories.sp_views_repository import sp_repository

router = APIRouter(prefix="/admin", tags=["Administration & Audit"])

@router.get("/departments", response_model=List[Dict[str, Any]])
def list_departments():
    try:
        return sp_repository.list_departments()
    except Exception:
        return []

@router.get("/audit-logs", response_model=List[Dict[str, Any]])
def list_audit_logs():
    try:
        return sp_repository.list_audit_logs()
    except Exception:
        return []
