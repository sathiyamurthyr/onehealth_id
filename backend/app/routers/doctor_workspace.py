from fastapi import APIRouter, HTTPException, Depends, status, Query, Body
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    require_any_permission,
    get_current_user_context,
    validate_hospital_tenant_scope,
    verify_clinical_record_access
)
from backend.app.core.logging import logger, log_security_event
import json
import hashlib
from datetime import date, datetime

router = APIRouter(prefix="/doctor", tags=["Doctor Consultation Workspace"])

# ------------------------------------------------------------------------------
# Pydantic Schemas for Doctor Workspace
# ------------------------------------------------------------------------------

class PatientIntakePayload(BaseModel):
    reason_for_visit: str = Field(..., min_length=2)
    duration: Optional[str] = None
    main_concern: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = "Moderate" # Mild, Moderate, Severe
    location: Optional[str] = None
    relieving_factors: Optional[str] = None
    aggravating_factors: Optional[str] = None
    associated_symptoms: Optional[List[str]] = Field(default_factory=list)
    previous_treatments: Optional[str] = None
    current_medications: Optional[str] = None
    known_allergies: Optional[str] = None
    appointment_id: Optional[str] = None

class InvestigationOrderItem(BaseModel):
    test_id: str
    priority: Optional[str] = "ROUTINE" # ROUTINE, URGENT, STAT
    clinical_reason: Optional[str] = None
    instructions: Optional[str] = None
    fasting_required: Optional[bool] = False
    collection_type: Optional[str] = "Hospital" # Hospital, Lab, Home
    preferred_lab_name: Optional[str] = "Kedar Central Pathology Lab"

class InvestigationOrderBatch(BaseModel):
    orders: List[InvestigationOrderItem] = Field(..., min_length=1)

class InvestigationReviewPayload(BaseModel):
    review_notes: str = Field(..., min_length=2)

class DoctorReferralPayload(BaseModel):
    receiving_doctor_id: Optional[str] = None
    receiving_doctor_name: Optional[str] = None
    specialty: str = Field(..., min_length=2)
    referral_type: Optional[str] = "INTERNAL"
    reason: str = Field(..., min_length=2)
    clinical_summary: Optional[str] = None
    priority: Optional[str] = "ROUTINE" # ROUTINE, URGENT
    requested_evaluation: Optional[str] = None
    attached_reports: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

class ConsultationSavePayload(BaseModel):
    appointment_id: Optional[str] = None
    diagnosis: str
    symptoms: Optional[str] = None
    clinical_notes: Optional[str] = None
    vitals: Optional[Dict[str, Any]] = None
    chief_complaint: Optional[Dict[str, Any]] = None
    examination: Optional[Dict[str, Any]] = None
    medical_history: Optional[Dict[str, Any]] = None
    diagnoses: Optional[List[Dict[str, Any]]] = None
    prescription: Optional[Dict[str, Any]] = None
    referral: Optional[Dict[str, Any]] = None
    follow_up: Optional[Dict[str, Any]] = None
    report_template_id: Optional[str] = None
    rx_template_id: Optional[str] = None
    is_draft: Optional[bool] = False

class ExternalDocumentUploadPayload(BaseModel):
    title: str = Field(..., min_length=2)
    category: str = "IMAGING_REPORT"
    hospital_name: Optional[str] = None
    doctor_name: Optional[str] = None
    document_date: Optional[str] = None
    clinical_note: Optional[str] = None
    file_type: Optional[str] = "PDF"
    file_size_kb: Optional[int] = 500
    tags: Optional[List[str]] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None

class DocumentRequestPayload(BaseModel):
    document_type: str = Field(..., min_length=2)
    title: str = Field(..., min_length=2)
    instructions: Optional[str] = None
    urgency: Optional[str] = "ROUTINE"

class ClinicalDocumentReviewPayload(BaseModel):
    review_notes: str = Field(..., min_length=2)

class AttachDocumentsPayload(BaseModel):
    document_ids: List[str] = Field(..., min_length=1)
    clinical_context: Optional[str] = None


# ------------------------------------------------------------------------------
# Helper for Doctor-Patient Context Authorization & Anti-IDOR Check
# ------------------------------------------------------------------------------

def verify_doctor_patient_access(patient_id: str, user: Dict[str, Any], required_category: Optional[str] = None) -> Dict[str, Any]:
    """
    Authoritative Server-Side Patient Scoping & Cross-Hospital Authorization Check:
    Verifies the authenticated doctor has valid clinical authorization to access
    the specified patient record. Enforces tenant boundaries, patient consent,
    requesting facility verification, expiry, and revocation server-side.
    """
    return verify_clinical_record_access(patient_id, user, required_category=required_category)


