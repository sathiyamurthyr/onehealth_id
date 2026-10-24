from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Optional, Dict, Any
from uuid import uuid4
from backend.app.schemas.models import AppointmentCreate, AppointmentResponse, AppointmentStatusUpdate
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.response import success_response, error_response
from backend.app.core.rbac import (
    get_current_user_context,
    require_any_permission,
    require_permission,
    validate_hospital_tenant_scope,
)
from backend.app.core.logging import logger, log_security_event

router = APIRouter(prefix="/appointments", tags=["Appointments"])

@router.get("", response_model=List[AppointmentResponse])
@router.get("/", response_model=List[AppointmentResponse], include_in_schema=False)
def list_appointments(
    patient_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission(
        "appointment.read", "appointment.create", "appointment.manage",
        "patient.self.read"
    )),
):
    """
    Returns appointments filtered by authenticated user's hospital context.
    Patients are strictly locked to their own appointments.
    """
    user_perms = user.get("permissions", [])
    user_hospital = user.get("hospital_ref_id") or user.get("hospital_id")

    effective_patient_id = patient_id
    # IDOR Prevention: Patients can only list their own appointments
    if "patient.self.read" in user_perms and "appointment.read" not in user_perms and "system.manage" not in user_perms:
        effective_patient_id = user.get("user_ref_id") or user.get("id")

    if "system.manage" not in user_perms and "organization.read" not in user_perms:
        effective_hospital_id = user_hospital
    else:
        effective_hospital_id = hospital_id

    try:
        appts = sp_repository.list_appointments(
            patient_id=effective_patient_id,
            doctor_id=doctor_id,
            hospital_id=effective_hospital_id,
            status=status
        )
        return appts
    except Exception as e:
        logger.error("Failed to fetch appointments: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch appointments.")

@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_appointment(
    payload: AppointmentCreate,
    user: Dict[str, Any] = Depends(require_any_permission(
        "appointment.create", "appointment.manage", "appointment.write",
        "appointment.read", "appointment.view", "clinical.consultation",
        "doctor.read", "hospital.update", "patient.self.appointments", "system.manage"
    )),
):
    user_perms = user.get("permissions", [])
    # IDOR Prevention: Patients may only book appointments for themselves
    if "patient.self.appointments" in user_perms and "appointment.create" not in user_perms and "appointment.manage" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = user.get("user_ref_id") or user.get("id")
        pat = sp_repository.get_patient_by_user_ref(user_ref_id, user.get("email"))
        effective_patient_id = pat["id"] if pat else user_ref_id
        if payload.patient_id != effective_patient_id and payload.patient_id != user_ref_id:
            log_security_event("UNAUTHORIZED_APPOINTMENT_CREATION", actor_id=user.get("username"), resource=f"patient:{payload.patient_id}", status="DENIED")
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Patients may only book appointments for themselves."
            )

    # Verify patient existence
    patient = sp_repository.get_patient_by_id(payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in registry")

    # Verify doctor existence
    doctor = sp_repository.get_doctor_by_id(payload.doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found in registry")

    target_hospital = payload.hospital_id or user.get("hospital_ref_id") or doctor.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hospital)

    # Validate double-booking and schedule availability
    appt_date = payload.appointment_date or (payload.slot.split(" ")[0] if payload.slot and " " in payload.slot else None)
    appt_time = payload.appointment_time or (payload.slot.split(" ", 1)[1] if payload.slot and " " in payload.slot else None)
    if appt_date and appt_time:
        schedule_validation = sp_repository.validate_appointment_schedule(
            doctor_id=payload.doctor_id,
            appointment_date=appt_date,
            appointment_time=appt_time,
            hospital_id=target_hospital,
            patient_id=payload.patient_id
        )
        if not schedule_validation.get("is_valid", True):
            raise HTTPException(
                status_code=400,
                detail=schedule_validation.get("message", "Appointment scheduling conflict detected.")
            )

    assigned_id = payload.id or f"appt-{str(uuid4())[:8]}"
    slot_val = payload.slot or f"{payload.appointment_date or '2026-10-01'} {payload.appointment_time or '10:00 AM'}"

    try:
        appt = sp_repository.book_appointment(
            patient_id=payload.patient_id,
            doctor_id=payload.doctor_id,
            slot=slot_val,
            status=payload.status or "scheduled",
            hospital_id=target_hospital,
            department_id=payload.department_id or doctor.get("department_id"),
            notes=payload.notes,
            appointment_id=assigned_id
        )
        if appt:
            log_security_event("APPOINTMENT_CREATED", actor_id=user.get("username"), resource=f"appointment:{assigned_id}", status="SUCCESS")
            return appt
    except Exception as e:
        logger.error("Booking failed for patient %s: %s", payload.patient_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Booking failed. Please try again.")

    raise HTTPException(status_code=500, detail="Failed to create appointment")


@router.post("/walk-in", status_code=status.HTTP_201_CREATED)
def create_walk_in_appointment(
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(require_any_permission("appointment.create", "appointment.manage")),
):
    """
    Registers a walk-in patient arrival directly, creating appointment, visit, department token, and queue entry.
    """
    patient_id = payload.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")

    patient = sp_repository.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    target_hospital = payload.get("hospital_id") or user.get("hospital_ref_id") or patient.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hospital)

    actor_id = user.get("user_ref_id") or user.get("id") or user.get("username", "receptionist")
    try:
        result = sp_repository.generate_walk_in_visit(
            hospital_id=target_hospital,
            patient_id=patient_id,
            department_id=payload.get("department_id"),
            doctor_id=payload.get("doctor_id"),
            priority=payload.get("priority", "NORMAL"),
            reason=payload.get("reason", "Direct Walk-In Arrival"),
            actor_id=actor_id
        )
        log_security_event("WALK_IN_CREATED", actor_id=user.get("username"), resource=f"appointment:{result.get('appointment_id')}", status="SUCCESS")
        return {
            "success": True,
            "message": f"Walk-in registered. Token: {result.get('token_str')}",
            "data": result
        }
    except Exception as e:
        logger.error("Walk-in creation failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create walk-in visit: {str(e)}")


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("appointment.read", "appointment.manage", "patient.self.read")),
):
    appt = sp_repository.get_appointment_by_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    user_perms = user.get("permissions", [])
    # IDOR check: Patients cannot access other patients' appointments
    if "patient.self.read" in user_perms and "appointment.read" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = user.get("user_ref_id") or user.get("id")
        if appt.get("patient_id") != user_ref_id:
            raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to view this appointment.")

    if "system.manage" not in user_perms and "organization.read" not in user_perms:
        validate_hospital_tenant_scope(user, appt.get("hospital_id"))

    return appt


