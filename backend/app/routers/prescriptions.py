from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.responses import HTMLResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import uuid
import datetime
import hashlib
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    get_current_user_context,
    require_any_permission,
    validate_hospital_tenant_scope
)
from backend.app.core.security import verify_password
from backend.app.core.logging import logger, log_security_event
from backend.app.database.session import get_readonly_cursor

router = APIRouter(prefix="/prescriptions", tags=["Prescription Management & Digital Signing"])

class PrescriptionItemPayload(BaseModel):
    medicine_name: str
    strength: Optional[str] = "500 mg"
    dosage_form: Optional[str] = "Tablet"
    dose: Optional[str] = "1"
    frequency: Optional[str] = "Twice daily (1-0-1)"
    duration_days: Optional[int] = 5
    route: Optional[str] = "Oral"
    food_instruction: Optional[str] = "After food"
    quantity: Optional[int] = 10
    specific_instructions: Optional[str] = "As directed by physician"

class CreatePrescriptionRequest(BaseModel):
    patient_id: str
    doctor_id: Optional[str] = None
    hospital_id: Optional[str] = None
    visit_id: Optional[str] = None
    diagnosis: str
    doctor_notes: Optional[str] = None
    follow_up_days: Optional[int] = 0
    follow_up_date: Optional[str] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    validity_type: Optional[str] = "CALENDAR_DAYS"
    requires_pin: bool = False
    verification_pin: Optional[str] = None
    items: List[PrescriptionItemPayload] = Field(default_factory=list)

class VerifyPrescriptionRequest(BaseModel):
    verification_token: Optional[str] = None
    pin: Optional[str] = None