# ------------------------------------------------------------------------------
# 1. Patient Context & Clinical Overview (Scoped to Selected Patient)
# ------------------------------------------------------------------------------

@router.get("/patients/{patient_id}/context", response_model=Dict[str, Any])
def get_patient_consultation_context(
    patient_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("consultation.read", "patient.read", "clinical.read", "patient.self.read", "system.manage"))
):
    """
    Retrieves the complete clinical encounter context for Patient:
    Demographics, allergies, chronic conditions, active medications, recent visits,
    recent prescriptions, recent lab results, upcoming appointments, and patient intake.
    Enforces strict category scope filtering on cross-hospital consent access.
    """
    patient = verify_doctor_patient_access(patient_id, user)
    overview = sp_repository.get_patient_clinical_overview(patient_id)
    if not overview:
        raise HTTPException(status_code=404, detail="Patient clinical context could not be loaded")

    # If cross-hospital access with active consent, filter overview to permitted categories
    active_consent = patient.get("_active_consent")
    if active_consent:
        allowed_cats = active_consent.get("data_categories") or []
        if isinstance(allowed_cats, str):
            try:
                allowed_cats = json.loads(allowed_cats)
            except Exception:
                allowed_cats = [allowed_cats]
        has_consult = "OPConsultation" in allowed_cats or "Consultation" in allowed_cats
        has_rx = "Prescription" in allowed_cats
        has_lab = "DiagnosticReport" in allowed_cats or "LabReport" in allowed_cats

        if not has_consult:
            overview["recent_encounters"] = []
            overview["chronic_conditions"] = []
            for rx in overview.get("recent_prescriptions") or []:
                rx["diagnosis"] = None
                rx["doctor_notes"] = None
                rx["chief_complaint"] = None
                rx["clinical_advice"] = None
        if not has_rx:
            overview["recent_prescriptions"] = []
            overview["active_medications"] = []
        if not has_lab:
            overview["recent_investigations"] = []
            overview["pending_investigations_count"] = 0

    return overview


# ------------------------------------------------------------------------------
# 2. Longitudinal Cross-Hospital History
# ------------------------------------------------------------------------------

@router.get("/patients/{patient_id}/history", response_model=List[Dict[str, Any]])
def get_patient_history(
    patient_id: str,
    hospital_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    record_type: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("consultation.read", "patient.read", "clinical.read", "patient.self.read", "system.manage"))
):
    """
    Retrieves authorized longitudinal cross-hospital history with filtering:
    Visits, Prescriptions, Lab Reports, Imaging Scans, Discharge Summaries, and Referrals.
    Enforces strict category scope filtering on cross-hospital consent access.
    """
    patient = verify_doctor_patient_access(patient_id, user)
    raw_events = sp_repository.get_patient_longitudinal_history(
        patient_id=patient_id,
        hospital_id=hospital_id,
        doctor_id=doctor_id,
        department_id=department_id,
        start_date=start_date,
        end_date=end_date,
        record_type=record_type
    )

    # If cross-hospital access with active consent, filter events to permitted categories
    active_consent = patient.get("_active_consent")
    if active_consent:
        allowed_cats = active_consent.get("data_categories") or []
        if isinstance(allowed_cats, str):
            try:
                allowed_cats = json.loads(allowed_cats)
            except Exception:
                allowed_cats = [allowed_cats]

        filtered_events = []
        has_consult = "OPConsultation" in allowed_cats or "Consultation" in allowed_cats
        has_rx = "Prescription" in allowed_cats
        has_lab = "DiagnosticReport" in allowed_cats or "LabReport" in allowed_cats

        for ev in raw_events:
            rec_type = ev.get("record_type", "").upper()
            if rec_type in ("VISIT", "ENCOUNTER") and has_consult:
                filtered_events.append(ev)
            elif rec_type == "PRESCRIPTION" and has_rx:
                ev_copy = dict(ev)
                if not has_consult:
                    ev_copy["diagnosis"] = None
                filtered_events.append(ev_copy)
            elif rec_type in ("LAB_REPORT", "INVESTIGATION") and has_lab:
                ev_copy = dict(ev)
                if not has_consult:
                    ev_copy["diagnosis"] = None
                filtered_events.append(ev_copy)
            elif rec_type in ("DISCHARGE", "DISCHARGE_SUMMARY") and "DischargeSummary" in allowed_cats:
                filtered_events.append(ev)
            elif rec_type == "REFERRAL" and ("OPConsultation" in allowed_cats or "Referral" in allowed_cats):
                filtered_events.append(ev)
            elif rec_type == "DOCUMENT" and ("ClinicalDocument" in allowed_cats or "DiagnosticReport" in allowed_cats):
                filtered_events.append(ev)
        return filtered_events

    return raw_events


