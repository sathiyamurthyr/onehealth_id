from fastapi import APIRouter, HTTPException, Query, status, Depends
from typing import List, Optional, Dict, Any
from uuid import uuid4
from backend.app.schemas.models import (
    PatientCreate, PatientResponse, PatientUpdate,
    DuplicateCheckRequest, DuplicateCheckResponse,
    QRTokenResolveRequest
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
        return db_patients
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
    """
    matches = sp_repository.check_duplicate_patient(
        phone=payload.phone,
        email=payload.email,
        identity_number=payload.identity_number,
        name=payload.name,
        age=payload.age,
        hospital_id=payload.hospital_id
    )
    return DuplicateCheckResponse(
        duplicate_found=len(matches) > 0,
        matches=[PatientResponse(**m) for m in matches]
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
    Authenticated staff receive full record; unauthenticated scans return masked PII.
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

    return patient

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