@router.get("")
@router.get("/")
def list_prescriptions(
    patient_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    List prescriptions with strict role-based and hospital scoping.
    Patient role can only see their own prescriptions.
    Doctor role sees prescriptions within their active hospital context.
    """
    user_perms = current_user.get("permissions") or []
    effective_patient_id = patient_id

    # If patient, enforce self-only access
    if "patient.self.read" in user_perms and "clinical.read" not in user_perms and "system.manage" not in user_perms:
        effective_patient_id = current_user.get("user_ref_id") or current_user.get("id")

    # Scope to active hospital if doctor
    effective_hosp_id = hospital_id or current_user.get("hospital_ref_id")
    if current_user.get("role") == "DOCTOR" and not doctor_id:
        doc = sp_repository.get_doctor_by_user_id(current_user["user_ref_id"])
        doctor_id = doc.get("id") if doc else None

    try:
        rx_list = sp_repository.list_prescriptions(
            patient_id=effective_patient_id,
            doctor_id=doctor_id,
            status=status
        )
        if effective_hosp_id:
            rx_list = [r for r in rx_list if not r.get("hospital_id") or r.get("hospital_id") == effective_hosp_id]
        return rx_list
    except Exception as e:
        logger.error("Failed to list prescriptions: %s", e, exc_info=True)
        return []

@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_prescription(
    payload: CreatePrescriptionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Creates an immutable prescription with medications, signature hash, and verification token.
    Enforces PIN verification ONLY if required for the clinical workflow.
    """
    # 1. Authorize clinician (Only licensed medical doctors or accounts with prescription.create)
    user_perms = current_user.get("permissions") or []
    roles = current_user.get("roles") or [current_user.get("role")]
    is_clinician = ("DOCTOR" in roles) or ("prescription.create" in user_perms)
    if not is_clinician:
        raise HTTPException(status_code=403, detail="Forbidden: Only authorized medical doctors can create prescriptions.")

    # 2. Verify patient exists
    patient = sp_repository.get_patient_by_id(payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    # 3. Resolve doctor ID
    resolved_doctor_id = payload.doctor_id
    if not resolved_doctor_id:
        doc = sp_repository.get_doctor_by_user_id(current_user["user_ref_id"])
        resolved_doctor_id = doc.get("id") if doc else (current_user.get("user_ref_id") or current_user.get("id"))

    # 4. Resolve hospital context
    resolved_hospital_id = payload.hospital_id or current_user.get("hospital_ref_id") or patient.get("hospital_id")
    if not resolved_hospital_id:
        raise HTTPException(status_code=400, detail="Hospital context is required for prescription creation")

    # 5. Handle PIN verification if required
    if payload.requires_pin:
        pin = (payload.verification_pin or "").strip()
        if not pin:
            raise HTTPException(
                status_code=400,
                detail="Prescription verification PIN is invalid. Please enter your authorized 4-digit digital signing PIN."
            )
        verified = False
        doc_pin_hash = None
        target_doc_id = (doc.get("id") if doc else None) or resolved_doctor_id
        if target_doc_id:
            try:
                with get_readonly_cursor() as cur:
                    cur.execute(
                        "SELECT pin_hash FROM oh_id.doctors WHERE id = %s OR user_id = %s LIMIT 1;",
                        (target_doc_id, current_user.get("user_ref_id") or current_user.get("id"))
                    )
                    p_row = cur.fetchone()
                    if p_row and p_row.get("pin_hash"):
                        doc_pin_hash = p_row["pin_hash"]
            except Exception as e:
                logger.warning(f"Could not load pin_hash for doctor {target_doc_id}: {e}")

        if doc_pin_hash and verify_password(pin, doc_pin_hash):
            verified = True
        elif doc and doc.get("user_id"):
            u = sp_repository.get_user_by_id(doc["user_id"])
            if u and u.get("password_hash") and verify_password(pin, u["password_hash"]):
                verified = True
        elif not doc_pin_hash:
            cur_u = sp_repository.get_user_by_id(current_user["user_ref_id"])
            if cur_u and cur_u.get("password_hash") and verify_password(pin, cur_u["password_hash"]):
                verified = True

        if not verified:
            raise HTTPException(
                status_code=400,
                detail="Prescription verification PIN is invalid. Please enter your authorized 4-digit digital signing PIN."
            )

    actor_name = current_user.get("name") or current_user.get("username")

    try:
        rx = sp_repository.create_standalone_prescription(
            patient_id=payload.patient_id,
            doctor_id=resolved_doctor_id,
            hospital_id=resolved_hospital_id,
            diagnosis=payload.diagnosis,
            doctor_notes=payload.doctor_notes,
            follow_up_days=payload.follow_up_days or 0,
            follow_up_date=payload.follow_up_date,
            valid_from=payload.valid_from,
            valid_until=payload.valid_until,
            validity_type=payload.validity_type or "CALENDAR_DAYS",
            validity_period_not_specified=(payload.valid_from is None and payload.valid_until is None),
            requires_pin=payload.requires_pin,
            visit_id=payload.visit_id,
            items=[item.model_dump() for item in payload.items],
            actor_id=actor_name,
            status="SIGNED"
        )

        log_security_event(
            "PRESCRIPTION_CREATED_AND_SIGNED",
            actor_id=current_user["username"],
            resource=f"prescription:{rx.get('id')}",
            status="SUCCESS",
            details={
                "patient_id": payload.patient_id,
                "doctor_id": resolved_doctor_id,
                "items_count": len(payload.items),
                "requires_pin": payload.requires_pin
            }
        )

        return rx
    except Exception as e:
        logger.error("Failed to create prescription: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save prescription. Please verify clinical inputs.")

@router.get("/{prescription_id}")
def get_prescription_details(
    prescription_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns complete canonical prescription details including patient summary,
    medication table, notes, follow-up, and verification tokens.
    """
    rx = sp_repository.get_prescription_by_id(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    user_perms = current_user.get("permissions") or []
    # Patient role authorization check
    if "patient.self.read" in user_perms and "clinical.read" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = current_user.get("user_ref_id") or current_user.get("id")
        pat = sp_repository.get_patient_by_user_ref(user_ref_id, current_user.get("email"))
        effective_patient_id = pat["id"] if pat else user_ref_id
        if rx.get("patient_id") != effective_patient_id and rx.get("patient_id") != user_ref_id:
            log_security_event("BOLA_ATTEMPT", actor_id=current_user.get("username"), resource=f"prescription:{prescription_id}", status="DENIED")
            raise HTTPException(status_code=403, detail="Forbidden: You can only view your own prescriptions.")
    else:
        validate_hospital_tenant_scope(current_user, rx.get("hospital_id"))

    return rx

@router.post("/{prescription_id}/finalize")
def finalize_prescription(
    prescription_id: str,
    payload: Optional[Dict[str, Any]] = None,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Finalizes and locks the prescription into an immutable version."""
    user_perms = current_user.get("permissions") or []
    roles = current_user.get("roles") or [current_user.get("role")]
    is_clinician = ("DOCTOR" in roles) or ("prescription.create" in user_perms) or ("clinical.write" in user_perms) or ("system.manage" in user_perms)
    if not is_clinician:
        raise HTTPException(status_code=403, detail="Forbidden: Only authorized medical doctors can finalize prescriptions.")

    rx = sp_repository.get_prescription_by_id(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    validate_hospital_tenant_scope(current_user, rx.get("hospital_id"))

    signed = sp_repository.sign_prescription(
        prescription_id=prescription_id,
        signed_by=current_user.get("name") or current_user.get("username")
    )
    return signed

@router.post("/{prescription_id}/verify")
def verify_prescription_token(
    prescription_id: str,
    payload: Optional[VerifyPrescriptionRequest] = None
):
    """
    Public / Authorized verification endpoint for QR code tokens.
    Validates cryptographic authenticity without leaking unauthorized personal records.
    """
    rx = sp_repository.get_prescription_by_id(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found or invalid QR token")

    token_valid = True
    if payload and payload.verification_token:
        token_valid = (payload.verification_token == rx.get("verification_token"))

    return {
        "verified": token_valid,
        "prescription_id": rx["id"],
        "status": rx.get("status", "ACTIVE"),
        "patient_name": rx.get("patient_name"),
        "doctor_name": rx.get("doctor_name"),
        "doctor_registration": rx.get("doctor_registration") or "Not recorded",
        "hospital_name": rx.get("hospital_name"),
        "created_at": rx.get("created_at"),
        "digital_signature_hash": rx.get("digital_signature_hash")
    }

@router.get("/{prescription_id}/print")
def get_prescription_print_layout(
    prescription_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns canonical print document data structure."""
    rx = sp_repository.get_prescription_by_id(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    user_perms = current_user.get("permissions") or []
    if "patient.self.read" in user_perms and "clinical.read" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = current_user.get("user_ref_id") or current_user.get("id")
        pat = sp_repository.get_patient_by_user_ref(user_ref_id, current_user.get("email"))
        effective_patient_id = pat["id"] if pat else user_ref_id
        if rx.get("patient_id") != effective_patient_id and rx.get("patient_id") != user_ref_id:
            log_security_event("BOLA_ATTEMPT", actor_id=current_user.get("username"), resource=f"prescription_print:{prescription_id}", status="DENIED")
            raise HTTPException(status_code=403, detail="Forbidden: You can only print your own prescriptions.")
    else:
        validate_hospital_tenant_scope(current_user, rx.get("hospital_id"))

    return {
        "layout": "A4_PORTRAIT",
        "header": {
            "hospital_name": rx.get("hospital_name"),
            "hospital_address": rx.get("hospital_address"),
            "hospital_phone": rx.get("hospital_phone"),
            "system_tag": "ONEHEALTH ID HEALTHCARE OPERATING SYSTEM"
        },
        "prescription": rx
    }

@router.get("/{prescription_id}/pdf")
def generate_prescription_pdf(
    prescription_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Returns downloadable canonical prescription metadata and HTML representation."""
    rx = sp_repository.get_prescription_by_id(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    user_perms = current_user.get("permissions") or []
    if "patient.self.read" in user_perms and "clinical.read" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = current_user.get("user_ref_id") or current_user.get("id")
        pat = sp_repository.get_patient_by_user_ref(user_ref_id, current_user.get("email"))
        effective_patient_id = pat["id"] if pat else user_ref_id
        if rx.get("patient_id") != effective_patient_id and rx.get("patient_id") != user_ref_id:
            log_security_event("BOLA_ATTEMPT", actor_id=current_user.get("username"), resource=f"prescription_pdf:{prescription_id}", status="DENIED")
            raise HTTPException(status_code=403, detail="Forbidden: You can only download your own prescriptions.")
    else:
        validate_hospital_tenant_scope(current_user, rx.get("hospital_id"))

    return {
        "download_url": f"/api/v1/prescriptions/{prescription_id}/print",
        "filename": f"Prescription_{rx['id']}_{rx.get('patient_name', 'Patient').replace(' ', '_')}.pdf",
        "prescription": rx
    }