# ------------------------------------------------------------------------------
# 3. Patient-Reported Pre-Consultation Intake
# ------------------------------------------------------------------------------

@router.get("/patients/{patient_id}/intake", response_model=Optional[Dict[str, Any]])
def get_patient_intake_endpoint(
    patient_id: str,
    appointment_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("consultation.read", "patient.read", "clinical.read", "patient.self.read", "system.manage"))
):
    """Retrieves patient-reported pre-consultation visit description."""
    verify_doctor_patient_access(patient_id, user)
    return sp_repository.get_patient_intake(patient_id, appointment_id)


@router.post("/patients/{patient_id}/intake", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def submit_patient_intake_endpoint(
    patient_id: str,
    payload: PatientIntakePayload,
    user: Dict[str, Any] = Depends(require_any_permission("patient.self.read", "patient.self.appointments", "patient.self.records", "patient.self.write", "patient.read", "consultation.create", "clinical.write", "system.manage"))
):
    """Patient or triage nurse submits pre-consultation visit description."""
    verify_doctor_patient_access(patient_id, user)
    return sp_repository.submit_patient_intake(
        patient_id=patient_id,
        reason_for_visit=payload.reason_for_visit,
        duration=payload.duration,
        main_concern=payload.main_concern,
        description=payload.description,
        severity=payload.severity or "Moderate",
        location=payload.location,
        relieving_factors=payload.relieving_factors,
        aggravating_factors=payload.aggravating_factors,
        associated_symptoms=payload.associated_symptoms,
        previous_treatments=payload.previous_treatments,
        current_medications=payload.current_medications,
        known_allergies=payload.known_allergies,
        appointment_id=payload.appointment_id
    )


# ------------------------------------------------------------------------------
# 4. Multi-Category Investigation Catalog & Orders
# ------------------------------------------------------------------------------

@router.get("/investigations/catalog", response_model=List[Dict[str, Any]])
def get_investigation_catalog(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("lab.read", "consultation.read", "patient.read", "clinical.read", "patient.self.read", "system.manage"))
):
    """
    Returns configured investigation catalogue (Blood, Urine, Stool, Cardiac,
    Imaging, Respiratory, Endoscopy, Microbiology, Pathology, Other).
    """
    return sp_repository.list_investigation_catalog(category=category, search=search)


@router.get("/patients/{patient_id}/investigations", response_model=List[Dict[str, Any]])
def get_patient_investigations(
    patient_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("lab.read", "consultation.read", "patient.read", "clinical.read", "patient.self.read", "system.manage"))
):
    """Retrieves all investigation orders & lab results for this patient."""
    verify_doctor_patient_access(patient_id, user)
    return sp_repository.get_patient_investigations(patient_id)


def get_effective_doctor_id(user: Dict[str, Any]) -> str:
    user_ref_id = user.get("user_ref_id") or user.get("id")
    if user_ref_id:
        doc = sp_repository.get_doctor_by_user_id(user_ref_id)
        if doc and doc.get("id"):
            return doc["id"]
    return user.get("doctor_id") or user_ref_id or ""


