from fastapi import APIRouter, HTTPException, Depends, Header, Query, Body, status, Response, Request
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from backend.app.schemas.models import UserProfile, WorkspaceResponse
from backend.app.core.config import settings
from backend.app.core.rbac import get_current_user_context
from backend.app.core.security import create_access_token
from backend.app.core.response import success_response
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.logging import log_security_event, logger

router = APIRouter(prefix="", tags=["User Context & Patient Self-Service Workspace"])

# --------------------------------------------------------------------------
# REQUEST / RESPONSE SCHEMAS
# --------------------------------------------------------------------------

class HospitalContextSwitchRequest(BaseModel):
    hospital_id: str
    branch_id: Optional[str] = None

class HospitalMembershipItem(BaseModel):
    hospital_id: str
    hospital_ref_id: Optional[str] = None
    hospital_name: str
    hospital_code: Optional[str] = None
    hospital_city: Optional[str] = None
    branch_id: Optional[str] = None
    branch_ref_id: Optional[str] = None
    branch_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    is_current: bool = False
    is_primary: bool = False

class PatientProfileUpdateRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None
    diagnosis: Optional[str] = None

class BookAppointmentRequest(BaseModel):
    patient_id: Optional[str] = None # None means book for myself (authenticated patient)
    hospital_id: str
    department_id: Optional[str] = None
    doctor_id: str
    appointment_date: str # YYYY-MM-DD
    appointment_time: str # e.g. 10:30 AM
    appointment_type: Optional[str] = "New Consultation"
    slot: Optional[str] = None
    reason: Optional[str] = "Regular Consultation"
    symptoms_notes: Optional[str] = None
    priority: Optional[str] = "NORMAL"

class RescheduleAppointmentRequest(BaseModel):
    new_date: str # YYYY-MM-DD
    new_time: str # e.g. 11:00 AM
    new_slot: Optional[str] = None

class CancelAppointmentRequest(BaseModel):
    reason: str

class CreatePrescriptionShareRequest(BaseModel):
    recipient_name: Optional[str] = None
    recipient_contact: Optional[str] = None
    access_level: Optional[str] = "VIEW_ONLY"
    duration_hours: Optional[int] = 24

class PrescriptionAuditRequest(BaseModel):
    action: str
    details: Optional[Dict[str, Any]] = None

class CreateLabReportShareRequest(BaseModel):
    recipient_name: Optional[str] = None
    recipient_contact: Optional[str] = None
    access_level: Optional[str] = "VIEW_ONLY"
    duration_hours: Optional[int] = 24

class LabReportAuditRequest(BaseModel):
    action: str
    details: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

# Helper to resolve authenticated patient record
def _resolve_authenticated_patient(current_user: Dict[str, Any]) -> Dict[str, Any]:
    user_ref_id = current_user["user_ref_id"]
    email = current_user.get("email")
    patient = sp_repository.get_patient_by_user_ref(user_ref_id, email)
    if not patient:
        # Fallback by username if username matches known patient
        if current_user.get("username") == "patient":
            patient = sp_repository.get_patient_by_id("p-101")
        if not patient:
            raise HTTPException(
                status_code=404,
                detail="Patient profile not linked to authenticated user."
            )
    return patient

# Helper to resolve authorized target patient (Self vs Family Member Context)
def _resolve_target_patient(
    current_user: Dict[str, Any],
    requested_patient_id: Optional[str] = None,
    required_permission: str = "view_records",
    action_name: str = "VIEW_RECORDS"
) -> Dict[str, Any]:
    primary_patient = _resolve_authenticated_patient(current_user)
    if not requested_patient_id or requested_patient_id == primary_patient["id"]:
        return primary_patient

    # Validate family authorization & consent
    access_check = sp_repository.verify_family_access(
        primary_patient_id=primary_patient["id"],
        target_patient_id=requested_patient_id,
        required_permission=required_permission
    )

    if not access_check.get("authorized"):
        log_security_event(
            "UNAUTHORIZED_FAMILY_DATA_ACCESS_ATTEMPT",
            actor_id=current_user["username"],
            resource=f"patient:{requested_patient_id}",
            status="DENIED",
            details={"reason": access_check.get("message")}
        )
        raise HTTPException(
            status_code=403,
            detail=access_check.get("message", "Forbidden: You do not have authorization or consent to access this family member's records.")
        )

    # Log audit trail
    sp_repository.log_family_access(
        actor_user_id=current_user.get("user_ref_id", current_user["id"]),
        actor_patient_id=primary_patient["id"],
        target_patient_id=requested_patient_id,
        relationship=access_check.get("relationship", "FAMILY"),
        action=action_name,
        authorization_basis=access_check.get("basis", "ACTIVE_FAMILY_CONSENT")
    )

    target_patient = sp_repository.get_patient_by_id(requested_patient_id)
    if not target_patient:
        raise HTTPException(status_code=404, detail="Target patient profile not found.")
    
    return target_patient

# --------------------------------------------------------------------------
# 1. CORE AUTHENTICATED USER / PATIENT PROFILE
# --------------------------------------------------------------------------

@router.get("/me")
def get_current_me_profile(current_user: Dict[str, Any] = Depends(get_current_user_context)):
    """
    Returns authenticated user profile, resolved doctor or patient credentials,
    and active healthcare context.
    """
    user_ref_id = current_user["user_ref_id"]
    role = current_user.get("role", "PATIENT")
    ws = sp_repository.get_user_workspace(
        user_ref_id=user_ref_id,
        hospital_ref_id=current_user.get("hospital_ref_id"),
        usertype_ref_id=current_user.get("usertype_ref_id"),
        role_code=role
    )

    # If Doctor
    doctor_dict = None
    if role == "DOCTOR":
        doctor_profile = sp_repository.get_doctor_by_user_id(user_ref_id)
        if doctor_profile:
            doctor_dict = {
                "id": doctor_profile.get("id"),
                "name": doctor_profile.get("name"),
                "specialty": doctor_profile.get("specialty"),
                "registration_number": doctor_profile.get("registration_number", "TN-MCI-2026-REG"),
                "qualification": doctor_profile.get("qualification")
            }

    # If Patient / Citizen
    patient_dict = None
    patient_record = None
    if role == "PATIENT":
        patient_record = sp_repository.get_patient_by_user_ref(user_ref_id, current_user.get("email"))
        if not patient_record and current_user.get("username") == "patient":
            patient_record = sp_repository.get_patient_by_id("p-101")
        if patient_record:
            patient_dict = {
                "id": patient_record.get("id"),
                "onehealth_id": patient_record.get("onehealth_id"),
                "name": patient_record.get("name"),
                "age": patient_record.get("age"),
                "dob": patient_record.get("dob"),
                "gender": patient_record.get("gender"),
                "phone": patient_record.get("phone"),
                "email": patient_record.get("email"),
                "address": patient_record.get("address"),
                "city": patient_record.get("city"),
                "state": patient_record.get("state"),
                "blood_group": patient_record.get("blood_group"),
                "emergency_contact": patient_record.get("emergency_contact"),
                "qr_token": patient_record.get("qr_token"),
                "status": patient_record.get("status")
            }

    # Authorized hospitals
    hospitals = sp_repository.list_user_hospitals(user_ref_id)
    current_hosp_id = current_user.get("hospital_ref_id") or (ws.get("hospital_ref_id") if ws else None)

    return {
        "id": current_user["id"],
        "user_ref_id": user_ref_id,
        "username": current_user["username"],
        "name": patient_record.get("name") if patient_record else (current_user.get("name") or current_user.get("full_name")),
        "role": role,
        "patient": patient_dict,
        "doctor": doctor_dict,
        "doctor_id": doctor_dict.get("id") if doctor_dict else None,
        "specialty": doctor_dict.get("specialty") if doctor_dict else None,
        "qualification": doctor_dict.get("qualification") if doctor_dict else None,
        "registration_number": doctor_dict.get("registration_number") if doctor_dict else None,
        "hospital_id": current_hosp_id,
        "hospital_ref_id": current_hosp_id,
        "hospital_name": ws.get("hospital_name") if ws else "Kedar Hospital",
        "branch_name": ws.get("branch_name") if ws else "Mugalivakkam Main",
        "authorized_hospitals": [
            {
                "hospital_id": h["hospital_ref_id"],
                "hospital_ref_id": h["hospital_ref_id"],
                "hospital_name": h["hospital_name"],
                "hospital_code": h.get("hospital_code"),
                "branch_id": h.get("branch_ref_id"),
                "branch_ref_id": h.get("branch_ref_id"),
                "branch_name": h.get("branch_name"),
                "is_current": h["hospital_ref_id"] == current_hosp_id,
                "is_primary": h.get("is_primary", False)
            }
            for h in hospitals
        ],
        "permissions": current_user.get("permissions") or []
    }

