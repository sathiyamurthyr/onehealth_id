from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from backend.app.schemas.models import (
    ConsultationCreate,
    ConsultationResponse,
    PrescriptionCreate,
    PrescriptionResponse,
    PrescriptionSignRequest,
    PrescriptionDispenseRequest,
    ReferralCreate,
    FollowUpCreate,
    DoctorScheduleItem
)
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    require_any_permission,
    require_permission,
    get_current_user_context,
    validate_hospital_tenant_scope,
    verify_clinical_record_access
)
from backend.app.core.logging import logger, log_security_event

router = APIRouter(prefix="/clinical", tags=["Clinical Workflows"])


def _resolve_doctor_id(user: Dict[str, Any]) -> str:
    user_ref_id = user.get("user_ref_id") or user.get("id")
    if user_ref_id:
        doc = sp_repository.get_doctor_by_user_id(user_ref_id)
        if doc and doc.get("id"):
            return doc["id"]
    return user_ref_id or ""


@router.post("/consultations", response_model=ConsultationResponse, status_code=status.HTTP_201_CREATED)
def record_consultation(
    payload: ConsultationCreate,
    user: Dict[str, Any] = Depends(require_any_permission("consultation.create", "clinical.write", "system.manage"))
):
    """
    Doctor Consultation Workflow (FHIR Aligned):
    Records clinical notes, diagnosis, vitals, symptoms, chief complaint, PICLE exam,
    medical history, multi-tier diagnoses, FHIR prescription, referrals, and follow-up.
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
        prescription_dict = payload.prescription.model_dump() if payload.prescription else None
        referral_dict = payload.referral.model_dump() if payload.referral else None
        follow_up_dict = payload.follow_up.model_dump() if payload.follow_up else None

        encounter = sp_repository.record_consultation(
            appointment_id=payload.appointment_id,
            patient_id=payload.patient_id,
            doctor_id=payload.doctor_id,
            diagnosis=payload.diagnosis,
            symptoms=payload.symptoms,
            clinical_notes=payload.clinical_notes,
            vitals=payload.vitals or {},
            chief_complaint=payload.chief_complaint,
            examination=payload.examination,
            medical_history=payload.medical_history,
            diagnoses=payload.diagnoses,
            prescription=prescription_dict,
            referral=referral_dict,
            follow_up=follow_up_dict,
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
    match = sp_repository.get_consultation_by_id(consultation_id)
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
        encounters = sp_repository.list_opd_encounters(patient_id=effective_patient_id, doctor_id=doctor_id)
        if "system.manage" not in user_perms and "organization.read" not in user_perms:
            user_hosp = user.get("hospital_ref_id") or user.get("hospital_id")
            if user_hosp:
                encounters = [e for e in encounters if not e.get("hospital_id") or e.get("hospital_id") == user_hosp]
        return encounters
    except Exception as e:
        logger.error("Failed to fetch OPD encounters: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch OPD encounters.")

@router.get("/ipd/admissions", response_model=List[Dict[str, Any]])
def list_ipd_admissions(
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "clinical.consultation", "consultation.read", "patient.read", "system.manage", "inpatient.read"))
):
    try:
        admissions = sp_repository.list_ipd_admissions()
        user_perms = user.get("permissions") or []
        if "system.manage" not in user_perms and "organization.read" not in user_perms:
            user_hosp = user.get("hospital_ref_id") or user.get("hospital_id")
            if user_hosp:
                admissions = [a for a in admissions if not a.get("hospital_id") or a.get("hospital_id") == user_hosp]
        return admissions
    except Exception as e:
        logger.error("Failed to fetch IPD admissions: %s", e, exc_info=True)
        return []

@router.get("/ipd/wards-beds", response_model=List[Dict[str, Any]])
def list_wards_and_beds(
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "clinical.consultation", "consultation.read", "patient.read", "system.manage", "inpatient.read"))
):
    try:
        wards = sp_repository.list_wards_and_beds()
        user_perms = user.get("permissions") or []
        if "system.manage" not in user_perms and "organization.read" not in user_perms:
            user_hosp = user.get("hospital_ref_id") or user.get("hospital_id")
            if user_hosp:
                wards = [w for w in wards if not w.get("hospital_id") or w.get("hospital_id") == user_hosp]
        return wards
    except Exception as e:
        logger.error("Failed to fetch wards and beds: %s", e, exc_info=True)
        return []

@router.get("/laboratory/orders", response_model=List[Dict[str, Any]])
def list_lab_orders(
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "system.manage", "lab.read", "patient.self.read"))
):
    try:
        orders = sp_repository.list_lab_orders()
        user_perms = user.get("permissions") or []
        if "patient.self.read" in user_perms and "clinical.read" not in user_perms and "system.manage" not in user_perms:
            user_ref_id = user.get("user_ref_id") or user.get("id")
            return [o for o in orders if o.get("patient_id") == user_ref_id]
        if "system.manage" not in user_perms and "organization.read" not in user_perms:
            user_hosp = user.get("hospital_ref_id") or user.get("hospital_id")
            if user_hosp:
                orders = [o for o in orders if not o.get("hospital_id") or o.get("hospital_id") == user_hosp]
        return orders
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

# ------------------------------------------------------------------------------
# FHIR MedicationRequest Endpoints
# ------------------------------------------------------------------------------

@router.post("/prescriptions", status_code=status.HTTP_201_CREATED)
def create_standalone_prescription_endpoint(
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(require_any_permission("prescription.create", "clinical.write", "system.manage"))
):
    """Create a digital prescription directly."""
    patient_id = payload.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")
    
    patient = sp_repository.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    user_perms = user.get("permissions") or []
    if "system.manage" not in user_perms and "organization.read" not in user_perms:
        validate_hospital_tenant_scope(user, patient.get("hospital_id"))

    hospital_id = user.get("hospital_ref_id") or patient.get("hospital_id")
    if not hospital_id:
        raise HTTPException(status_code=400, detail="Hospital scope is required for prescription creation")
    doctor_id = payload.get("doctor_id") or _resolve_doctor_id(user)
    diagnosis = payload.get("diagnosis") or "General Clinical Evaluation"
    doctor_notes = payload.get("instructions") or payload.get("doctor_notes")
    items = payload.get("items") or []
    actor_id = user.get("username") or "doctor"

    try:
        rx = sp_repository.create_standalone_prescription(
            patient_id=patient_id,
            doctor_id=doctor_id,
            hospital_id=hospital_id,
            diagnosis=diagnosis,
            doctor_notes=doctor_notes,
            status=payload.get("status", "FINALIZED"),
            items=items,
            actor_id=actor_id
        )
        return rx
    except Exception as e:
        logger.error("Failed to create prescription: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create prescription: {str(e)}")

@router.get("/prescriptions", response_model=List[Dict[str, Any]])
def list_prescriptions(
    patient_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("prescription.read", "prescription.view", "clinical.read", "consultation.read", "system.manage", "patient.self.read"))
):
    user_perms = user.get("permissions") or []
    effective_patient_id = patient_id
    if "patient.self.read" in user_perms and "clinical.read" not in user_perms and "consultation.read" not in user_perms and "system.manage" not in user_perms:
        effective_patient_id = user.get("user_ref_id") or user.get("id")

    try:
        return sp_repository.list_prescriptions(patient_id=effective_patient_id, doctor_id=doctor_id, status=status)
    except Exception as e:
        logger.error("Failed to list prescriptions: %s", e, exc_info=True)
        return []

@router.get("/prescriptions/{prescription_id}", response_model=Dict[str, Any])
def get_prescription(
    prescription_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("prescription.read", "prescription.view", "clinical.read", "consultation.read", "system.manage", "patient.self.read"))
):
    rx = sp_repository.get_prescription_by_id(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    user_perms = user.get("permissions") or []
    if "patient.self.read" in user_perms and "clinical.read" not in user_perms and "consultation.read" not in user_perms and "system.manage" not in user_perms:
        user_ref_id = user.get("user_ref_id") or user.get("id")
        pat = sp_repository.get_patient_by_user_ref(user_ref_id, user.get("email"))
        effective_patient_id = pat["id"] if pat else user_ref_id
        if rx.get("patient_id") != effective_patient_id and rx.get("patient_id") != user_ref_id:
            log_security_event("IDOR_ATTEMPT", actor_id=user.get("username"), resource=f"prescription:{prescription_id}", status="DENIED")
            raise HTTPException(status_code=403, detail="Forbidden: You can only view your own prescriptions.")
    else:
        validate_hospital_tenant_scope(user, rx.get("hospital_id"))

    return rx

@router.post("/prescriptions/{prescription_id}/sign", response_model=Dict[str, Any])
def sign_prescription_endpoint(
    prescription_id: str,
    payload: PrescriptionSignRequest,
    user: Dict[str, Any] = Depends(require_any_permission("prescription.create", "clinical.write", "system.manage"))
):
    """Explicit Doctor confirmation & digital signature before activating prescription."""
    rx = sp_repository.get_prescription_by_id(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    validate_hospital_tenant_scope(user, rx.get("hospital_id"))

    try:
        updated_rx = sp_repository.sign_prescription(
            prescription_id=prescription_id,
            signed_by=payload.signed_by,
            digital_signature_hash=payload.digital_signature_hash
        )
        log_security_event(
            "PRESCRIPTION_SIGNED",
            actor_id=user.get("username"),
            resource=f"prescription:{prescription_id}",
            status="SUCCESS",
            details={"signed_by": payload.signed_by}
        )
        return updated_rx
    except Exception as e:
        logger.error("Failed to sign prescription %s: %s", prescription_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to sign prescription")

@router.post("/prescriptions/{prescription_id}/dispense", response_model=Dict[str, Any])
def dispense_prescription_endpoint(
    prescription_id: str,
    payload: PrescriptionDispenseRequest,
    user: Dict[str, Any] = Depends(require_any_permission("clinical.write", "system.manage", "pharmacy.read"))
):
    """Pharmacist dispense workflow with batch, expiry, and quantity deduction."""
    rx = sp_repository.get_prescription_by_id(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    validate_hospital_tenant_scope(user, rx.get("hospital_id"))

    try:
        updated_rx = sp_repository.dispense_prescription(
            prescription_id=prescription_id,
            items=payload.items,
            dispensed_by=payload.dispensed_by
        )
        log_security_event(
            "PRESCRIPTION_DISPENSED",
            actor_id=user.get("username"),
            resource=f"prescription:{prescription_id}",
            status="SUCCESS",
            details={"dispensed_by": payload.dispensed_by, "items_count": len(payload.items)}
        )
        return updated_rx
    except Exception as e:
        logger.error("Failed to dispense prescription %s: %s", prescription_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to dispense prescription")

# ------------------------------------------------------------------------------
# Patient Clinical Timeline & Reports Summary
# ------------------------------------------------------------------------------

@router.get("/patients/{patient_id}/timeline", response_model=List[Dict[str, Any]])
def get_patient_timeline(
    patient_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "consultation.read", "patient.read", "patient.self.read", "system.manage"))
):
    """Unified Patient Clinical Timeline across encounters, labs, prescriptions, and admissions."""
    verify_clinical_record_access(patient_id, user)
    try:
        return sp_repository.get_patient_clinical_timeline(patient_id)
    except Exception as e:
        logger.error("Failed to get patient clinical timeline: %s", e, exc_info=True)
        return []

@router.get("/patients/{patient_id}/reports-summary", response_model=Dict[str, Any])
def get_reports_summary(
    patient_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "lab.read", "lab.result.read", "patient.read", "patient.self.read", "system.manage"))
):
    """Unified reports with abnormal indicators and multi-period trend comparison."""
    verify_clinical_record_access(patient_id, user, required_category="DiagnosticReport")
    try:
        return sp_repository.get_patient_reports_summary(patient_id)
    except Exception as e:
        logger.error("Failed to get reports summary: %s", e, exc_info=True)
        return {"orders": [], "trends": {}}

# ------------------------------------------------------------------------------
# Doctor Referrals & Follow-Up Plans
# ------------------------------------------------------------------------------

@router.get("/referrals", response_model=List[Dict[str, Any]])
def list_referrals(
    patient_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "consultation.read", "patient.read", "referral.view", "system.manage"))
):
    try:
        return sp_repository.list_referrals(patient_id=patient_id, doctor_id=doctor_id)
    except Exception as e:
        logger.error("Failed to list referrals: %s", e, exc_info=True)
        return []

@router.get("/follow-ups", response_model=List[Dict[str, Any]])
def list_follow_ups(
    patient_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "consultation.read", "appointment.read", "patient.read", "system.manage"))
):
    try:
        return sp_repository.list_follow_up_plans(patient_id=patient_id, doctor_id=doctor_id)
    except Exception as e:
        logger.error("Failed to list follow ups: %s", e, exc_info=True)
        return []

# ------------------------------------------------------------------------------
# Doctor Time Allocation & Scheduling Rules
# ------------------------------------------------------------------------------

@router.get("/doctor/schedule", response_model=List[Dict[str, Any]])
def get_doctor_schedule_endpoint(
    doctor_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "consultation.read", "doctor.read", "appointment.read", "system.manage"))
):
    try:
        doc_id = doctor_id or _resolve_doctor_id(user)
        return sp_repository.get_doctor_schedule(doc_id) if doc_id else []
    except Exception as e:
        logger.error("Failed to get doctor schedule: %s", e, exc_info=True)
        return []

@router.post("/doctor/schedule", response_model=List[Dict[str, Any]])
def update_doctor_schedule_endpoint(
    items: List[DoctorScheduleItem],
    doctor_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("clinical.write", "consultation.create", "doctor.manage", "system.manage"))
):
    try:
        doc_id = doctor_id or _resolve_doctor_id(user)
        if not doc_id:
            raise HTTPException(status_code=400, detail="Doctor context is required to update schedule")
        items_dict = [it.model_dump() for it in items]
        return sp_repository.update_doctor_schedule(doc_id, items_dict)
    except Exception as e:
        logger.error("Failed to update doctor schedule: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update doctor schedule")

# ------------------------------------------------------------------------------
# Phase 1: Record Immutability, Finalization & State Machine Endpoints
# ------------------------------------------------------------------------------

class ConsultationFinalizeRequest(BaseModel):
    digital_signature: Optional[str] = None
    notes: Optional[str] = None

class PrescriptionSupersedePayload(BaseModel):
    new_items: List[Dict[str, Any]]
    instructions: Optional[str] = None
    reason: str = "Clinical adjustment or dosage modification"

class LabReportFinalizePayload(BaseModel):
    pathologist_name: Optional[str] = "Dr. Diagnostic Pathologist"

class LabReportCorrectPayload(BaseModel):
    corrected_data: Dict[str, Any]
    reason: str = "Diagnostic re-evaluation"
    pathologist_name: Optional[str] = "Dr. Diagnostic Pathologist"

@router.post("/consultations/{consultation_id}/finalize")
def finalize_consultation_endpoint(
    consultation_id: str,
    payload: Optional[ConsultationFinalizeRequest] = None,
    user: Dict[str, Any] = Depends(require_any_permission("consultation.create", "consultation.update", "clinical.write", "system.manage"))
):
    """
    Locks consultation into immutable FINALIZED state with digital signature.
    Prevents silent mutation of finalized clinical records.
    """
    con = sp_repository.get_consultation_by_id(consultation_id)
    if not con:
        raise HTTPException(status_code=404, detail="Consultation encounter not found.")
    validate_hospital_tenant_scope(user, con.get("hospital_id"))

    doctor_id = _resolve_doctor_id(user)
    try:
        finalized = sp_repository.finalize_consultation(
            consultation_id=consultation_id,
            doctor_id=doctor_id,
            actor_id=user.get("username", "doctor")
        )
        log_security_event(
            "CONSULTATION_FINALIZED",
            actor_id=user.get("username"),
            resource=f"consultation:{consultation_id}",
            status="SUCCESS"
        )
        return {"success": True, "message": "Consultation successfully finalized and locked.", "consultation": finalized}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error("Failed to finalize consultation %s: %s", consultation_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to finalize consultation.")

@router.post("/prescriptions/{prescription_id}/finalize")
def finalize_prescription_endpoint(
    prescription_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("consultation.create", "clinical.write", "prescription.sign", "system.manage"))
):
    """Locks digital prescription into immutable FINALIZED status."""
    rx = sp_repository.get_prescription_by_id(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    validate_hospital_tenant_scope(user, rx.get("hospital_id"))

    doctor_id = _resolve_doctor_id(user)
    try:
        finalized = sp_repository.finalize_prescription(
            prescription_id=prescription_id,
            doctor_id=doctor_id,
            actor_id=user.get("username", "doctor")
        )
        log_security_event(
            "PRESCRIPTION_FINALIZED",
            actor_id=user.get("username"),
            resource=f"prescription:{prescription_id}",
            status="SUCCESS"
        )
        return {"success": True, "message": "Digital prescription finalized successfully.", "prescription": finalized}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error("Failed to finalize prescription %s: %s", prescription_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to finalize prescription.")

@router.post("/prescriptions/{prescription_id}/supersede")
def supersede_prescription_endpoint(
    prescription_id: str,
    payload: PrescriptionSupersedePayload,
    user: Dict[str, Any] = Depends(require_any_permission("consultation.create", "clinical.write", "system.manage"))
):
    """
    Prescription Correction Workflow:
    Marks current prescription as SUPERSEDED and creates an audit-linked new version.
    """
    rx = sp_repository.get_prescription_by_id(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    validate_hospital_tenant_scope(user, rx.get("hospital_id"))

    doctor_id = _resolve_doctor_id(user)
    try:
        new_rx = sp_repository.supersede_prescription(
            old_prescription_id=prescription_id,
            new_items=payload.new_items,
            instructions=payload.instructions,
            doctor_id=doctor_id,
            reason=payload.reason,
            actor_id=user.get("username", "doctor")
        )
        log_security_event(
            "PRESCRIPTION_SUPERSEDED",
            actor_id=user.get("username"),
            resource=f"prescription:{prescription_id}",
            status="SUCCESS",
            details={"superseded_by": new_rx.get("id"), "reason": payload.reason}
        )
        return {"success": True, "message": "Prescription successfully superseded with new active version.", "prescription": new_rx}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error("Failed to supersede prescription %s: %s", prescription_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to supersede prescription.")

@router.post("/investigations/{order_id}/cancel")
def cancel_investigation_order_endpoint(
    order_id: str,
    reason: Optional[str] = Query("Order cancelled by clinician"),
    user: Dict[str, Any] = Depends(require_any_permission("consultation.create", "lab.order", "clinical.write", "system.manage"))
):
    """Cancels a pending investigation order with audit reason."""
    try:
        with sp_repository.get_db_cursor() if hasattr(sp_repository, 'get_db_cursor') else get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.lab_orders SET
                    status = 'CANCELLED',
                    doctor_notes = %s
                WHERE id = %s
                RETURNING *;
            """, (f"Cancelled: {reason}", order_id))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Investigation order not found.")
        return {"success": True, "message": "Investigation order cancelled.", "order": dict(row)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to cancel investigation order %s: %s", order_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to cancel investigation order.")

@router.post("/lab/reports/{report_id}/finalize")
def finalize_lab_report_endpoint(
    report_id: str,
    payload: Optional[LabReportFinalizePayload] = None,
    user: Dict[str, Any] = Depends(require_any_permission("lab.write", "lab.verify", "clinical.write", "system.manage"))
):
    """Finalizes a digital diagnostic lab report into immutable FINAL status."""
    p_name = payload.pathologist_name if payload else "Dr. Diagnostic Pathologist"
    try:
        finalized = sp_repository.finalize_lab_report(
            report_id=report_id,
            pathologist_name=p_name,
            actor_id=user.get("username", "lab_staff")
        )
        return {"success": True, "message": "Diagnostic lab report finalized.", "report": finalized}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error("Failed to finalize lab report %s: %s", report_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to finalize lab report.")


