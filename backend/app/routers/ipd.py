from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import get_current_user_context, get_optional_user_context

router = APIRouter(prefix="/ipd", tags=["Inpatient (IPD), Wards & Concurrency-Safe Bed Allocation"])

class CreateAdmissionRequest(BaseModel):
    patient_id: str
    department: str
    admitting_doctor_id: Optional[str] = None
    admission_type: Optional[str] = "ELECTIVE"
    reason_for_admission: Optional[str] = None
    ward_id: Optional[str] = None
    bed_id: Optional[str] = None

class AllocateBedRequest(BaseModel):
    admission_id: str
    patient_id: str
    reason: Optional[str] = "Initial Inpatient Bed Allocation"

class TransferBedRequest(BaseModel):
    admission_id: str
    patient_id: str
    from_bed_id: str
    reason: str

class ReleaseBedRequest(BaseModel):
    reason: Optional[str] = "Discharge / Clinical Transfer"

@router.get("/admissions")
def list_inpatient_admissions(
    hospital_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Lists inpatient admissions."""
    h_id = hospital_id or (current_user.get("hospital_id") if current_user else "hosp-kedar")
    return sp_repository.list_inpatient_admissions(
        hospital_id=h_id,
        status=status,
        patient_id=patient_id,
        limit=limit,
        offset=offset
    )

@router.post("/admissions")
def create_inpatient_admission(
    payload: CreateAdmissionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Admit patient to hospital with optional atomic bed assignment."""
    doctor_id = payload.admitting_doctor_id or current_user.get("user_ref_id") or current_user.get("id") or "doc-general"
    hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    try:
        admission = sp_repository.create_inpatient_admission(
            patient_id=payload.patient_id,
            hospital_id=hospital_id,
            admitting_doctor_id=doctor_id,
            department=payload.department,
            admission_type=payload.admission_type or "ELECTIVE",
            reason_for_admission=payload.reason_for_admission,
            ward_id=payload.ward_id,
            bed_id=payload.bed_id,
            allocated_by=current_user.get("user_ref_id") or current_user.get("id")
        )
        return {"status": "SUCCESS", "message": "Inpatient admission created successfully", "data": admission}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/wards")
def list_inpatient_wards(
    hospital_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Lists hospital wards with aggregated bed occupancy metrics."""
    h_id = hospital_id or (current_user.get("hospital_id") if current_user else "hosp-kedar")
    return sp_repository.list_inpatient_wards(h_id)

@router.get("/beds")
def list_inpatient_beds(
    ward_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Lists beds with real-time occupancy status and current patient."""
    h_id = hospital_id or (current_user.get("hospital_id") if current_user else "hosp-kedar")
    return sp_repository.list_inpatient_beds(hospital_id=h_id, ward_id=ward_id, status=status)

@router.get("/dashboard")
def get_inpatient_occupancy_dashboard(
    hospital_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Real-time inpatient occupancy and ward utilization analytics."""
    h_id = hospital_id or (current_user.get("hospital_id") if current_user else "hosp-kedar")
    return sp_repository.get_inpatient_occupancy_dashboard(h_id)

@router.post("/beds/{bed_id}/allocate")
def allocate_bed(
    bed_id: str,
    payload: AllocateBedRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Allocates an available bed to an admitted patient.
    Concurrency-safe transactional execution using SELECT FOR UPDATE.
    """
    staff_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-staff"
    hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    try:
        allocation = sp_repository.allocate_bed_transactional(
            admission_id=payload.admission_id,
            bed_id=bed_id,
            patient_id=payload.patient_id,
            hospital_id=hospital_id,
            allocated_by=staff_id,
            reason=payload.reason or "Initial Inpatient Bed Allocation"
        )
        return {"status": "SUCCESS", "message": "Bed allocated successfully", "data": allocation}
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.post("/beds/{bed_id}/transfer")
def transfer_bed(
    bed_id: str,  # to_bed_id
    payload: TransferBedRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Transfers an inpatient between beds/wards.
    Maintains complete audit history and releases previous bed safely.
    """
    staff_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-staff"
    hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    try:
        allocation = sp_repository.transfer_bed_transactional(
            admission_id=payload.admission_id,
            from_bed_id=payload.from_bed_id,
            to_bed_id=bed_id,
            patient_id=payload.patient_id,
            hospital_id=hospital_id,
            transferred_by=staff_id,
            reason=payload.reason
        )
        return {"status": "SUCCESS", "message": "Inpatient transferred successfully", "data": allocation}
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.post("/beds/{bed_id}/release")
def release_bed(
    bed_id: str,
    payload: ReleaseBedRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Releases an occupied bed into available/cleaning status."""
    staff_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-staff"
    sp_repository.release_bed_transactional(bed_id=bed_id, released_by=staff_id, reason=payload.reason or "Discharge")
    return {"status": "SUCCESS", "message": "Bed released successfully"}
