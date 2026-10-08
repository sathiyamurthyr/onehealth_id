"""
OH-ID Phase 7 Router: Connected Diagnostic & Laboratory Network
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/network/diagnostics", tags=["Network - Diagnostics"])
repo = SPViewsRepository()

class CreateDiagnosticOrderPayload(BaseModel):
    order_id: str
    patient_id: str
    ordering_provider_id: str
    diagnostic_lab_id: str
    test_codes: List[str]

class UpdateSpecimenStatusPayload(BaseModel):
    status: str = Field(..., description="ORDERED, SPECIMEN_COLLECTED, PROCESSING, REPORT_READY, CANCELLED")
    critical_flag: bool = False
    result_report_id: Optional[str] = None
    turnaround_minutes: Optional[int] = None

@router.post("/orders", response_model=Dict[str, Any])
def create_diagnostic_order(payload: CreateDiagnosticOrderPayload):
    """Transfers a digital lab order to an external accredited diagnostic laboratory."""
    return repo.create_diagnostic_order(
        order_id=payload.order_id,
        patient_id=payload.patient_id,
        ordering_provider_id=payload.ordering_provider_id,
        diagnostic_lab_id=payload.diagnostic_lab_id,
        test_codes=payload.test_codes
    )

@router.patch("/orders/{order_id}/status", response_model=Dict[str, Any])
@router.post("/orders/{order_id}/status", response_model=Dict[str, Any])
def update_specimen_status(order_id: str, payload: UpdateSpecimenStatusPayload):
    """Updates specimen collection, laboratory processing state, critical flags, and report ID."""
    updated = repo.update_diagnostic_specimen_status(
        order_id=order_id,
        status=payload.status,
        critical_flag=payload.critical_flag,
        result_report_id=payload.result_report_id,
        turnaround_minutes=payload.turnaround_minutes
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Diagnostic order not found.")
    return updated

@router.get("/orders", response_model=List[Dict[str, Any]])
def list_diagnostic_orders(
    diagnostic_lab_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    critical_only: bool = Query(False)
):
    """Lists diagnostic orders and specimen statuses for laboratory monitoring."""
    return repo.list_diagnostic_orders(
        diagnostic_lab_id=diagnostic_lab_id,
        patient_id=patient_id,
        critical_only=critical_only
    )