@router.get("/me/profile")
def get_my_patient_profile(
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Detailed personal healthcare profile for authenticated patient or authorized family member."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_PROFILE")
    return success_response(data=patient)

@router.patch("/me/profile")
def update_my_patient_profile(
    payload: PatientProfileUpdateRequest,
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Allows patient or authorized guardian to update contact and demographic details."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="manage_profile", action_name="UPDATE_PROFILE")
    update_data = payload.model_dump(exclude_unset=True)
    updated = sp_repository.update_patient_profile(patient["id"], update_data)
    log_security_event("PATIENT_PROFILE_UPDATED", actor_id=current_user["username"], resource=f"patient:{patient['id']}", status="SUCCESS")
    return success_response(data=updated, message="Personal profile updated successfully.")

@router.get("/me/summary")
def get_my_patient_summary(
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Authoritative summary metrics, upcoming events, and quick dashboard feeds
    for the selected patient/family member context.
    """
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_SUMMARY")
    metrics = sp_repository.get_patient_summary_metrics(patient["id"])
    return success_response(data={
        "patient": patient,
        **metrics
    })

# --------------------------------------------------------------------------
# 2. PATIENT APPOINTMENTS & CLINICAL ENCOUNTERS
# --------------------------------------------------------------------------

@router.post("/me/appointments/book", status_code=status.HTTP_201_CREATED)
def book_my_appointment(
    req: BookAppointmentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Transactional appointment booking for Self or Authorized Family Member:
    1. Revalidates authorization and family consent permissions.
    2. Enforces slot concurrency lock in database transaction to prevent double booking.
    3. Attaches appointment strictly to the actual patient's OneHealth ID while recording booked_by audit trail.
    """
    primary_patient = _resolve_authenticated_patient(current_user)
    target_patient_id = req.patient_id or primary_patient["id"]

    # Authorization Check
    is_self = (target_patient_id == primary_patient["id"])
    if is_self:
        target_patient = primary_patient
        rel_context = "SELF"
        booked_by_relationship = "Self"
    else:
        # Validate family booking permission & consent
        access_check = sp_repository.verify_family_access(
            primary_patient_id=primary_patient["id"],
            target_patient_id=target_patient_id,
            required_permission="book_appointments"
        )
        if not access_check.get("authorized"):
            log_security_event(
                "UNAUTHORIZED_FAMILY_APPOINTMENT_BOOKING_ATTEMPT",
                actor_id=current_user["username"],
                resource=f"patient:{target_patient_id}",
                status="DENIED",
                details={"reason": access_check.get("message")}
            )
            raise HTTPException(
                status_code=403,
                detail=access_check.get("message", "Forbidden: You are not authorized to book appointments for this family member.")
            )

        target_patient = sp_repository.get_patient_by_id(target_patient_id)
        if not target_patient:
            raise HTTPException(status_code=404, detail="Target patient profile not found.")
        rel_context = "FAMILY"
        booked_by_relationship = access_check.get("relationship", "Family Guardian")

    # Book via transactional repository
    try:
        appt = sp_repository.book_patient_appointment(
            patient_id=target_patient["id"],
            booked_by_user_id=current_user.get("user_ref_id", current_user["id"]),
            booked_by_name=primary_patient.get("name") or current_user.get("name", "User"),
            booked_by_relationship=booked_by_relationship,
            relationship_context=rel_context,
            hospital_id=req.hospital_id,
            doctor_id=req.doctor_id,
            appointment_date=req.appointment_date,
            appointment_time=req.appointment_time,
            appointment_type=req.appointment_type or "New Consultation",
            department_id=req.department_id,
            slot=req.slot or f"{req.appointment_date} {req.appointment_time}",
            reason=req.reason or "Regular Consultation",
            symptoms_notes=req.symptoms_notes,
            priority=req.priority or "NORMAL"
        )
    except ValueError as val_err:
        raise HTTPException(status_code=409, detail=str(val_err))
    except Exception as e:
        logger.error(f"Failed to book appointment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Appointment booking failed. Please try again.")

    log_security_event(
        "PATIENT_APPOINTMENT_BOOKED",
        actor_id=current_user["username"],
        resource=f"appointment:{appt.get('id')}",
        status="SUCCESS",
        details={
            "patient_id": target_patient["id"],
            "patient_name": target_patient.get("name"),
            "relationship_context": rel_context,
            "doctor_id": req.doctor_id,
            "hospital_id": req.hospital_id,
            "slot": appt.get("slot")
        }
    )

    return success_response(
        data=appt,
        message=f"Appointment confirmed successfully for {target_patient.get('name')} (OH-ID: {target_patient.get('onehealth_id')})!",
        status_code=status.HTTP_201_CREATED
    )

@router.get("/me/appointments")
def list_my_appointments(
    hospital_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    all_family: bool = Query(False, description="If true, returns appointments across all authorized family members"),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns scheduled and past appointments for the active patient context
    or aggregated across all authorized family members with clear patient identity badges.
    """
    primary_patient = _resolve_authenticated_patient(current_user)

    if all_family:
        # Get appointments for primary + all authorized family members
        family_members = sp_repository.list_family_members(primary_patient["id"])
        allowed_patient_ids = [primary_patient["id"]]
        for fm in family_members:
            perms = fm.get("permissions") or {}
            if perms.get("view_appointments", False) or perms.get("view_records", False):
                allowed_patient_ids.append(fm["member_patient_id"])

        all_appts = []
        for pid in allowed_patient_ids:
            try:
                p_appts = sp_repository.list_appointments(
                    patient_id=pid,
                    hospital_id=hospital_id,
                    doctor_id=doctor_id,
                    status=status
                )
                all_appts.extend(p_appts)
            except Exception:
                pass
        
        def _get_sort_key(appt: Dict[str, Any]):
            d_str = str(appt.get("appointment_date") or "")
            slot_str = str(appt.get("slot") or "")
            created_str = str(appt.get("created_at") or "")
            if not d_str and len(slot_str) >= 10 and slot_str[:4].isdigit() and slot_str[4] == "-":
                d_str = slot_str[:10]
            if not d_str and len(created_str) >= 10:
                d_str = created_str[:10]
            return (d_str, slot_str, created_str, str(appt.get("id") or ""))

        # Sort chronologically DESC (most recent first)
        all_appts.sort(key=_get_sort_key, reverse=True)
        return success_response(data=all_appts)

    # Single patient context
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_appointments", action_name="VIEW_APPOINTMENTS")
    appts = sp_repository.list_appointments(
        patient_id=patient["id"],
        doctor_id=doctor_id,
        hospital_id=hospital_id,
        status=status
    )
    return success_response(data=appts)

@router.get("/me/appointments/{appointment_id}")
def get_my_appointment_detail(
    appointment_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns full appointment breakdown, clinical department, hospital location,
    and check-in pass token with IDOR protection.
    """
    primary_patient = _resolve_authenticated_patient(current_user)
    appt = sp_repository.get_appointment_by_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    appt_patient_id = appt.get("patient_id")
    # IDOR check: Verify caller is the patient or authorized family member
    if appt_patient_id != primary_patient["id"]:
        access_check = sp_repository.verify_family_access(
            primary_patient_id=primary_patient["id"],
            target_patient_id=appt_patient_id,
            required_permission="view_appointments"
        )
        if not access_check.get("authorized"):
            raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to view this appointment.")

    return success_response(data=appt)

@router.post("/me/appointments/{appointment_id}/reschedule")
def reschedule_my_appointment(
    appointment_id: str,
    req: RescheduleAppointmentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Reschedules an appointment to a new date and time slot.
    Maintains complete audit history of previous schedule, changed by actor, and timestamp.
    """
    primary_patient = _resolve_authenticated_patient(current_user)
    appt = sp_repository.get_appointment_by_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    appt_patient_id = appt.get("patient_id")
    if appt_patient_id != primary_patient["id"]:
        access_check = sp_repository.verify_family_access(
            primary_patient_id=primary_patient["id"],
            target_patient_id=appt_patient_id,
            required_permission="book_appointments"
        )
        if not access_check.get("authorized"):
            raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to reschedule appointments for this family member.")

    try:
        updated = sp_repository.reschedule_appointment(
            appointment_id=appointment_id,
            new_date=req.new_date,
            new_time=req.new_time,
            new_slot=req.new_slot or f"{req.new_date} {req.new_time}",
            changed_by_name=primary_patient.get("name") or current_user.get("name", "Patient"),
            changed_by_id=current_user.get("user_ref_id", current_user["id"])
        )
    except ValueError as val_err:
        raise HTTPException(status_code=409, detail=str(val_err))
    except Exception as e:
        logger.error(f"Failed to reschedule appointment {appointment_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to reschedule appointment.")

    log_security_event(
        "PATIENT_APPOINTMENT_RESCHEDULED",
        actor_id=current_user["username"],
        resource=f"appointment:{appointment_id}",
        status="SUCCESS",
        details={"new_date": req.new_date, "new_time": req.new_time}
    )

    return success_response(data=updated, message="Appointment rescheduled successfully!")

@router.post("/me/appointments/{appointment_id}/cancel")
def cancel_my_appointment(
    appointment_id: str,
    req: CancelAppointmentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Cancels an appointment with reason and stores cancellation audit trail.
    """
    primary_patient = _resolve_authenticated_patient(current_user)
    appt = sp_repository.get_appointment_by_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    appt_patient_id = appt.get("patient_id")
    if appt_patient_id != primary_patient["id"]:
        access_check = sp_repository.verify_family_access(
            primary_patient_id=primary_patient["id"],
            target_patient_id=appt_patient_id,
            required_permission="book_appointments"
        )
        if not access_check.get("authorized"):
            raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to cancel appointments for this family member.")

    try:
        updated = sp_repository.cancel_appointment(
            appointment_id=appointment_id,
            reason=req.reason,
            cancelled_by_name=primary_patient.get("name") or current_user.get("name", "Patient"),
            cancelled_by_id=current_user.get("user_ref_id", current_user["id"])
        )
    except Exception as e:
        logger.error(f"Failed to cancel appointment {appointment_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to cancel appointment.")

    log_security_event(
        "PATIENT_APPOINTMENT_CANCELLED",
        actor_id=current_user["username"],
        resource=f"appointment:{appointment_id}",
        status="SUCCESS",
        details={"reason": req.reason}
    )

    return success_response(data=updated, message="Appointment cancelled successfully.")

@router.get("/me/appointments/{appointment_id}/qr")
def get_appointment_checkin_qr_pass(
    appointment_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns zero-knowledge check-in token for quick reception scan without exposing medical notes.
    """
    primary_patient = _resolve_authenticated_patient(current_user)
    appt = sp_repository.get_appointment_by_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    appt_patient_id = appt.get("patient_id")
    if appt_patient_id != primary_patient["id"]:
        access_check = sp_repository.verify_family_access(
            primary_patient_id=primary_patient["id"],
            target_patient_id=appt_patient_id,
            required_permission="view_appointments"
        )
        if not access_check.get("authorized"):
            raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to view this appointment pass.")

    return success_response(data={
        "appointment_id": appt.get("id"),
        "checkin_token": appt.get("checkin_token"),
        "patient_name": appt.get("patient_name"),
        "onehealth_id": appt.get("onehealth_id"),
        "doctor_name": appt.get("doctor_name"),
        "doctor_specialty": appt.get("doctor_specialty"),
        "hospital_name": appt.get("hospital_name"),
        "hospital_area": appt.get("hospital_area"),
        "appointment_date": str(appt.get("appointment_date")),
        "appointment_time": appt.get("appointment_time"),
        "slot": appt.get("slot"),
        "status": appt.get("status"),
        "token_number": appt.get("token_number")
    })

@router.get("/me/visits")
def list_my_visits(
    hospital_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns full medical visit and consultation history across ALL hospitals
    belonging exclusively to the active patient context.
    """
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_VISITS")
    visits = sp_repository.list_patient_visits(
        patient_id=patient["id"],
        hospital_id=hospital_id,
        doctor_id=doctor_id,
        department=department,
        from_date=from_date,
        to_date=to_date,
        search=search
    )
    return success_response(data=visits)

@router.get("/me/visits/{visit_id}")
def get_my_visit_detail(
    visit_id: str,
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns comprehensive clinical encounter breakdown (vitals, chief complaints,
    prescriptions, lab orders, invoices) with strict IDOR patient ownership validation.
    """
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_VISIT_DETAIL")
    visit = sp_repository.get_patient_visit_detail(patient["id"], visit_id)
    if not visit:
        raise HTTPException(
            status_code=404,
            detail="Medical visit record not found or you are not authorized to view it."
        )
    return success_response(data=visit)

# --------------------------------------------------------------------------
# 3. MEDICAL DOCUMENTS, TIMELINE & VAULT
# --------------------------------------------------------------------------


@router.get("/me/documents")
def list_my_documents(
    category: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("NEWEST"),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns medical documents across all connected hospitals in the active patient's health vault."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_DOCUMENTS")
    docs = sp_repository.list_patient_documents(
        patient["id"],
        category=category,
        hospital_id=hospital_id,
        date_range=date_range,
        from_date=from_date,
        to_date=to_date,
        doctor_id=doctor_id,
        department=department,
        status=status,
        source_type=source_type,
        search=search,
        sort_by=sort_by
    )
    return success_response(data=docs)

@router.get("/me/documents/requests")
def get_my_document_requests(
    status: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Lists document requests sent to the active patient from doctors and healthcare facilities."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_DOCUMENT_REQUESTS")
    requests = sp_repository.list_document_requests(patient_id=patient["id"], status=status)
    return success_response(data=requests)

@router.get("/me/documents/counts")
def get_my_documents_counts(
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns total document counts, connected hospital summary, and category breakdown."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_DOCUMENTS_COUNTS")
    counts = sp_repository.get_patient_document_counts(patient["id"])
    return success_response(data=counts)

@router.get("/me/documents/{document_id}")
def get_my_document_detail(
    document_id: str,
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns high-fidelity medical document detail with full clinical metadata and images."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_DOCUMENT_DETAIL")
    doc = sp_repository.get_patient_document_detail(document_id, patient["id"])
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical document not found or access unauthorized.")
    
    # Audit log
    sp_repository.log_document_audit(doc["id"], patient["id"], current_user.get("id"), "VIEW")
    return success_response(data=doc)

@router.post("/me/documents/upload")
def upload_personal_document(
    payload: Dict[str, Any] = Body(...),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Allows patient to upload a personal health record (clearly marked Source: Uploaded by You)."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="UPLOAD_DOCUMENT")
    
    title = payload.get("title")
    if not title or not title.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document title is required.")
        
    doc = sp_repository.create_patient_uploaded_document(
        patient_id=patient["id"],
        title=title.strip(),
        category=payload.get("category", "OTHER"),
        source_type=payload.get("source_type", "PATIENT_UPLOADED"),
        source_label=payload.get("source_label", "Uploaded by You"),
        uploaded_by=current_user.get("id") or patient["id"],
        file_type=payload.get("file_type", "PDF"),
        file_size_kb=payload.get("file_size_kb", 250),
        document_date=payload.get("document_date"),
        notes=payload.get("notes"),
        tags=payload.get("tags"),
        hospital_id=payload.get("hospital_id"),
        branch_id=payload.get("branch_id"),
        metadata=payload.get("metadata"),
        related_request_id=payload.get("related_request_id"),
        status="UPLOADED"
    )
    return success_response(data=doc, message="Personal medical document successfully added to health vault.")

@router.post("/me/documents/{document_id}/share")
def create_document_share_link(
    document_id: str,
    payload: Dict[str, Any] = Body(...),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Creates a time-limited secure share token for a medical document."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="SHARE_DOCUMENT")
    recipient_name = payload.get("recipient_name", "Consulting Specialist")
    duration_hours = int(payload.get("duration_hours", 24))
    access_level = payload.get("access_level", "VIEW_ONLY")
    
    try:
        share = sp_repository.create_document_share(
            document_id=document_id,
            patient_id=patient["id"],
            recipient_name=recipient_name,
            duration_hours=duration_hours,
            access_level=access_level
        )
        return success_response(data=share, message="Secure document share link generated successfully.")
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))

@router.get("/me/documents/{document_id}/shares")
def list_document_share_links(
    document_id: str,
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Lists all active and expired share links for a document."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="LIST_DOCUMENT_SHARES")
    shares = sp_repository.list_document_shares(document_id, patient["id"])
    return success_response(data=shares)

@router.delete("/me/document-shares/{share_id}")
@router.delete("/me/document-shares/{share_id}/revoke")
@router.post("/me/document-shares/{share_id}/revoke")
def revoke_document_share_link(
    share_id: str,
    reason: Optional[str] = Query("Revoked by patient"),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Revokes an active share link immediately."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="REVOKE_DOCUMENT_SHARE")
    revoked = sp_repository.revoke_document_share(share_id, patient["id"], reason=reason)
    if not revoked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found or already revoked.")
    return success_response(data={"share_id": share_id, "revoked": True}, message="Share link access revoked successfully.")

@router.post("/me/documents/{document_id}/audit")
def log_document_audit_event(
    document_id: str,
    payload: Dict[str, Any] = Body(...),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Records an audit trail event for print or download."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="AUDIT_DOCUMENT")
    action = payload.get("action", "VIEW").upper()
    sp_repository.log_document_audit(document_id, patient["id"], current_user.get("id"), action)
    return success_response(data={"logged": True})

@router.get("/me/diagnoses")
def list_my_diagnoses_and_procedures(
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns list of diagnosed conditions and procedures for the active patient context."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_DIAGNOSES")
    data = sp_repository.list_patient_diagnoses(patient["id"])
    return success_response(data=data)

# --------------------------------------------------------------------------
# 4. BILLS, PAYMENTS, INSURANCE, CONSENT, ABHA & DPDP PRIVACY
# --------------------------------------------------------------------------

class AbhaLinkRequest(BaseModel):
    abha_address: str
    abha_number: Optional[str] = "91-4421-9982-1044"
    auth_method: Optional[str] = "AADHAAR_OTP"

class ConsentActionRequest(BaseModel):
    digital_signature: Optional[str] = None
    reason: Optional[str] = None

class PatientGrievanceRequest(BaseModel):
    hospital_id: Optional[str] = "hosp-kedar"
    grievance_type: str
    description: str

@router.get("/me/bills")
def list_my_bills(
    hospital_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns financial invoices and payment receipts for the active patient context ONLY."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_bills", action_name="VIEW_BILLS")
    bills = sp_repository.list_patient_bills(patient["id"], hospital_id=hospital_id, status=status)
    return success_response(data=bills)

@router.get("/me/insurance")
def list_my_insurance_policies(
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns health insurance policies linked to the active patient context."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_INSURANCE")
    insurances = sp_repository.list_patient_insurances(patient["id"])
    return success_response(data=insurances)

@router.get("/me/abha")
def get_my_abha_profile(
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns patient's ABDM ABHA Digital Health profile and verification state."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_ABHA")
    abha = sp_repository.get_patient_abha_profile(patient["id"])
    return success_response(data=abha)

@router.post("/me/abha/link")
def link_my_abha(
    req: AbhaLinkRequest,
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Links patient's ABHA address and number with OTP demographic verification."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="manage_profile", action_name="LINK_ABHA")
    result = sp_repository.link_patient_abha(patient["id"], req.model_dump())
    log_security_event("ABHA_LINKED", actor_id=current_user["username"], resource=f"patient:{patient['id']}", status="SUCCESS")
    return success_response(data=result, message="ABHA ID successfully linked to OH-ID record.")

@router.post("/me/abha/unlink")
def unlink_my_abha(
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Unlinks patient's ABHA ID and revokes ABDM network sharing authorization."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="manage_profile", action_name="UNLINK_ABHA")
    result = sp_repository.unlink_patient_abha(patient["id"])
    log_security_event("ABHA_UNLINKED", actor_id=current_user["username"], resource=f"patient:{patient['id']}", status="SUCCESS")
    return success_response(data=result, message="ABHA ID successfully unlinked.")

@router.get("/me/consents")
@router.get("/me/consent")
def list_my_consents(
    status: Optional[str] = Query("ALL"),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns ABDM electronic health record consent artifacts and pending requests."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_CONSENT")
    consents = sp_repository.list_patient_consent_artifacts(patient["id"], status)
    return success_response(data=consents)

@router.post("/me/consents/{consent_id}/grant")
def grant_my_consent(
    consent_id: str,
    req: Optional[ConsentActionRequest] = Body(None),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Approves and signs an electronic consent request from a hospital/doctor."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="manage_profile", action_name="GRANT_CONSENT")
    sig = req.digital_signature if req else None
    result = sp_repository.update_consent_status(consent_id, patient["id"], action="GRANT", signature=sig)
    log_security_event("CONSENT_GRANTED", actor_id=current_user["username"], resource=f"consent:{consent_id}", status="SUCCESS")
    return success_response(data=result, message="Consent successfully granted.")

@router.post("/me/consents/{consent_id}/deny")
def deny_my_consent(
    consent_id: str,
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Rejects an incoming electronic consent request."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="manage_profile", action_name="DENY_CONSENT")
    result = sp_repository.update_consent_status(consent_id, patient["id"], action="DENY")
    log_security_event("CONSENT_DENIED", actor_id=current_user["username"], resource=f"consent:{consent_id}", status="SUCCESS")
    return success_response(data=result, message="Consent request rejected.")

@router.post("/me/consents/{consent_id}/revoke")
@router.post("/me/consent/{consent_id}/revoke")
def revoke_my_consent(
    consent_id: str,
    req: Optional[ConsentActionRequest] = Body(None),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Revokes an active health record sharing authorization immediately."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="manage_profile", action_name="REVOKE_CONSENT")
    reason = req.reason if req else "Patient explicitly revoked consent"
    result = sp_repository.update_consent_status(consent_id, patient["id"], action="REVOKE", reason=reason)
    log_security_event("CONSENT_REVOKED", actor_id=current_user["username"], resource=f"consent:{consent_id}", status="SUCCESS")
    return success_response(data=result, message="Consent authorization successfully revoked.")

@router.get("/me/privacy/grievances")
def list_my_privacy_grievances(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """List privacy and data correction grievances lodged by this patient."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_GRIEVANCE")
    all_g = sp_repository.list_privacy_grievances(hospital_id=hospital_id)
    patient_g = [g for g in all_g if g.get("patient_id") == patient["id"]]
    return success_response(data=patient_g)

@router.post("/me/privacy/grievances")
def lodge_privacy_grievance(
    req: PatientGrievanceRequest,
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Lodges a statutory privacy grievance or data correction request under DPDP Act."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="manage_profile", action_name="LODGE_GRIEVANCE")
    payload = req.model_dump()
    payload["patient_id"] = patient["id"]
    payload["patient_name"] = patient.get("name", "Patient")
    payload["patient_mobile"] = patient.get("phone", "+91 98401 00000")
    result = sp_repository.create_privacy_grievance(payload)
    log_security_event("GRIEVANCE_LODGED", actor_id=current_user["username"], resource=f"patient:{patient['id']}", status="SUCCESS")
    return success_response(data=result, message="Grievance ticket successfully registered with Hospital Data Protection Officer.")

@router.get("/me/notifications")
def list_my_notifications(
    unread_only: bool = Query(False),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns patient-specific notifications and alerts."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="receive_notifications", action_name="VIEW_NOTIFICATIONS")
    notifs = sp_repository.list_patient_notifications(
        patient_id=patient["id"],
        user_id=current_user.get("user_ref_id"),
        unread_only=unread_only
    )
    return success_response(data=notifs)

@router.patch("/me/notifications/{notification_id}/read")
def mark_my_notification_read(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Marks a patient notification as read."""
    patient = _resolve_authenticated_patient(current_user)
    success = sp_repository.mark_notification_as_read(
        notification_id=notification_id,
        user_id=current_user.get("user_ref_id", ""),
        patient_id=patient["id"]
    )
    return success_response(message="Notification marked as read.")

# --------------------------------------------------------------------------
# 5. MULTI-HOSPITAL DIRECTORIES & COMPREHENSIVE TIMELINE
# --------------------------------------------------------------------------

@router.get("/me/doctors")
def list_my_visited_doctors(
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns directory of doctors consulted by the active patient across all healthcare providers."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_DOCTORS")
    docs = sp_repository.list_patient_visited_doctors(patient["id"])
    return success_response(data=docs)

@router.get("/me/hospitals")
def get_my_hospitals(
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    For PATIENT: Returns list of all network hospitals where the active patient has records.
    For DOCTOR: Returns list of hospitals the clinician is authorized to practice at.
    """
    role = current_user.get("role", "PATIENT")
    if role == "PATIENT":
        patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_HOSPITALS")
        hosps = sp_repository.list_patient_visited_hospitals(patient["id"])
        return success_response(data=hosps)

    # Doctor multi-hospital membership logic
    user_ref_id = current_user["user_ref_id"]
    current_hosp_id = current_user.get("hospital_ref_id")
    raw_hospitals = sp_repository.list_user_hospitals(user_ref_id)

    items = []
    for h in raw_hospitals:
        hosp_id = h.get("hospital_ref_id")
        branch_id = h.get("branch_ref_id")
        items.append({
            "hospital_id": hosp_id,
            "hospital_ref_id": hosp_id,
            "hospital_name": h.get("hospital_name", "Hospital"),
            "hospital_code": h.get("hospital_code"),
            "hospital_city": h.get("hospital_city"),
            "branch_id": branch_id,
            "branch_ref_id": branch_id,
            "branch_name": h.get("branch_name"),
            "department_id": h.get("department_id"),
            "department_name": h.get("department_name"),
            "is_current": (hosp_id == current_hosp_id),
            "is_primary": bool(h.get("is_primary", False))
        })
    return items

@router.get("/me/oh-id")
def get_my_ohid_card(
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns official personal OneHealth ID card metadata, Zero-Knowledge QR token,
    verification status, and all connected healthcare facility relationships.
    """
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_OHID_CARD")
    memberships = sp_repository.list_patient_facility_memberships(patient["id"])
    return success_response(data={
        "onehealth_id": patient.get("onehealth_id"),
        "qr_token": patient.get("qr_token"),
        "name": patient.get("name"),
        "dob": patient.get("dob") or f"{2026 - (patient.get('age') or 30)}-01-01",
        "gender": patient.get("gender"),
        "blood_group": patient.get("blood_group"),
        "emergency_contact": patient.get("emergency_contact"),
        "verification_status": "VERIFIED_ACTIVE",
        "connected_facilities": memberships,
        "facilities_count": len(memberships)
    })

@router.get("/me/health-timeline")
@router.get("/me/timeline")
def get_my_comprehensive_health_timeline(
    type: Optional[str] = Query(None, description="Event type filter: CONSULTATION, PRESCRIPTION, LAB_REPORT, INVESTIGATION, DOCUMENT, REFERRAL, VISIT"),
    hospital_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Authoritative Unified Health Timeline:
    Aggregates structured multi-provider clinical events (Doctor Consultations, Prescriptions,
    Lab Reports, Investigations, Documents, Referrals, Visits) in reverse chronological order.
    """
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_HEALTH_TIMELINE")
    event_types = [type.strip().upper()] if type and type.strip() else None

    events = sp_repository.get_unified_health_timeline(
        patient_id=patient["id"],
        event_types=event_types,
        hospital_id=hospital_id,
        from_date=from_date,
        to_date=to_date,
        search=search,
        limit=limit,
        offset=offset
    )
    total_count = sp_repository.count_health_timeline_events(
        patient_id=patient["id"],
        event_types=event_types,
        hospital_id=hospital_id
    )

    return success_response(
        data=events,
        meta={
            "patient_id": patient["id"],
            "onehealth_id": patient.get("onehealth_id"),
            "total_events": total_count,
            "limit": limit,
            "offset": offset,
            "filters": {
                "type": type,
                "hospital_id": hospital_id,
                "from_date": from_date,
                "to_date": to_date,
                "search": search
            }
        }
    )

@router.get("/me/consultations")
def list_my_consultations(
    hospital_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns digital clinical consultations for the active patient."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_CONSULTATIONS")
    visits = sp_repository.list_patient_visits(patient_id=patient["id"], hospital_id=hospital_id, doctor_id=doctor_id)
    return success_response(data=visits)

@router.get("/me/investigations")
def list_my_investigations(
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns ordered laboratory and diagnostic investigations for the active patient."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_INVESTIGATIONS")
    invs = sp_repository.get_patient_investigations(patient["id"])
    return success_response(data=invs)

@router.get("/me/referrals")
def list_my_referrals(
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns specialist referrals for the active patient."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_REFERRALS")
    referrals = sp_repository.get_patient_referrals(patient["id"])
    return success_response(data=referrals)

@router.get("/me/qr")
def get_my_qr_pass(
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns zero-knowledge QR token and OneHealth ID for active patient context."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="view_records", action_name="VIEW_QR")
    return success_response(data={
        "onehealth_id": patient.get("onehealth_id"),
        "qr_token": patient.get("qr_token"),
        "name": patient.get("name"),
        "dob": patient.get("dob") or f"{2026 - (patient.get('age') or 30)}-01-01",
        "gender": patient.get("gender"),
        "blood_group": patient.get("blood_group")
    })

@router.post("/me/qr/rotate")
def rotate_my_qr_pass(
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Rotates patient's Zero-Knowledge QR token."""
    patient = _resolve_target_patient(current_user, patient_id, required_permission="manage_profile", action_name="ROTATE_QR")
    updated = sp_repository.rotate_patient_qr(patient["id"], actor_id=current_user["username"])
    log_security_event("PATIENT_QR_ROTATED", actor_id=current_user["username"], resource=f"patient:{patient['id']}", status="SUCCESS")
    return success_response(data=updated, message="Zero-Knowledge QR pass rotated successfully.")

# --------------------------------------------------------------------------
# PATIENT WORKSPACE: MY PRESCRIPTIONS ENDPOINTS
# --------------------------------------------------------------------------

@router.get("/me/prescriptions")
def get_my_prescriptions(
    status: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    prescription_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    limit: int = Query(100),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns filtered prescriptions for the authenticated patient or authorized family member.
    Authoritatively calculates real-time computed status (ACTIVE, EXPIRED, SUPERSEDED, etc.).
    """
    target_patient = _resolve_target_patient(
        current_user,
        requested_patient_id=patient_id,
        required_permission="view_prescriptions",
        action_name="VIEW_PRESCRIPTIONS_LIST"
    )

    prescriptions = sp_repository.list_patient_prescriptions(
        patient_id=target_patient["id"],
        status=status,
        hospital_id=hospital_id,
        doctor_id=doctor_id,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        prescription_type=prescription_type,
        search=search,
        limit=limit
    )

    return success_response(
        data=prescriptions,
        meta={
            "patient_id": target_patient["id"],
            "patient_name": target_patient.get("name"),
            "total_count": len(prescriptions),
            "filters_applied": {
                "status": status,
                "hospital_id": hospital_id,
                "doctor_id": doctor_id,
                "date_range": date_range,
                "prescription_type": prescription_type,
                "search": search
            }
        }
    )

@router.get("/me/prescriptions/{prescription_id}")
def get_my_prescription_detail(
    prescription_id: str,
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns complete canonical digital prescription document.
    Enforces patient ownership and family authorization check.
    """
    primary_patient = _resolve_authenticated_patient(current_user)
    rx = sp_repository.get_patient_prescription_detail(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription record not found.")

    rx_patient_id = rx.get("patient_id")
    if rx_patient_id != primary_patient["id"]:
        access_check = sp_repository.verify_family_access(
            primary_patient_id=primary_patient["id"],
            target_patient_id=rx_patient_id,
            required_permission="view_prescriptions"
        )
        if not access_check.get("authorized"):
            log_security_event(
                "UNAUTHORIZED_PRESCRIPTION_ACCESS_ATTEMPT",
                actor_id=current_user["username"],
                resource=f"prescription:{prescription_id}",
                status="DENIED",
                details={"target_patient_id": rx_patient_id}
            )
            raise HTTPException(
                status_code=403,
                detail="Forbidden: You are not authorized to view this prescription."
            )
        # Log family access audit
        sp_repository.log_family_access(
            actor_user_id=current_user.get("user_ref_id", current_user["id"]),
            actor_patient_id=primary_patient["id"],
            target_patient_id=rx_patient_id,
            relationship=access_check.get("relationship", "FAMILY"),
            action="VIEW_PRESCRIPTION_DETAIL",
            authorization_basis=access_check.get("basis", "ACTIVE_FAMILY_CONSENT")
        )

    # Log prescription audit
    sp_repository.log_prescription_audit(
        prescription_id=prescription_id,
        patient_id=rx_patient_id,
        user_id=current_user.get("user_ref_id", current_user["id"]),
        action="VIEW",
        hospital_id=rx.get("hospital_id")
    )

    return success_response(data=rx)

@router.get("/me/prescriptions/{prescription_id}/pdf")
def get_my_prescription_pdf_download(
    prescription_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns PDF document payload and logs download audit event.
    """
    primary_patient = _resolve_authenticated_patient(current_user)
    rx = sp_repository.get_patient_prescription_detail(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription record not found.")

    rx_patient_id = rx.get("patient_id")
    if rx_patient_id != primary_patient["id"]:
        access_check = sp_repository.verify_family_access(
            primary_patient_id=primary_patient["id"],
            target_patient_id=rx_patient_id,
            required_permission="view_prescriptions"
        )
        if not access_check.get("authorized"):
            raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to download this prescription.")

    # Log PDF download audit
    sp_repository.log_prescription_audit(
        prescription_id=prescription_id,
        patient_id=rx_patient_id,
        user_id=current_user.get("user_ref_id", current_user["id"]),
        action="DOWNLOAD_PDF",
        hospital_id=rx.get("hospital_id")
    )

    patient_clean_name = (rx.get("patient_name") or "Patient").replace(" ", "_")
    filename = f"Prescription_{rx['id']}_{patient_clean_name}.pdf"

    return success_response(
        data={
            "prescription_id": rx["id"],
            "filename": filename,
            "download_url": f"/api/v1/me/prescriptions/{prescription_id}/pdf",
            "prescription": rx
        },
        message="PDF download metadata generated successfully."
    )

@router.post("/me/prescriptions/{prescription_id}/share")
def create_my_prescription_share(
    prescription_id: str,
    req: CreatePrescriptionShareRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Creates a time-limited, revokable secure share link for a prescription.
    """
    primary_patient = _resolve_authenticated_patient(current_user)
    rx = sp_repository.get_patient_prescription_detail(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found.")

    rx_patient_id = rx.get("patient_id")
    if rx_patient_id != primary_patient["id"]:
        access_check = sp_repository.verify_family_access(
            primary_patient_id=primary_patient["id"],
            target_patient_id=rx_patient_id,
            required_permission="manage_consent"
        )
        if not access_check.get("authorized"):
            raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to share records for this family member.")

    share_record = sp_repository.create_prescription_share(
        prescription_id=prescription_id,
        patient_id=rx_patient_id,
        created_by_user_id=current_user.get("user_ref_id", current_user["id"]),
        recipient_name=req.recipient_name,
        recipient_contact=req.recipient_contact,
        access_level=req.access_level or "VIEW_ONLY",
        duration_hours=req.duration_hours or 24
    )

    return success_response(data=share_record, message="Secure prescription share link created successfully.")

@router.get("/me/prescriptions/{prescription_id}/shares")
def list_my_prescription_shares(
    prescription_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Lists all active and revoked share links for a prescription."""
    primary_patient = _resolve_authenticated_patient(current_user)
    rx = sp_repository.get_patient_prescription_detail(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found.")

    rx_patient_id = rx.get("patient_id")
    if rx_patient_id != primary_patient["id"]:
        access_check = sp_repository.verify_family_access(
            primary_patient_id=primary_patient["id"],
            target_patient_id=rx_patient_id,
            required_permission="manage_consent"
        )
        if not access_check.get("authorized"):
            raise HTTPException(status_code=403, detail="Forbidden.")

    shares = sp_repository.list_prescription_shares(prescription_id, rx_patient_id)
    return success_response(data=shares)

@router.delete("/me/prescription-shares/{share_id}")
def revoke_my_prescription_share(
    share_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Revokes a previously created prescription share link."""
    primary_patient = _resolve_authenticated_patient(current_user)
    try:
        revoked = sp_repository.revoke_prescription_share(
            share_id=share_id,
            patient_id=primary_patient["id"],
            revoked_by_user_id=current_user.get("user_ref_id", current_user["id"])
        )
        return success_response(data=revoked, message="Prescription share link revoked successfully.")
    except Exception as e:
        logger.error(f"Failed to revoke share link {share_id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/me/prescriptions/{prescription_id}/audit")
def record_prescription_client_audit(
    prescription_id: str,
    req: PrescriptionAuditRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Records client-side prescription interactions like PRINT or SHARE."""
    primary_patient = _resolve_authenticated_patient(current_user)
    sp_repository.log_prescription_audit(
        prescription_id=prescription_id,
        patient_id=primary_patient["id"],
        user_id=current_user.get("user_ref_id", current_user["id"]),
        action=req.action,
        details=req.details
    )
    return success_response(message="Audit event recorded.")

# --------------------------------------------------------------------------
# PATIENT WORKSPACE: MY LAB REPORTS ENDPOINTS
# --------------------------------------------------------------------------

@router.get("/me/lab-reports")
def get_my_lab_reports(
    status: Optional[str] = Query(None),
    test_type: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    is_abnormal: Optional[bool] = Query(None),
    patient_id: Optional[str] = Query(None),
    limit: int = Query(100),
    offset: int = Query(0),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns filtered diagnostic laboratory reports for authenticated patient or authorized family member.
    """
    target_patient = _resolve_target_patient(
        current_user,
        requested_patient_id=patient_id,
        required_permission="view_lab_reports",
        action_name="VIEW_LAB_REPORTS_LIST"
    )

    reports = sp_repository.list_patient_lab_reports(
        patient_id=target_patient["id"],
        status=status,
        test_type=test_type,
        hospital_id=hospital_id,
        search=search,
        is_abnormal=is_abnormal,
        limit=limit,
        offset=offset
    )

    return success_response(
        data=reports,
        meta={
            "patient_id": target_patient["id"],
            "patient_name": target_patient.get("name"),
            "total_count": len(reports),
            "filters_applied": {
                "status": status,
                "test_type": test_type,
                "hospital_id": hospital_id,
                "search": search,
                "is_abnormal": is_abnormal
            }
        }
    )

@router.get("/me/lab-reports/trends")
def get_my_lab_parameter_trends(
    parameter_name: str = Query(..., description="Test parameter name e.g. Hemoglobin, Glucose, HbA1c"),
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns chronological historical values for a recurring diagnostic parameter across multiple visits/labs.
    """
    target_patient = _resolve_target_patient(
        current_user,
        requested_patient_id=patient_id,
        required_permission="view_lab_reports",
        action_name="VIEW_LAB_PARAMETER_TRENDS"
    )

    trends = sp_repository.get_lab_parameter_trends(
        patient_id=target_patient["id"],
        parameter_name=parameter_name
    )

    return success_response(
        data=trends,
        meta={
            "patient_id": target_patient["id"],
            "parameter_name": parameter_name,
            "data_points_count": len(trends)
        }
    )

@router.get("/me/lab-reports/{report_id}")
def get_my_lab_report_detail(
    report_id: str,
    patient_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Retrieves full 3-layer diagnostic laboratory report.
    Enforces patient ownership and family authorization check.
    """
    primary_patient = _resolve_authenticated_patient(current_user)
    report = sp_repository.get_patient_lab_report_detail(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Laboratory report record not found.")

    rep_patient_id = report.get("patient_id")
    if rep_patient_id != primary_patient["id"]:
        access_check = sp_repository.verify_family_access(
            primary_patient_id=primary_patient["id"],
            target_patient_id=rep_patient_id,
            required_permission="view_lab_reports"
        )
        if not access_check.get("authorized"):
            log_security_event(
                "UNAUTHORIZED_LAB_REPORT_ACCESS_ATTEMPT",
                actor_id=current_user["username"],
                resource=f"lab_report:{report_id}",
                status="DENIED",
                details={"target_patient_id": rep_patient_id}
            )
            raise HTTPException(
                status_code=403,
                detail="Forbidden: You are not authorized to view this laboratory report."
            )
        # Log family access audit
        sp_repository.log_family_access(
            actor_user_id=current_user.get("user_ref_id", current_user["id"]),
            actor_patient_id=primary_patient["id"],
            target_patient_id=rep_patient_id,
            relationship=access_check.get("relationship", "FAMILY"),
            action="VIEW_LAB_REPORT_DETAIL",
            authorization_basis=access_check.get("basis", "ACTIVE_FAMILY_CONSENT")
        )

    # Log lab report audit
    sp_repository.log_lab_report_audit(
        report_id=report_id,
        patient_id=rep_patient_id,
        user_id=current_user.get("user_ref_id", current_user["id"]),
        action="VIEW",
        hospital_id=report.get("hospital_id")
    )

    return success_response(data=report)

@router.get("/me/lab-reports/{report_id}/pdf")
def get_my_lab_report_pdf_download(
    report_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns original PDF document metadata and logs audit download event.
    """
    primary_patient = _resolve_authenticated_patient(current_user)
    report = sp_repository.get_patient_lab_report_detail(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Laboratory report record not found.")

    rep_patient_id = report.get("patient_id")
    if rep_patient_id != primary_patient["id"]:
        access_check = sp_repository.verify_family_access(
            primary_patient_id=primary_patient["id"],
            target_patient_id=rep_patient_id,
            required_permission="view_lab_reports"
        )
        if not access_check.get("authorized"):
            raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to download this report.")

    # Log PDF download audit
    sp_repository.log_lab_report_audit(
        report_id=report_id,
        patient_id=rep_patient_id,
        user_id=current_user.get("user_ref_id", current_user["id"]),
        action="DOWNLOAD_PDF",
        hospital_id=report.get("hospital_id")
    )

    patient_clean_name = (report.get("patient_name") or "Patient").replace(" ", "_")
    test_clean_name = (report.get("test_name") or "LabReport").replace(" ", "_")
    filename = f"LabReport_{report['id']}_{test_clean_name}_{patient_clean_name}.pdf"

    return success_response(
        data={
            "report_id": report["id"],
            "filename": filename,
            "download_url": report.get("attachment_url") or f"/api/v1/me/lab-reports/{report_id}/pdf",
            "report": report
        },
        message="Laboratory report PDF metadata generated successfully."
    )

@router.post("/me/lab-reports/{report_id}/share")
def create_my_lab_report_share(
    report_id: str,
    req: CreateLabReportShareRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Creates time-limited, revokable secure share link for diagnostic lab report.
    """
    primary_patient = _resolve_authenticated_patient(current_user)
    report = sp_repository.get_patient_lab_report_detail(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Laboratory report record not found.")

    rep_patient_id = report.get("patient_id")
    if rep_patient_id != primary_patient["id"]:
        access_check = sp_repository.verify_family_access(
            primary_patient_id=primary_patient["id"],
            target_patient_id=rep_patient_id,
            required_permission="view_lab_reports"
        )
        if not access_check.get("authorized"):
            raise HTTPException(status_code=403, detail="Forbidden: You cannot share this family member's lab report without authorized permissions.")

    share = sp_repository.create_lab_report_share(
        report_id=report_id,
        patient_id=rep_patient_id,
        created_by_user_id=current_user.get("user_ref_id", current_user["id"]),
        recipient_name=req.recipient_name or "Consulting Doctor / Specialist",
        recipient_contact=req.recipient_contact,
        access_level=req.access_level or "VIEW_ONLY",
        duration_hours=req.duration_hours or 24
    )

    return success_response(
        data=share,
        message="Secure laboratory report share link generated successfully."
    )

@router.get("/me/lab-reports/{report_id}/shares")
def list_my_lab_report_shares(
    report_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Lists active and revoked share links for a laboratory report.
    """
    primary_patient = _resolve_authenticated_patient(current_user)
    report = sp_repository.get_patient_lab_report_detail(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Laboratory report record not found.")

    rep_patient_id = report.get("patient_id")
    if rep_patient_id != primary_patient["id"]:
        access_check = sp_repository.verify_family_access(
            primary_patient_id=primary_patient["id"],
            target_patient_id=rep_patient_id,
            required_permission="view_lab_reports"
        )
        if not access_check.get("authorized"):
            raise HTTPException(status_code=403, detail="Forbidden: Unauthorized access to report share history.")

    shares = sp_repository.list_lab_report_shares(report_id=report_id, patient_id=rep_patient_id)
    return success_response(data=shares)

@router.post("/me/lab-report-shares/{share_id}/revoke")
def revoke_my_lab_report_share(
    share_id: str,
    req: Optional[LabReportAuditRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Instantly revokes a shared laboratory report link.
    """
    primary_patient = _resolve_authenticated_patient(current_user)
    try:
        revoked = sp_repository.revoke_lab_report_share(
            share_id=share_id,
            patient_id=primary_patient["id"],
            revoked_by_user_id=current_user.get("user_ref_id", current_user["id"]),
            reason=req.details.get("reason") if (req and req.details) else None
        )
        return success_response(data=revoked, message="Laboratory report share link revoked successfully.")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to revoke lab share link {share_id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/me/lab-reports/{report_id}/audit")
def record_lab_report_client_audit(
    report_id: str,
    req: LabReportAuditRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Records client-side laboratory report interactions like PRINT, VIEW_ORIGINAL, or EXPLAINER_OPEN."""
    primary_patient = _resolve_authenticated_patient(current_user)
    sp_repository.log_lab_report_audit(
        report_id=report_id,
        patient_id=primary_patient["id"],
        user_id=current_user.get("user_ref_id", current_user["id"]),
        action=req.action,
        details=req.metadata or req.details
    )
    return success_response(message="Lab report audit event recorded.")

@router.post("/me/hospital-context")
def switch_hospital_context(
    req: HospitalContextSwitchRequest,
    response: Response,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Doctor multi-hospital context switcher."""
    user_ref_id = current_user["user_ref_id"]
    authorized_hospitals = sp_repository.list_user_hospitals(user_ref_id)

    target_match = None
    for h in authorized_hospitals:
        if h.get("hospital_ref_id") == req.hospital_id:
            target_match = h
            break

    if not target_match:
        log_security_event(
            "UNAUTHORIZED_HOSPITAL_CONTEXT_SWITCH",
            actor_id=current_user["username"],
            resource=f"hospital:{req.hospital_id}",
            status="DENIED",
            details={"requested_hospital": req.hospital_id}
        )
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You are not authorized to access this hospital facility."
        )

    # Invalidate prior token context to prevent old hospital token replay
    prior_jti = current_user.get("jti") or current_user.get("token_jti")
    if prior_jti:
        from backend.app.core.session_manager import session_manager
        session_manager.revoke_token(prior_jti, user_id=user_ref_id, reason="hospital_context_switch")

    role = current_user.get("role", "DOCTOR")
    usertype_ref_id = current_user.get("usertype_ref_id", "role-doctor")
    token = create_access_token({
        "sub": current_user["username"],
        "uid": user_ref_id,
        "role": role,
        "usertype_ref_id": usertype_ref_id,
        "hospital_id": req.hospital_id,
        "hospital_ref_id": req.hospital_id,
        "branch_id": req.branch_id or target_match.get("branch_ref_id")
    })

    is_production = settings.ENVIRONMENT in ("production", "staging")
    response.set_cookie(
        key="oh_access_token",
        value=token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=86400,
        path="/"
    )

    is_browser_cookie_client = (
        request.headers.get("x-requested-with") == "XMLHttpRequest"
        or request.headers.get("x-session-mode") == "cookie"
    )
    returned_token = None if is_browser_cookie_client else token

    return {
        "success": True,
        "access_token": returned_token,
        "token_type": "bearer",
        "hospital_id": req.hospital_id,
        "hospital_ref_id": req.hospital_id,
        "active_hospital_id": req.hospital_id,
        "active_hospital_name": target_match.get("hospital_name"),
        "hospital_name": target_match.get("hospital_name"),
        "branch_name": target_match.get("branch_name"),
        "message": f"Switched to {target_match.get('hospital_name')}"
    }
