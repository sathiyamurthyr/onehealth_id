from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from uuid import uuid4
from backend.app.schemas.models import AppointmentCreate, AppointmentResponse, AppointmentStatusUpdate
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.routers.patients import _mem_patients, get_patient
from backend.app.routers.doctors import _mem_doctors, get_doctor

router = APIRouter(prefix="/appointments", tags=["Appointments"])

_mem_appointments = []

@router.get("", response_model=List[AppointmentResponse])
@router.get("/", response_model=List[AppointmentResponse], include_in_schema=False)
def list_appointments():
    try:
        appts = sp_repository.list_appointments()
        if appts:
            return appts
    except Exception:
        pass
    return _mem_appointments

@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_appointment(payload: AppointmentCreate):
    # Verify patient & doctor existence
    try:
        p = sp_repository.get_patient_by_id(payload.patient_id)
        if not p:
            if not any(x.get("id") == payload.patient_id for x in _mem_patients):
                raise HTTPException(status_code=404, detail="Patient not found")
    except HTTPException:
        raise
    except Exception:
        if not any(x.get("id") == payload.patient_id for x in _mem_patients):
            raise HTTPException(status_code=404, detail="Patient not found")

    try:
        d = sp_repository.get_doctor_by_id(payload.doctor_id)
        if not d:
            if not any(x.get("id") == payload.doctor_id for x in _mem_doctors):
                raise HTTPException(status_code=404, detail="Doctor not found")
    except HTTPException:
        raise
    except Exception:
        if not any(x.get("id") == payload.doctor_id for x in _mem_doctors):
            raise HTTPException(status_code=404, detail="Doctor not found")

    assigned_id = payload.id or f"a-{str(uuid4())[:8]}"

    try:
        appt = sp_repository.book_appointment(
            patient_id=payload.patient_id,
            doctor_id=payload.doctor_id,
            slot=payload.slot,
            status=payload.status or "scheduled",
            hospital_id=payload.hospital_id,
            department_id=payload.department_id,
            notes=payload.notes,
            appointment_id=assigned_id
        )
        if appt:
            _mem_appointments.append(appt)
            return appt
    except Exception:
        pass

    new_appt = {
        "id": assigned_id,
        "patient_id": payload.patient_id,
        "doctor_id": payload.doctor_id,
        "slot": payload.slot,
        "status": payload.status or "scheduled",
        "notes": payload.notes,
        "priority": payload.priority or "NORMAL",
        "token_number": len(_mem_appointments) + 1,
        "patient_name": "Patient",
        "doctor_name": "Doctor"
    }
    _mem_appointments.append(new_appt)
    return new_appt

@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: str):
    try:
        appt = sp_repository.get_appointment_by_id(appointment_id)
        if appt:
            return appt
    except Exception:
        pass

    for a in _mem_appointments:
        if a.get("id") == appointment_id:
            return a

    raise HTTPException(status_code=404, detail="Appointment not found")

@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
def update_appointment_status(appointment_id: str, update: AppointmentStatusUpdate):
    try:
        appt = sp_repository.update_appointment_status(appointment_id, update.status)
        if appt:
            return appt
    except Exception:
        pass

    for a in _mem_appointments:
        if a.get("id") == appointment_id:
            a["status"] = update.status
            return a

    raise HTTPException(status_code=404, detail="Appointment not found")