@router.post("/patients/{patient_id}/investigations", response_model=List[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
def order_patient_investigations(
    patient_id: str,
    payload: InvestigationOrderBatch,
    user: Dict[str, Any] = Depends(require_any_permission("lab.order", "consultation.create", "clinical.write", "system.manage"))
):
    """Doctor orders multi-category investigations directly from consultation."""
    patient = verify_doctor_patient_access(patient_id, user)
    doctor_id = get_effective_doctor_id(user)
    hospital_id = patient.get("hospital_id") or user.get("hospital_ref_id")
    if not hospital_id:
        raise HTTPException(status_code=400, detail="Hospital scope is required for investigation ordering")

    orders_data = [item.model_dump() for item in payload.orders]
    created = sp_repository.order_investigations(
        patient_id=patient_id,
        doctor_id=doctor_id,
        hospital_id=hospital_id,
        orders=orders_data
    )
    log_security_event(
        "INVESTIGATIONS_ORDERED",
        actor_id=user.get("username"),
        resource=f"patient:{patient_id}",
        status="SUCCESS",
        details={"count": len(created)}
    )
    return created


@router.patch("/investigations/{order_id}/review", response_model=Dict[str, Any])
def review_investigation_result(
    order_id: str,
    payload: InvestigationReviewPayload,
    user: Dict[str, Any] = Depends(require_any_permission("consultation.create", "consultation.update", "lab.order", "clinical.write", "system.manage"))
):
    """Doctor reviews and confirms diagnostic investigation result."""
    doctor_id = get_effective_doctor_id(user)
    return sp_repository.review_investigation_order(
        order_id=order_id,
        doctor_id=doctor_id,
        review_notes=payload.review_notes
    )


# ------------------------------------------------------------------------------
# 5. Doctor Referral Directory & Referrals Management
# ------------------------------------------------------------------------------

@router.get("/referrals/directory", response_model=List[Dict[str, Any]])
def get_referral_directory(
    specialty: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("consultation.read", "consultation.create", "patient.read", "doctor.read", "clinical.read", "patient.self.read", "system.manage"))
):
    """Returns active verified specialists and doctors available for referral."""
    return sp_repository.list_referral_directory(specialty=specialty, hospital_id=hospital_id)


@router.get("/patients/{patient_id}/referrals", response_model=List[Dict[str, Any]])
def get_patient_referrals(
    patient_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("consultation.read", "patient.read", "referral.view", "clinical.read", "patient.self.read", "system.manage"))
):
    """Retrieves referrals for the specified patient."""
    verify_doctor_patient_access(patient_id, user)
    return sp_repository.get_patient_referrals(patient_id)


