"""
OH-ID Phase 5: Hospital Services & Price Lists Router
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Dict, Any, Optional
from decimal import Decimal
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    require_any_permission,
    require_permission,
    get_current_user_context,
    validate_hospital_tenant_scope
)
from backend.app.core.logging import logger

router = APIRouter(prefix="/hospital", tags=["Hospital Services & Pricing"])

class ServiceCreateRequest(BaseModel):
    hospital_id: str
    code: str
    name: str
    description: Optional[str] = ""
    category: str = "CONSULTATION"
    department_id: Optional[str] = None
    taxable: bool = False
    tax_rate: float = 0.00
    base_price: float
    currency: str = "INR"

class ServiceUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    department_id: Optional[str] = None
    taxable: Optional[bool] = None
    tax_rate: Optional[float] = None
    base_price: Optional[float] = None
    is_active: Optional[bool] = None

class PriceListCreateRequest(BaseModel):
    hospital_id: str
    code: str
    name: str
    price_list_type: str = "GENERAL"
    currency: str = "INR"
    is_default: bool = False

class PriceListItemPayload(BaseModel):
    service_id: str
    price: float
    currency: str = "INR"
    effective_from: Optional[str] = None
    effective_until: Optional[str] = None

class PackageCreateRequest(BaseModel):
    hospital_id: str
    code: str
    name: str
    description: Optional[str] = ""
    category: str = "SURGERY"
    total_package_price: float
    validity_days: int = 30
    inclusions: List[str] = []
    exclusions: List[str] = []

# =========================================================================
# 1. SERVICES CATALOGUE
# =========================================================================

@router.get("/services")
def list_services(
    hospital_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("billing.read", "billing.manage", "system.manage", "doctor.workspace"))
):
    """Lists configured billable hospital services."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return sp_repository.list_hospital_services(hospital_id=target_hosp, category=category, is_active=is_active)
    except Exception as e:
        logger.error("Failed to list hospital services: %s", e, exc_info=True)
        return []

@router.post("/services")
def create_service(
    payload: ServiceCreateRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.manage", "system.manage"))
):
    """Creates a new billable hospital service."""
    validate_hospital_tenant_scope(user, payload.hospital_id)
    try:
        res = sp_repository.create_hospital_service(payload.model_dump())
        return {"success": True, "data": res}
    except Exception as e:
        logger.error("Failed to create service: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/services/{service_id}")
def update_service(
    service_id: str,
    payload: ServiceUpdateRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.manage", "system.manage"))
):
    """Updates an existing billable service."""
    try:
        res = sp_repository.update_hospital_service(service_id, payload.model_dump(exclude_none=True))
        if not res:
            raise HTTPException(status_code=404, detail="Service not found")
        return {"success": True, "data": res}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update service: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

# =========================================================================
# 2. PRICE LISTS
# =========================================================================

@router.get("/price-lists")
def list_price_lists(
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("billing.read", "billing.manage", "system.manage"))
):
    """Lists configurable price lists for the hospital."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_price_lists(target_hosp)

@router.post("/price-lists")
def create_price_list(
    payload: PriceListCreateRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.manage", "system.manage"))
):
    """Creates a new price list schedule."""
    validate_hospital_tenant_scope(user, payload.hospital_id)
    try:
        res = sp_repository.create_hospital_price_list(payload.model_dump())
        return {"success": True, "data": res}
    except Exception as e:
        logger.error("Failed to create price list: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/price-lists/{price_list_id}/items")
def set_price_list_items(
    price_list_id: str,
    items: List[PriceListItemPayload] = Body(...),
    user: Dict[str, Any] = Depends(require_any_permission("billing.manage", "system.manage"))
):
    """Sets versioned price items in a price list."""
    try:
        count = sp_repository.set_price_list_items(price_list_id, [i.model_dump() for i in items])
        return {"success": True, "message": f"Updated {count} price list items"}
    except Exception as e:
        logger.error("Failed to set price list items: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

# =========================================================================
# 3. MEDICAL PACKAGES
# =========================================================================

@router.get("/packages")
def list_packages(
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("billing.read", "billing.manage", "system.manage", "doctor.workspace"))
):
    """Lists medical packages."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_packages(target_hosp)

@router.post("/packages")
def create_package(
    payload: PackageCreateRequest,
    user: Dict[str, Any] = Depends(require_any_permission("billing.manage", "system.manage"))
):
    """Creates a medical service package."""
    validate_hospital_tenant_scope(user, payload.hospital_id)
    try:
        res = sp_repository.create_hospital_package(payload.model_dump())
        return {"success": True, "data": res}
    except Exception as e:
        logger.error("Failed to create package: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
