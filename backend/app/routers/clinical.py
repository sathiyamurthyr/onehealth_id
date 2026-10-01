from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any, Optional
from backend.app.schemas.models import ConsultationCreate, ConsultationResponse
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    require_any_permission,
    require_permission,
    get_current_user_context,
    validate_hospital_tenant_scope
)
from backend.app.core.logging import logger, log_security_event

router = APIRouter(prefix="/clinical", tags=["Clinical Workflows"])

@router.post("/consultations", response_model=ConsultationResponse, status_code=status.HTTP_201_CREATED)
def record_consultation(
    payload: ConsultationCreate,
    user: Dict[str, Any] = Depends(require_any_permission("consultation.create", "clinical.write", "system.manage"))
):
    """
    Doctor Consultation Workflow:
    Records clinical notes, diagnosis, vitals, symptoms and marks appointment/queue token completed.
    Strictly enforced server-side: only authorized clinicians can record consultations.
    """
    user_perms = user.get("permissions") or []
    roles = user.get("roles") or [user.get("role")]
    is_clinician = any(r in ["DOCTOR", "HOSPITAL_ADMIN", "PLATFORM_ADMIN", "SUPER_ADMIN"] for r in roles) or "consultation.create" in user_perms
    if not is_clinician:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Only consulting doctors and clinical administrators can record medical consultations."
        )

    # Verify patient exists
    patient = sp_repository.get_patient_by_id(payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    # Enforce hospital scope
    if "system.manage" not in user_perms and "organization.read" not in user_perms:
        validate_hospital_tenant_scope(user, patient.get("hospital_id"))

    actor_id = user.get("user_ref_id") or user.get("id") or user.get("username")

    try:
        encounter = sp_repository.record_consultation(
            appointment_id=payload.appointment_id,
            patient_id=payload.patient_id,
            doctor_id=payload.doctor_id,
            symptoms=payload.symptoms,
            diagnosis=payload.diagnosis,
            clinical_notes=payload.clinical_notes,
            vitals=payload.vitals or {},
            actor_id=actor_id
        )
        log_security_event(
            "CONSULTATION_RECORDED",
            actor_id=user.get("username"),
            resource=f"patient:{payload.patient_id}",
            status="SUCCESS",
            details={"appointment_id": payload.appointment_id, "doctor_id": payload.doctor_id}
        )
        return encounter
    except Exception as e:
        logger.error("Failed to record consultation for patient %s: %s", payload.patient_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to record clinical consultation. Please try again.")

@router.get("/consultations/{consultation_id}", response_model=ConsultationResponse)
def get_consultation(
    consultation_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "consultation.read", "system.manage", "patient.self.read"))
):
    """Retrieves consultation details with IDOR validation."""
    encounters = sp_repository.list_opd_encounters()
    match = None
    for enc in encounters:
        if enc.get("id") == consultation_id:
            match = enc
            break
    if not match:
        raise HTTPException(status_code=404, detail="Consultation encounter not found")

    user_perms = user.get("permissions") or []
    # Patient role can only see their own consultation
    if "patient.self.read" in user_perms and "clinical.read" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = user.get("user_ref_id") or user.get("id")
        if match.get("patient_id") != user_ref_id:
            raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to view this clinical record")

    if "system.manage" not in user_perms and "organization.read" not in user_perms:
        validate_hospital_tenant_scope(user, match.get("hospital_id"))

    return match

@router.get("/opd/encounters", response_model=List[Dict[str, Any]])
def list_opd_encounters(
    patient_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "consultation.read", "system.manage", "patient.self.read"))
):
    user_perms = user.get("permissions") or []
    # Patient role can only query self
    effective_patient_id = patient_id
    if "patient.self.read" in user_perms and "clinical.read" not in user_perms and "system.manage" not in user_perms:
        effective_patient_id = user.get("user_ref_id") or user.get("id")

    try:
        return sp_repository.list_opd_encounters(patient_id=effective_patient_id, doctor_id=doctor_id)
    except Exception as e:
        logger.error("Failed to fetch OPD encounters: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch OPD encounters.")

@router.get("/ipd/admissions", response_model=List[Dict[str, Any]])
def list_ipd_admissions(
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "system.manage", "inpatient.read"))
):
    try:
        return sp_repository.list_ipd_admissions()
    except Exception as e:
        logger.error("Failed to fetch IPD admissions: %s", e, exc_info=True)
        return []

@router.get("/ipd/wards-beds", response_model=List[Dict[str, Any]])
def list_wards_and_beds(
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "system.manage", "inpatient.read"))
):
    try:
        return sp_repository.list_wards_and_beds()
    except Exception as e:
        logger.error("Failed to fetch wards and beds: %s", e, exc_info=True)
        return []

@router.get("/laboratory/orders", response_model=List[Dict[str, Any]])
def list_lab_orders(
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "system.manage", "lab.read"))
):
    try:
        return sp_repository.list_lab_orders()
    except Exception as e:
        logger.error("Failed to fetch laboratory orders: %s", e, exc_info=True)
        return []

@router.get("/pharmacy/dispensary", response_model=List[Dict[str, Any]])
def list_pharmacy_dispensary(
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "system.manage", "pharmacy.read"))
):
    try:
        return sp_repository.list_pharmacy_dispensary()
    except Exception as e:
        logger.error("Failed to fetch pharmacy dispensary: %s", e, exc_info=True)
        return []
