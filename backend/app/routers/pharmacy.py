from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import get_current_user_context, get_optional_user_context

router = APIRouter(prefix="/pharmacy", tags=["Pharmacy Dispensing & Medication History"])

class DispenseItemPayload(BaseModel):
    medicine_name: str
    prescribed_quantity: int
    dispensed_quantity: int
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    instructions: Optional[str] = None
    substitution_made: bool = False
    substituted_medicine: Optional[str] = None

class DispensePrescriptionRequest(BaseModel):
    items: List[DispenseItemPayload] = Field(..., min_length=1)
    substitution_allowed: bool = False
    notes: Optional[str] = None
    is_partial: bool = False

@router.get("/prescriptions")
def list_pharmacy_prescriptions(
    hospital_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Lists electronic prescriptions awaiting pharmacy verification and dispensing."""
    h_id = hospital_id or (current_user.get("hospital_id") if current_user else None)
    return sp_repository.list_pharmacy_prescriptions(
        hospital_id=h_id,
        status=status,
        patient_id=patient_id,
        limit=limit,
        offset=offset
    )

@router.get("/prescriptions/{prescription_id}")
def get_pharmacy_prescription(
    prescription_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Retrieves single prescription clinical details for dispensing."""
    rx = sp_repository.get_pharmacy_prescription(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return rx

@router.post("/prescriptions/{prescription_id}/dispense")
def dispense_prescription(
    prescription_id: str,
    payload: DispensePrescriptionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Dispenses prescribed medication:
    - Verifies prescription existence
    - Records dispensing record without modifying doctor's original prescription
    - Updates status to DISPENSED or PARTIALLY_DISPENSED
    - Automatically updates Patient Health Timeline
    """
    pharmacist_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-pharmacist"
    hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    try:
        dispensation = sp_repository.dispense_prescription(
            prescription_id=prescription_id,
            hospital_id=hospital_id,
            pharmacist_id=pharmacist_id,
            items_dispensed=[item.model_dump() for item in payload.items],
            substitution_allowed=payload.substitution_allowed,
            notes=payload.notes,
            is_partial=payload.is_partial
        )
        return {"status": "SUCCESS", "message": "Medications successfully dispensed", "data": dispensation}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/dispensations")
def list_pharmacy_dispensations(
    hospital_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    prescription_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Lists completed pharmacy dispensing events."""
    h_id = hospital_id or (current_user.get("hospital_id") if current_user else None)
    return sp_repository.list_pharmacy_dispensations(
        hospital_id=h_id,
        patient_id=patient_id,
        prescription_id=prescription_id,
        limit=limit,
        offset=offset
    )
