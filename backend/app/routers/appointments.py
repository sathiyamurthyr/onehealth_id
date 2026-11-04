from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Optional, Dict, Any
from uuid import uuid4
from datetime import date
from backend.app.schemas.models import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentStatusUpdate,
    AppointmentRescheduleRequest,
    AppointmentCancelRequest,
    AppointmentUpdateRequest,
)
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
    today_str = date.today().isoformat()
    if payload.appointment_date:
        appt_date = payload.appointment_date
        appt_time = payload.appointment_time or payload.slot or "10:00 AM"
    elif payload.slot:
        parts = payload.slot.strip().split(" ", 1)
        if len(parts) == 2 and ("-" in parts[0] or "/" in parts[0]):
            appt_date = parts[0]
            appt_time = parts[1]
        else:
            appt_date = today_str
            appt_time = payload.slot
    else:
        appt_date = today_str
        appt_time = payload.appointment_time or "10:00 AM"

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
    slot_val = payload.slot or f"{appt_date} {appt_time}"

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
        "clinical.consultation", "doctor.read", "hospital.update", "system.manage",
        "patient.self.appointments"
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

    user_perms = user.get("permissions", [])
    user_ref_id = user.get("user_ref_id") or user.get("id")

    # Patient IDOR boundary: Patients can only change their own appointment status to 'cancelled'
    if "patient.self.appointments" in user_perms and "appointment.manage" not in user_perms and "system.manage" not in user_perms:
        pat = sp_repository.get_patient_by_user_ref(user_ref_id, user.get("email"))
        effective_patient_id = pat["id"] if pat else user_ref_id
        if appt.get("patient_id") != effective_patient_id and appt.get("patient_id") != user_ref_id:
            raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to modify this appointment.")
        if update.status != "cancelled":
            raise HTTPException(status_code=403, detail="Forbidden: Patients may only cancel appointments.")
    else:
        validate_hospital_tenant_scope(user, appt.get("hospital_id"))

    if update.status == "cancelled":
        updated = sp_repository.cancel_appointment(
            appointment_id=appointment_id,
            reason=update.cancellation_reason or "Cancelled by user",
            cancelled_by_name=user.get("name") or user.get("username", "Patient"),
            cancelled_by_id=user_ref_id
        )
    else:
        updated = sp_repository.update_appointment_status(appointment_id, update.status)

    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return updated


@router.post("/{appointment_id}/reschedule", response_model=AppointmentResponse)
def reschedule_appointment_endpoint(
    appointment_id: str,
    payload: AppointmentRescheduleRequest,
    user: Dict[str, Any] = Depends(require_any_permission(
        "appointment.manage", "appointment.update", "appointment.create",
        "patient.self.appointments", "system.manage"
    )),
):
    """
    Reschedules an existing appointment to a new date and available time slot.
    Checks concurrency and preserves audit history.
    """
    appt = sp_repository.get_appointment_by_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    user_perms = user.get("permissions", [])
    user_ref_id = user.get("user_ref_id") or user.get("id")

    # Patient IDOR check
    if "patient.self.appointments" in user_perms and "appointment.manage" not in user_perms and "system.manage" not in user_perms:
        pat = sp_repository.get_patient_by_user_ref(user_ref_id, user.get("email"))
        effective_patient_id = pat["id"] if pat else user_ref_id
        if appt.get("patient_id") != effective_patient_id and appt.get("patient_id") != user_ref_id:
            raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to reschedule this appointment.")
    else:
        validate_hospital_tenant_scope(user, appt.get("hospital_id"))

    try:
        updated = sp_repository.reschedule_appointment(
            appointment_id=appointment_id,
            new_date=payload.new_date,
            new_time=payload.new_time,
            doctor_id=payload.doctor_id,
            changed_by_name=user.get("name") or user.get("username", "Patient"),
            changed_by_id=user_ref_id
        )
        log_security_event("APPOINTMENT_RESCHEDULED", actor_id=user.get("username"), resource=f"appointment:{appointment_id}", status="SUCCESS")
        return updated
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error("Reschedule failed for appointment %s: %s", appointment_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to reschedule appointment. Please try again.")


@router.post("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment_endpoint(
    appointment_id: str,
    payload: AppointmentCancelRequest,
    user: Dict[str, Any] = Depends(require_any_permission(
        "appointment.manage", "appointment.update", "appointment.delete",
        "patient.self.appointments", "system.manage"
    )),
):
    """
    Cancels an appointment with stated reason and records cancellation policy audit.
    """
    appt = sp_repository.get_appointment_by_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    user_perms = user.get("permissions", [])
    user_ref_id = user.get("user_ref_id") or user.get("id")

    # Patient IDOR check
    if "patient.self.appointments" in user_perms and "appointment.manage" not in user_perms and "system.manage" not in user_perms:
        pat = sp_repository.get_patient_by_user_ref(user_ref_id, user.get("email"))
        effective_patient_id = pat["id"] if pat else user_ref_id
        if appt.get("patient_id") != effective_patient_id and appt.get("patient_id") != user_ref_id:
            raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to cancel this appointment.")
    else:
        validate_hospital_tenant_scope(user, appt.get("hospital_id"))

    try:
        updated = sp_repository.cancel_appointment(
            appointment_id=appointment_id,
            reason=payload.reason,
            cancelled_by_name=user.get("name") or user.get("username", "Patient"),
            cancelled_by_id=user_ref_id
        )
        log_security_event("APPOINTMENT_CANCELLED", actor_id=user.get("username"), resource=f"appointment:{appointment_id}", status="SUCCESS")
        return updated
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error("Cancellation failed for appointment %s: %s", appointment_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to cancel appointment. Please try again.")


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment_details_endpoint(
    appointment_id: str,
    payload: AppointmentUpdateRequest,
    user: Dict[str, Any] = Depends(require_any_permission(
        "appointment.manage", "appointment.update", "appointment.create",
        "patient.self.appointments", "system.manage"
    )),
):
    """
    Updates permitted appointment details (Reason, Department, Doctor, Date, Time, Notes).
    """
    appt = sp_repository.get_appointment_by_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    user_perms = user.get("permissions", [])
    user_ref_id = user.get("user_ref_id") or user.get("id")

    # Patient IDOR check
    if "patient.self.appointments" in user_perms and "appointment.manage" not in user_perms and "system.manage" not in user_perms:
        pat = sp_repository.get_patient_by_user_ref(user_ref_id, user.get("email"))
        effective_patient_id = pat["id"] if pat else user_ref_id
        if appt.get("patient_id") != effective_patient_id and appt.get("patient_id") != user_ref_id:
            raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to edit this appointment.")
    else:
        validate_hospital_tenant_scope(user, appt.get("hospital_id"))

    try:
        updated = sp_repository.update_appointment_details(
            appointment_id=appointment_id,
            reason=payload.reason,
            department_id=payload.department_id,
            doctor_id=payload.doctor_id,
            appointment_date=payload.appointment_date,
            appointment_time=payload.appointment_time,
            notes=payload.notes,
            changed_by_name=user.get("name") or user.get("username", "Patient"),
            changed_by_id=user_ref_id
        )
        log_security_event("APPOINTMENT_EDITED", actor_id=user.get("username"), resource=f"appointment:{appointment_id}", status="SUCCESS")
        return updated
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error("Update failed for appointment %s: %s", appointment_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update appointment. Please try again.")
