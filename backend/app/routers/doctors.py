from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from uuid import uuid4
from backend.app.schemas.models import DoctorCreate, DoctorResponse
from backend.app.repositories.sp_views_repository import sp_repository

router = APIRouter(prefix="/doctors", tags=["Doctors"])

_mem_doctors = []

@router.get("", response_model=List[DoctorResponse])
@router.get("/", response_model=List[DoctorResponse], include_in_schema=False)
def list_doctors():
    try:
        docs = sp_repository.list_doctors()
        if docs:
            return docs
    except Exception:
        pass
    return _mem_doctors

@router.post("", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_doctor(payload: DoctorCreate):
    assigned_id = payload.id or f"d-{str(uuid4())[:8]}"

    try:
        doc = sp_repository.create_doctor(
            name=payload.name,
            specialty=payload.specialty,
            department_id=payload.department_id or "dept-101",
            hospital_id=payload.hospital_id or "hosp-001",
            phone=payload.phone,
            email=payload.email,
            room_number=payload.room_number,
            consultation_fee=payload.consultation_fee or 500.00,
            doctor_id=assigned_id
        )
        if doc:
            _mem_doctors.append(doc)
            return doc
    except Exception:
        pass

    new_doc = {
        "id": assigned_id,
        "name": payload.name,
        "specialty": payload.specialty,
        "qualification": payload.qualification,
        "phone": payload.phone,
        "email": payload.email,
        "room_number": payload.room_number,
        "opd_timings": payload.opd_timings,
        "consultation_fee": payload.consultation_fee,
        "department_name": "General Medicine",
        "hospital_name": "Apollo Central Hospital",
        "rating": 4.9,
        "is_available": True,
        "active_waiting_count": 0,
        "upcoming_appointments_count": 0
    }
    _mem_doctors.append(new_doc)
    return new_doc

@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor(doctor_id: str):
    try:
        doc = sp_repository.get_doctor_by_id(doctor_id)
        if doc:
            return doc
    except Exception:
        pass

    for d in _mem_doctors:
        if d.get("id") == doctor_id:
            return d

    raise HTTPException(status_code=404, detail="Doctor not found")