@router.post("/{appointment_id}/check-in")
def check_in_appointment(
    appointment_id: str,
    user: Dict[str, Any] = Depends(require_any_permission(
        "appointment.checkin", "appointment.manage", "appointment.update",
        "clinical.consultation", "doctor.read", "hospital.update", "system.manage"
    )),
):
    appt = sp_repository.get_appointment_by_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    validate_hospital_tenant_scope(user, appt.get("hospital_id"))

    try:
        actor_id = user.get("user_ref_id") or user.get("id") or user.get("username", "receptionist")
        check_in_result = sp_repository.check_in_patient_visit(appointment_id=appointment_id, actor_id=actor_id)
        log_security_event("APPOINTMENT_CHECKED_IN", actor_id=user.get("username"), resource=f"appointment:{appointment_id}", status="SUCCESS")
        return {
            "success": True,
            "message": f"Patient checked in successfully. Assigned OPD Token #{check_in_result.get('token_number')} ({check_in_result.get('token_str')})",
            "data": check_in_result
        }
    except Exception as e:
        logger.error("Check-in failed for appointment %s: %s", appointment_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Check-in failed: {str(e)}")

@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
def update_appointment_status(
    appointment_id: str,
    update: AppointmentStatusUpdate,
    user: Dict[str, Any] = Depends(require_any_permission(
        "appointment.manage", "appointment.update", "appointment.checkin",
        "clinical.consultation", "doctor.read", "hospital.update", "system.manage"
    )),
):
    valid_statuses = ["scheduled", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"]
    if update.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{update.status}'. Allowed: {', '.join(valid_statuses)}"
        )

    appt = sp_repository.get_appointment_by_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    validate_hospital_tenant_scope(user, appt.get("hospital_id"))

    updated = sp_repository.update_appointment_status(appointment_id, update.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return updated