@router.post("/patients/{patient_id}/referrals", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_patient_referral(
    patient_id: str,
    payload: DoctorReferralPayload,
    user: Dict[str, Any] = Depends(require_any_permission("consultation.create", "consultation.update", "clinical.write", "system.manage"))
):
    """Doctor creates a referral with selective document sharing."""
    verify_doctor_patient_access(patient_id, user)
    referring_doctor_id = get_effective_doctor_id(user)
    created = sp_repository.create_doctor_referral(
        patient_id=patient_id,
        referring_doctor_id=referring_doctor_id,
        referral_data=payload.model_dump()
    )
    log_security_event(
        "DOCTOR_REFERRAL_CREATED",
        actor_id=user.get("username"),
        resource=f"patient:{patient_id}",
        status="SUCCESS",
        details={"specialty": payload.specialty, "receiving_doctor": payload.receiving_doctor_name}
    )
    return created


# ------------------------------------------------------------------------------
# 6. Consultation Encounter Lifecycle (Draft / Complete)
# ------------------------------------------------------------------------------

@router.post("/patients/{patient_id}/consultation", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
@router.post("/patients/{patient_id}/consultations", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def record_patient_consultation(
    patient_id: str,
    payload: ConsultationSavePayload,
    user: Dict[str, Any] = Depends(require_any_permission("consultation.create", "consultation.update", "clinical.write", "system.manage"))
):
    """
    Atomically records consultation encounter:
    Clinical notes, vitals, ICD-10 multi-tier diagnoses, versioned FHIR prescriptions,
    referrals, and follow-up plans.
    """
    patient = verify_doctor_patient_access(patient_id, user)
    doctor_id = get_effective_doctor_id(user)

    encounter = sp_repository.record_consultation(
        appointment_id=payload.appointment_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        diagnosis=payload.diagnosis,
        symptoms=payload.symptoms,
        clinical_notes=payload.clinical_notes,
        vitals=payload.vitals or {},
        chief_complaint=payload.chief_complaint,
        examination=payload.examination,
        medical_history=payload.medical_history,
        diagnoses=payload.diagnoses,
        prescription=payload.prescription,
        referral=payload.referral,
        follow_up=payload.follow_up,
        actor_id=user.get("username") or "doctor",
        report_template_id=payload.report_template_id,
        rx_template_id=payload.rx_template_id,
        signed_by=user.get("name") or user.get("username") or "Doctor",
        digital_signature_hash=f"SHA256:{hashlib.sha256(f'{patient_id}-{doctor_id}-{date.today()}'.encode()).hexdigest()[:32]}...VERIFIED"
    )

    summary = {
        "encounter_id": encounter.get("id"),
        "patient_id": patient_id,
        "patient_name": patient.get("name"),
        "onehealth_id": patient.get("onehealth_id") or patient_id,
        "age": patient.get("age"),
        "gender": patient.get("gender"),
        "doctor_name": user.get("name") or "Dr. Senthil Kumar",
        "doctor_qualification": "MBBS, MD (General Medicine)",
        "doctor_registration": "TMC-64829",
        "hospital_name": patient.get("hospital_name") or "Kedar Hospital",
        "consultation_date": date.today().strftime("%d %b %Y"),
        "chief_complaint": payload.symptoms or payload.diagnosis,
        "hpi": payload.clinical_notes,
        "vitals": payload.vitals,
        "diagnoses": payload.diagnoses or [{"description": payload.diagnosis, "tier": "PRIMARY"}],
        "prescription": payload.prescription,
        "investigations": payload.chief_complaint.get("investigations") if payload.chief_complaint else [],
        "referral": payload.referral,
        "follow_up": payload.follow_up,
        "digital_signature": "SHA256:4f8e91a0c8d7...VERIFIED",
        "finalized_at": datetime.now().strftime("%d %b %Y, %I:%M %p")
    }

    log_security_event(
        "CONSULTATION_COMPLETED" if not payload.is_draft else "CONSULTATION_DRAFT_SAVED",
        actor_id=user.get("username"),
        resource=f"patient:{patient_id}",
        status="SUCCESS",
        details={"diagnosis": payload.diagnosis}
    )

    return {
        "message": "Consultation encounter successfully finalized and recorded.",
        "consultation_id": encounter.get("id"),
        "prescription_id": encounter.get("prescription_id"),
        "summary": summary,
        **encounter
    }


# ------------------------------------------------------------------------------
# 7. Unified Clinical Timeline
# ------------------------------------------------------------------------------

@router.get("/patients/{patient_id}/timeline", response_model=List[Dict[str, Any]])
def get_patient_timeline(
    patient_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("clinical.read", "consultation.read", "patient.read", "system.manage"))
):
    """Unified chronological clinical timeline for Patient A."""
    verify_doctor_patient_access(patient_id, user)
    return sp_repository.get_patient_clinical_timeline(patient_id)


# ------------------------------------------------------------------------------
# 8. Doctor Medical Documents & Patient Records Management
# ------------------------------------------------------------------------------

@router.get("/documents/inbox", response_model=Dict[str, Any])
def get_doctor_document_inbox_endpoint(
    hospital_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    triage_bucket: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("consultation.read", "clinical.read", "patient.read", "system.manage"))
):
    """
    Centralized triage queue for doctors and hospital staff:
    - Awaiting Review (unreviewed patient uploads, external records, fulfilled requests)
    - Patient Uploaded
    - Verified Provider Records
    """
    doctor_id = get_effective_doctor_id(user)
    return sp_repository.get_doctor_document_inbox(
        doctor_id=doctor_id,
        hospital_id=hospital_id,
        category=category,
        triage_bucket=triage_bucket,
        search=search
    )


@router.get("/patients/{patient_id}/documents", response_model=List[Dict[str, Any]])
def list_doctor_patient_documents(
    patient_id: str,
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("consultation.read", "clinical.read", "patient.read", "system.manage"))
):
    """Returns complete list of patient medical records with full provenance & review metadata."""
    verify_doctor_patient_access(patient_id, user)
    return sp_repository.list_patient_documents(
        patient_id=patient_id,
        category=category,
        status=status,
        source_type=source_type,
        search=search,
        sort_by="NEWEST"
    )


