from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Optional, Dict, Any
from uuid import uuid4
from backend.app.schemas.models import DoctorCreate, DoctorResponse
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import require_any_permission, validate_hospital_tenant_scope
from backend.app.core.logging import logger, log_security_event

router = APIRouter(prefix="/doctors", tags=["Doctors"])

@router.get("", response_model=List[DoctorResponse])
@router.get("/", response_model=List[DoctorResponse], include_in_schema=False)
def list_doctors(
    hospital_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None)
):
    try:
        docs = sp_repository.list_doctors(hospital_id=hospital_id, department_id=department_id)
        return docs
    except Exception as e:
        logger.error("Failed to fetch doctors list: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch doctors list.")

@router.post("", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_doctor(
    payload: DoctorCreate,
    user: Dict[str, Any] = Depends(require_any_permission("doctor.create", "staff.manage", "system.manage"))
):
    """
    Registers a new doctor profile. Strictly requires doctor.create or staff.manage permission.
    """
    target_hospital = payload.hospital_id or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hospital)

    assigned_id = payload.id or f"d-{str(uuid4())[:8]}"

    try:
        doc = sp_repository.create_doctor(
            name=payload.name,
            specialty=payload.specialty,
            department_id=payload.department_id or "dept-k-01",
            hospital_id=target_hospital,
            phone=payload.phone,
            email=payload.email,
            room_number=payload.room_number,
            consultation_fee=payload.consultation_fee or 500.00,
            doctor_id=assigned_id,
            actor_id=user.get("user_ref_id") or user.get("id") or user.get("username")
        )
        if doc:
            log_security_event("DOCTOR_CREATED", actor_id=user.get("username"), resource=f"doctor:{assigned_id}", status="SUCCESS")
            return doc
    except Exception as e:
        logger.error("Failed to create doctor profile: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create doctor profile.")

    raise HTTPException(status_code=500, detail="Failed to create doctor profile.")

@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor(doctor_id: str):
    doc = sp_repository.get_doctor_by_id(doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doc
