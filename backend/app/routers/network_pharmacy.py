"""
OH-ID Phase 7 Router: Connected Pharmacy Network & Dispensation
Sathus Technology Pvt Ltd
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.app.repositories.sp_views_repository import SPViewsRepository

router = APIRouter(prefix="/network/pharmacy", tags=["Network - Pharmacy"])
repo = SPViewsRepository()

class RecordDispensationPayload(BaseModel):
    prescription_id: str
    patient_id: str
    prescribing_hospital_id: str
    dispensing_pharmacy_id: str
    dispensed_items: List[Dict[str, Any]]
    dispensing_status: str = Field("DISPENSED", description="VERIFIED, PARTIALLY_DISPENSED, DISPENSED, REJECTED")
    dispensing_pharmacist_id: Optional[str] = None
    dispensing_pharmacist_name: Optional[str] = None
    batch_numbers: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

@router.get("/verify-prescription/{prescription_id}", response_model=Dict[str, Any])
def verify_prescription(prescription_id: str):
    """Verifies a digital e-prescription against its cryptographic signature without modifying clinical data."""
    rx = repo.verify_network_prescription(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found or invalid QR token.")
    return {
        "status": "VALID_PRESCRIPTION",
        "prescription": rx
    }

@router.post("/dispense", response_model=Dict[str, Any])
def record_dispensation(payload: RecordDispensationPayload):
    """Records a digital dispensation against a valid e-prescription by an authorized network pharmacy."""
    return repo.record_pharmacy_dispensation(
        prescription_id=payload.prescription_id,
        patient_id=payload.patient_id,
        prescribing_hospital_id=payload.prescribing_hospital_id,
        dispensing_pharmacy_id=payload.dispensing_pharmacy_id,
        dispensed_items=payload.dispensed_items,
        dispensing_status=payload.dispensing_status,
        pharmacist_id=payload.dispensing_pharmacist_id,
        pharmacist_name=payload.dispensing_pharmacist_name,
        batch_numbers=payload.batch_numbers,
        notes=payload.notes
    )

@router.get("/dispensations", response_model=List[Dict[str, Any]])
def list_dispensations(
    pharmacy_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None)
):
    """Lists dispensation records for a pharmacy store or patient."""
    return repo.list_network_pharmacy_dispensations(pharmacy_id=pharmacy_id, patient_id=patient_id)