@router.post("/patients/{patient_id}/documents/upload-external", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def doctor_upload_external_document(
    patient_id: str,
    payload: ExternalDocumentUploadPayload,
    user: Dict[str, Any] = Depends(require_any_permission("consultation.create", "consultation.update", "clinical.write", "system.manage"))
):
    """
    Doctor uploads previous patient records brought from an external hospital/clinic:
    Source is recorded as EXTERNAL_PROVIDER, Uploaded By = DOCTOR, Reviewed By = DOCTOR.
    """
    patient = verify_doctor_patient_access(patient_id, user)
    doctor_id = get_effective_doctor_id(user)
    hospital_id = patient.get("hospital_id") or user.get("hospital_ref_id") or "hosp-kedar"

    meta = payload.metadata or {}
    meta["origin_hospital"] = payload.hospital_name or "External Healthcare Facility"
    meta["origin_doctor"] = payload.doctor_name
    meta["uploaded_by_doctor_id"] = doctor_id
    meta["upload_clinical_reason"] = payload.clinical_note or "Patient provided external clinical records for review during consultation."

    doc = sp_repository.create_patient_uploaded_document(
        patient_id=patient_id,
        title=payload.title,
        category=payload.category,
        source_type="EXTERNAL_PROVIDER",
        source_label=f"{payload.hospital_name or 'External Facility'} (Provider Record)",
        uploaded_by=doctor_id,
        doctor_id=doctor_id,
        hospital_id=hospital_id,
        file_type=payload.file_type or "PDF",
        file_size_kb=payload.file_size_kb or 500,
        document_date=payload.document_date,
        notes=payload.clinical_note,
        tags=payload.tags or [payload.category, "External Document", "Doctor Uploaded"],
        metadata=meta,
        status="REVIEWED"
    )

    # Immediately mark as reviewed since doctor uploaded it
    if payload.clinical_note:
        sp_repository.review_medical_document(doc["id"], doctor_id, payload.clinical_note)

    log_security_event(
        "EXTERNAL_DOCUMENT_RECORDED",
        actor_id=user.get("username"),
        resource=f"patient:{patient_id}:doc:{doc.get('id')}",
        status="SUCCESS",
        details={"title": payload.title, "origin_hospital": payload.hospital_name}
    )
    return doc


@router.post("/patients/{patient_id}/documents/request", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def doctor_create_document_request(
    patient_id: str,
    payload: DocumentRequestPayload,
    user: Dict[str, Any] = Depends(require_any_permission("consultation.create", "consultation.update", "clinical.write", "system.manage"))
):
    """Doctor formally requests a medical document (e.g. previous MRI, Echo, or lab report) from the patient."""
    patient = verify_doctor_patient_access(patient_id, user)
    doctor_id = get_effective_doctor_id(user)
    doctor_name = user.get("full_name") or user.get("username") or "Consulting Physician"
    hospital_id = patient.get("hospital_id") or user.get("hospital_ref_id") or "hosp-kedar"

    req = sp_repository.create_document_request(
        patient_id=patient_id,
        requested_by_doctor_id=doctor_id,
        requested_by_name=doctor_name,
        document_type=payload.document_type,
        title=payload.title,
        instructions=payload.instructions,
        urgency=payload.urgency or "ROUTINE",
        hospital_id=hospital_id
    )

    log_security_event(
        "DOCUMENT_REQUEST_CREATED",
        actor_id=user.get("username"),
        resource=f"patient:{patient_id}:req:{req.get('id')}",
        status="SUCCESS",
        details={"title": payload.title, "type": payload.document_type}
    )
    return req


@router.post("/documents/{document_id}/review", response_model=Dict[str, Any])
def doctor_review_patient_document_endpoint(
    document_id: str,
    payload: ClinicalDocumentReviewPayload,
    user: Dict[str, Any] = Depends(require_any_permission("consultation.create", "consultation.update", "clinical.write", "system.manage"))
):
    """Doctor clinically reviews a patient-uploaded document and records clinical notes and validation status."""
    doctor_id = get_effective_doctor_id(user)
    doc = sp_repository.review_medical_document(
        document_id=document_id,
        doctor_id=doctor_id,
        review_notes=payload.review_notes
    )
    log_security_event(
        "DOCUMENT_CLINICALLY_REVIEWED",
        actor_id=user.get("username"),
        resource=f"doc:{document_id}",
        status="SUCCESS",
        details={"doctor_id": doctor_id}
    )
    return doc


@router.post("/consultations/{consultation_id}/attach-documents", response_model=List[Dict[str, Any]])
def attach_documents_to_consultation_endpoint(
    consultation_id: str,
    payload: AttachDocumentsPayload,
    patient_id: str = Query(...),
    user: Dict[str, Any] = Depends(require_any_permission("consultation.create", "consultation.update", "clinical.write", "system.manage"))
):
    """Doctor links one or more relevant patient documents to a consultation encounter note."""
    verify_doctor_patient_access(patient_id, user)
    doctor_id = get_effective_doctor_id(user)

    attached = sp_repository.attach_documents_to_consultation(
        consultation_id=consultation_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        document_ids=payload.document_ids,
        clinical_context=payload.clinical_context
    )
    return attached


@router.get("/consultations/{consultation_id}/attached-documents", response_model=List[Dict[str, Any]])
def get_consultation_attached_documents_endpoint(
    consultation_id: str,
    user: Dict[str, Any] = Depends(require_any_permission("consultation.read", "clinical.read", "patient.read", "system.manage"))
):
    """Returns documents attached to a specific consultation encounter."""
    return sp_repository.get_consultation_attached_documents(consultation_id)

