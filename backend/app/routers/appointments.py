from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from uuid import uuid4
from backend.app.schemas.models import AppointmentCreate, AppointmentResponse, AppointmentStatusUpdate
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.response import success_response, error_response

router = APIRouter(prefix="/appointments", tags=["Appointments"])

@router.get("", response_model=List[AppointmentResponse])
@router.get("/", response_model=List[AppointmentResponse], include_in_schema=False)
def list_appointments(
    patient_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    try:
        appts = sp_repository.list_appointments(
            patient_id=patient_id,
            doctor_id=doctor_id,
            hospital_id=hospital_id,
            status=status
        )
        return appts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch appointments: {str(e)}")

@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_appointment(payload: AppointmentCreate):
    # Verify patient existence
    patient = sp_repository.get_patient_by_id(payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in registry")

    # Verify doctor existence
    doctor = sp_repository.get_doctor_by_id(payload.doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found in registry")

    assigned_id = payload.id or f"appt-{str(uuid4())[:8]}"
    slot_val = payload.slot or f"{payload.appointment_date or '2026-10-01'} {payload.appointment_time or '10:00 AM'}"

    try:
        appt = sp_repository.book_appointment(
            patient_id=payload.patient_id,
            doctor_id=payload.doctor_id,
            slot=slot_val,
            status=payload.status or "scheduled",
            hospital_id=payload.hospital_id or doctor.get("hospital_id") or "hosp-kedar",
            department_id=payload.department_id or doctor.get("department_id"),
            notes=payload.notes,
            appointment_id=assigned_id
        )
        if appt:
            return appt
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Booking failed: {str(e)}")

    raise HTTPException(status_code=500, detail="Failed to create appointment")

@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: str):
    appt = sp_repository.get_appointment_by_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt

@router.post("/{appointment_id}/check-in")
def check_in_appointment(appointment_id: str):
    """
    Patient arrival check-in: atomically updates appointment status to 'checked_in',
    generates a live OPD queue token, and logs to the audit trail.
    """
    appt = sp_repository.get_appointment_by_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    try:
        check_in_result = sp_repository.check_in_appointment(appointment_id, actor_id="receptionist")
        return {
            "success": True,
            "message": f"Patient checked in successfully. Assigned OPD Token #{check_in_result['token_number']}",
            "data": check_in_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Check-in failed: {str(e)}")

@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
def update_appointment_status(appointment_id: str, update: AppointmentStatusUpdate):
    valid_statuses = ["scheduled", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"]
    if update.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{update.status}'. Allowed: {', '.join(valid_statuses)}"
        )

    appt = sp_repository.update_appointment_status(appointment_id, update.status)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt
