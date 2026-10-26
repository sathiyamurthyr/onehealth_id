from fastapi import APIRouter, HTTPException, Query, status, Depends
from typing import List, Optional, Dict, Any
from uuid import uuid4
from pydantic import BaseModel, Field
from backend.app.schemas.models import (
    PatientCreate, PatientResponse, PatientUpdate,
    DuplicateCheckRequest, DuplicateCheckResponse,
    QRTokenResolveRequest, QRWorkflowScanRequest, QRWorkflowScanResponse,
    QRHospitalRegisterRequest, QRAppointmentCheckInRequest, QRIssueTokenRequest
)
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.response import success_response, error_response
from backend.app.core.rbac import (
    get_current_user_context,
    get_optional_user_context,
    require_any_permission,
    require_permission,
    validate_hospital_tenant_scope,
)
from backend.app.core.logging import logger, log_security_event
from backend.app.services.privacy.pii_masking import pii_masker
from backend.app.services.crypto.envelope_encryption import envelope_crypto

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.get("", response_model=List[PatientResponse])
@router.get("/", response_model=List[PatientResponse], include_in_schema=False)
def list_patients(
    search: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: Dict[str, Any] = Depends(require_any_permission("patient.read", "patient.self.read")),
):
    """
    Returns patients visible to the authenticated user.
    Non-platform users are automatically scoped to their own hospital.
    Unauthenticated requests receive 401.
    """
    user_perms = user.get("permissions", [])
    user_hospital = user.get("hospital_ref_id") or user.get("hospital_id")

    # Patient role: only allowed to see self — redirect to personal endpoint
    if "patient.self.read" in user_perms and "patient.read" not in user_perms and "system.manage" not in user_perms:
        return []

    # Enforce hospital scope: non-platform users can only see their own hospital's patients
    if "system.manage" not in user_perms and "organization.read" not in user_perms:
        effective_hospital_id = user_hospital
    else:
        effective_hospital_id = hospital_id

    try:
        db_patients = sp_repository.list_patients(
            search=search,
            hospital_id=effective_hospital_id,
            branch_id=branch_id,
            limit=limit,
            offset=offset
        )
        # Apply backend-enforced PII masking by default on directory, search & list views
        is_clinician = any(p in user_perms for p in ("consultation.create", "clinical.write"))
        masked_patients = pii_masker.mask_patient_list(db_patients, preserve_clinical_details=is_clinician)
        return masked_patients
    except Exception as e:
        logger.error("Failed to fetch patients list: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch patients list.")

@router.post("/check-duplicate", response_model=DuplicateCheckResponse)
@router.post("/check-duplicates", response_model=DuplicateCheckResponse, include_in_schema=False)
def check_duplicate(
    payload: DuplicateCheckRequest,
    user: Dict[str, Any] = Depends(require_any_permission("patient.create", "patient.read")),
):
    """
    Search for potential matching patient records before registering a new patient.
    Requires patient.create or patient.read permission.
    Returns masked PII by default to prevent patient existence enumeration.
    """
    matches = sp_repository.check_duplicate_patient(
        phone=payload.phone,
        email=payload.email,
        identity_number=payload.identity_number,
        name=payload.name,
        age=payload.age,
        hospital_id=payload.hospital_id
    )
    masked_matches = pii_masker.mask_patient_list(matches, preserve_clinical_details=False)
    return DuplicateCheckResponse(
        duplicate_found=len(matches) > 0,
        matches=[PatientResponse(**m) for m in masked_matches]
    )

@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_patient(
    payload: PatientCreate,
    user: Dict[str, Any] = Depends(require_permission("patient.create")),
):
    """
    Registers a new patient via sp_register_patient stored procedure.
    Requires patient.create permission.
    """
    assigned_id = payload.id or f"p-{str(uuid4())[:8]}"
    
    try:
        registered = sp_repository.register_patient(
            name=payload.name,
            age=payload.age,
            diagnosis=payload.diagnosis,
            gender=payload.gender or "Unspecified",
            phone=payload.phone,
            email=payload.email,
            address=payload.address,
            emergency_contact=payload.emergency_contact,
            blood_group=payload.blood_group,
            identity_type=payload.identity_type or "NATIONAL_ID",
            identity_number=payload.identity_number,
            hospital_id=payload.hospital_id or user.get("hospital_ref_id") or "hosp-kedar",
            branch_id=payload.branch_id or "branch-kedar-01",
            patient_id=assigned_id,
            is_demo_data=payload.is_demo_data or False
        )
        if registered:
            log_security_event("PATIENT_REGISTERED", actor_id=user.get("username"), resource=f"patient:{assigned_id}", status="SUCCESS")
            return registered
    except Exception as e:
        logger.error("Patient registration failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Patient registration failed. Please verify input data.")

    raise HTTPException(status_code=500, detail="Failed to register patient")

@router.post("/qr/resolve", response_model=PatientResponse)
def resolve_qr_token(
    payload: QRTokenResolveRequest,
    user: Dict[str, Any] = Depends(require_any_permission("patient.qr.scan", "patient.read")),
):
    """
    Resolves a Zero-Knowledge QR Token into an authorized patient profile
    and logs the access attempt in the audit log.
    """
    patient = sp_repository.resolve_qr_token(payload.qr_token, scanned_by=payload.scanned_by or user.get("username") or "staff")
    if not patient:
        raise HTTPException(status_code=404, detail="OneHealth ID or QR Token could not be verified")
    return patient

@router.get("/verify-qr/{qr_token}", response_model=PatientResponse)
def verify_patient_qr(
    qr_token: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user_context),
):
    """
    QR verification endpoint.
    Authenticated staff receive role-permitted record; unauthenticated scans return masked PII.
    Receptionists never receive sensitive clinical diagnosis.
    """
    patient = sp_repository.resolve_qr_token(qr_token, scanned_by=user.get("username") if user else "kiosk")
    if not patient:
        raise HTTPException(status_code=404, detail="OneHealth ID or QR Token could not be verified")
    
    if not user:
        masked = dict(patient)
        if masked.get("phone") and len(masked["phone"]) > 4:
            masked["phone"] = f"***-***-{masked['phone'][-4:]}"
        masked["address"] = "[Protected demographic]"
        masked["emergency_contact"] = "[Protected]"
        masked["diagnosis"] = "[Protected Health Information - Login Required]"
        return masked

    # Receptionist / non-clinical staff protection
    user_role = (user.get("role") or "").upper()
    user_perms = user.get("permissions", [])
    if user_role in ("RECEPTIONIST", "NURSE", "EMPLOYEE", "BILLING_STAFF") and "clinical.read" not in user_perms:
        masked = dict(patient)
        masked["diagnosis"] = "[Protected Clinical Data - Clinician Access Only]"
        return masked

    return patient

@router.post("/qr/scan-workflow", response_model=QRWorkflowScanResponse)
def scan_qr_workflow(
    payload: QRWorkflowScanRequest,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user_context),
):
    """
    Universal OH-ID QR Workflow Resolution.
    Accepts opaque token, OH-ID, or scan URL. Resolves patient identity,
    evaluates caller permissions & active hospital context, verifies registration,
    and returns role-tailored workflow actions.
    """
    result = sp_repository.resolve_qr_workflow(
        qr_input=payload.qr_input,
        user=user,
        active_hospital_id=payload.hospital_id
    )
    if not result:
        raise HTTPException(status_code=404, detail="OneHealth ID or QR Token could not be verified")
    return result

