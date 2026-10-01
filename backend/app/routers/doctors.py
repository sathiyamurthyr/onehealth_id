from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from uuid import uuid4
from backend.app.schemas.models import DoctorCreate, DoctorResponse
from backend.app.repositories.sp_views_repository import sp_repository

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
        raise HTTPException(status_code=500, detail=f"Failed to fetch doctors: {str(e)}")

@router.post("", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_doctor(payload: DoctorCreate):
    assigned_id = payload.id or f"d-{str(uuid4())[:8]}"

    try:
        doc = sp_repository.create_doctor(
            name=payload.name,
            specialty=payload.specialty,
            department_id=payload.department_id or "dept-k-01",
            hospital_id=payload.hospital_id or "hosp-kedar",
            phone=payload.phone,
            email=payload.email,
            room_number=payload.room_number,
            consultation_fee=payload.consultation_fee or 500.00,
            doctor_id=assigned_id
        )
        if doc:
            return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create doctor: {str(e)}")

    raise HTTPException(status_code=500, detail="Failed to create doctor")

@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor(doctor_id: str):
    doc = sp_repository.get_doctor_by_id(doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doc