@router.post("/qr/register-hospital")
def qr_register_hospital(
    payload: QRHospitalRegisterRequest,
    user: Dict[str, Any] = Depends(require_any_permission("patient.create", "patient.update", "patient.register", "reception.manage", "hospital.update")),
):
    """
    Idempotently registers an existing OH-ID patient at the active hospital facility,
    assigning a local UHID without duplicating patient master records.
    """
    effective_hospital = (
        payload.hospital_id
        or user.get("hospital_ref_id")
        or user.get("hospital_id")
        or "hosp-kedar"
    )
    validate_hospital_tenant_scope(user, effective_hospital)

    try:
        membership = sp_repository.register_patient_at_facility(
            patient_id=payload.patient_id,
            hospital_id=effective_hospital,
            local_uhid=payload.local_uhid,
            registered_by=user.get("username") or "reception"
        )
        log_security_event(
            "CROSS_HOSPITAL_PATIENT_REGISTERED",
            actor_id=user.get("username"),
            hospital_id=effective_hospital,
            resource=f"patient:{payload.patient_id}",
            status="SUCCESS"
        )
        return success_response(
            data=membership,
            message="Patient successfully registered at hospital facility."
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error("Facility registration failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to register patient at hospital facility.")

@router.post("/qr/check-in")
def qr_appointment_check_in(
    payload: QRAppointmentCheckInRequest,
    user: Dict[str, Any] = Depends(require_any_permission("appointment.checkin", "appointment.manage", "appointment.update", "patient.qr.scan")),
):
    """
    Checks in an existing appointment via QR scan workflow and assigns OPD token.
    """
    appt = sp_repository.get_appointment_by_id(payload.appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    target_hosp = payload.hospital_id or appt.get("hospital_id")
    if target_hosp:
        validate_hospital_tenant_scope(user, target_hosp)

    actor_id = user.get("user_ref_id") or user.get("id") or user.get("username", "receptionist")
    try:
        check_in_result = sp_repository.check_in_patient_visit(
            appointment_id=payload.appointment_id,
            actor_id=actor_id
        )
        log_security_event(
            "APPOINTMENT_CHECKED_IN",
            actor_id=user.get("username"),
            resource=f"appointment:{payload.appointment_id}",
            status="SUCCESS"
        )
        return success_response(
            data=check_in_result,
            message=f"Patient checked in successfully. Assigned OPD Token #{check_in_result.get('token_number')} ({check_in_result.get('token_str')})"
        )
    except Exception as e:
        logger.error("Check-in failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Check-in failed: {str(e)}")

@router.post("/qr/issue-token")
def qr_issue_queue_token(
    payload: QRIssueTokenRequest,
    user: Dict[str, Any] = Depends(require_any_permission("appointment.create", "appointment.manage", "reception.manage", "patient.qr.scan")),
):
    """
    Issues an OPD walk-in queue token directly for a scanned OH-ID patient.
    """
    patient = sp_repository.get_patient_by_id(payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient identity not found")

    target_hospital = (
        payload.hospital_id
        or user.get("hospital_ref_id")
        or patient.get("hospital_id")
        or "hosp-kedar"
    )
    validate_hospital_tenant_scope(user, target_hospital)

    actor_id = user.get("user_ref_id") or user.get("id") or user.get("username", "receptionist")
    try:
        visit_result = sp_repository.generate_walk_in_visit(
            hospital_id=target_hospital,
            patient_id=payload.patient_id,
            department_id=payload.department_name or "General Medicine",
            doctor_id=payload.doctor_id,
            priority=payload.priority or "NORMAL",
            reason=payload.chief_complaint or "OPD Walk-in Arrival via OneHealth QR Scan",
            actor_id=actor_id
        )
        log_security_event(
            "WALK_IN_TOKEN_ISSUED",
            actor_id=user.get("username"),
            resource=f"patient:{payload.patient_id}",
            status="SUCCESS"
        )
        return success_response(
            data=visit_result,
            message=f"OPD Queue Token #{visit_result.get('token_number')} issued successfully."
        )
    except Exception as e:
        logger.error("Queue token issuance failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to issue queue token: {str(e)}")


@router.post("/{patient_id}/qr/rotate", response_model=PatientResponse)
def rotate_qr_token(
    patient_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("patient.update", "patient.self.qr")),
):
    """
    Rotates the zero-knowledge QR token for a patient to prevent stale/captured code reuse.
    """
    user_perms = user.get("permissions", [])
    if "patient.self.qr" in user_perms and "patient.update" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = user.get("user_ref_id") or user.get("id")
        patient = sp_repository.get_patient_by_id(patient_id)
        if not patient or (patient.get("id") != user_ref_id and patient.get("user_id") != user_ref_id):
            raise HTTPException(status_code=403, detail="Forbidden: You can only rotate your own QR token.")

    updated = sp_repository.rotate_patient_qr(patient_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return updated

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("patient.read", "patient.self.read")),
):
    """
    Retrieves a patient record by ID.
    Enforces strict hospital tenant isolation and object ownership (BOLA/IDOR protection).
    """
    patient = sp_repository.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    user_perms = user.get("permissions", [])
    patient_hospital = patient.get("hospital_id")

    # IDOR Prevention: Patients can strictly only view their own record
    if "patient.self.read" in user_perms and "patient.read" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = user.get("user_ref_id") or user.get("id")
        is_owner = (
            (patient.get("id") == user_ref_id) or
            (patient.get("user_id") == user_ref_id) or
            (patient.get("email") and patient.get("email") == user.get("email"))
        )
        if not is_owner:
            log_security_event("IDOR_BLOCKED", actor_id=user.get("username"), resource=f"patient:{patient_id}", status="DENIED")
            raise HTTPException(status_code=403, detail="Forbidden: You are only authorized to access your own patient record.")

    if "system.manage" not in user_perms and "organization.read" not in user_perms:
        validate_hospital_tenant_scope(user, patient_hospital)

    # Apply default PII masking unless user is patient owner or has explicit reveal permission
    user_ref_id = user.get("user_ref_id") or user.get("id")
    is_owner = (
        (patient.get("id") == user_ref_id) or
        (patient.get("user_id") == user_ref_id) or
        (patient.get("email") and patient.get("email") == user.get("email"))
    )
    has_reveal_perm = "patient.reveal_pii" in user_perms or "system.manage" in user_perms
    is_clinician = any(p in user_perms for p in ("consultation.create", "clinical.write"))

    if not is_owner and not has_reveal_perm:
        return pii_masker.mask_patient_dict(patient, preserve_clinical_details=is_clinician)

    return patient

@router.patch("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: str,
    update: PatientUpdate,
    user: Dict[str, Any] = Depends(require_permission("patient.update")),
):
    """
    Updates patient demographic information.
    Requires patient.update permission.
    """
    # Fetch first to validate hospital scope
    patient = sp_repository.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    validate_hospital_tenant_scope(user, patient.get("hospital_id"))

    updated = sp_repository.update_patient(
        patient_id=patient_id,
        name=update.name,
        age=update.age,
        diagnosis=update.diagnosis,
        phone=update.phone,
        address=update.address
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return updated


class RevealFieldRequest(BaseModel):
    field_name: str
    justification: str


@router.post("/{patient_id}/reveal-field")
def reveal_patient_field(
    patient_id: str,
    payload: RevealFieldRequest,
    user: Dict[str, Any] = Depends(require_any_permission("patient.read", "patient.self.read", "clinical.write"))
):
    """
    Controlled PII Reveal Endpoint.
    Requires legitimate clinical or administrative justification.
    Enforces strict hospital tenant boundary, decrypts if encrypted at rest,
    and records an immutable security audit event with actor and justification.
    """
    if not payload.justification or len(payload.justification.strip()) < 5:
        raise HTTPException(status_code=400, detail="Legitimate justification is mandatory to reveal sensitive PII.")

    patient = sp_repository.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    user_perms = user.get("permissions", [])
    patient_hospital = patient.get("hospital_id")

    # IDOR check for patient self-access
    if "patient.self.read" in user_perms and "patient.read" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = user.get("user_ref_id") or user.get("id")
        is_owner = (
            (patient.get("id") == user_ref_id) or
            (patient.get("user_id") == user_ref_id) or
            (patient.get("email") and patient.get("email") == user.get("email"))
        )
        if not is_owner:
            log_security_event("IDOR_BLOCKED", actor_id=user.get("username"), resource=f"patient:{patient_id}", status="DENIED")
            raise HTTPException(status_code=403, detail="Forbidden: You are only authorized to access your own patient record.")

    # Hospital tenant boundary check
    if "system.manage" not in user_perms and "organization.read" not in user_perms:
        user_hospital = user.get("hospital_ref_id") or user.get("hospital_id")
        if user_hospital and patient_hospital and user_hospital != patient_hospital:
            log_security_event(
                "CROSS_TENANT_ACCESS_DENIED",
                actor_id=user.get("username") or user.get("id"),
                resource=f"patient:{patient_id}",
                status="DENIED",
                hospital_id=user_hospital
            )
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Cannot reveal PII for a patient belonging to another healthcare tenant."
            )

    field = payload.field_name.lower().strip()
    allowed_fields = {"name", "phone", "email", "address", "identity_number", "emergency_contact", "diagnosis"}
    if field not in allowed_fields:
        raise HTTPException(status_code=400, detail=f"Invalid field. Revealable fields: {', '.join(allowed_fields)}")

    raw_val = patient.get(field)
    if field == "identity_number" and raw_val and str(raw_val).startswith("enc:v1:"):
        raw_val = envelope_crypto.decrypt_field(str(raw_val))

    # Audit log (without logging the raw sensitive value!)
    log_security_event(
        "PII_FIELD_REVEALED",
        actor_id=user.get("username") or user.get("id"),
        hospital_id=patient_hospital,
        resource=f"patient:{patient_id}:{field}",
        status="SUCCESS",
        details={"field_name": field, "justification": payload.justification.strip()}
    )

    return success_response(
        data={"field_name": field, "value": raw_val},
        message=f"Field '{field}' revealed under audited justification."
    )

