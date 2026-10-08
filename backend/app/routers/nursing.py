from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import get_current_user_context, get_optional_user_context

router = APIRouter(prefix="/nursing", tags=["Nursing Workflow, Clinical Vitals, Notes & MAR"])

class RecordObservationRequest(BaseModel):
    patient_id: str
    vital_type: str
    value: float
    unit: str
    pain_score: Optional[int] = None
    encounter_id: Optional[str] = None
    admission_id: Optional[str] = None
    notes: Optional[str] = None

class RecordVitalsBatchRequest(BaseModel):
    patient_id: str
    encounter_id: Optional[str] = None
    admission_id: Optional[str] = None
    temperature: Optional[float] = None
    heart_rate: Optional[float] = None
    blood_pressure_systolic: Optional[float] = None
    blood_pressure_diastolic: Optional[float] = None
    respiratory_rate: Optional[float] = None
    spo2: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    pain_score: Optional[int] = None
    notes: Optional[str] = None

class RecordNursingNoteRequest(BaseModel):
    patient_id: str
    admission_id: Optional[str] = None
    note_type: Optional[str] = "GENERAL_ASSESSMENT"
    assessment: str
    care_provided: str
    patient_response: Optional[str] = None
    concerns: Optional[str] = None

class RecordMedicationAdminRequest(BaseModel):
    prescription_id: str
    patient_id: str
    admission_id: Optional[str] = None
    medicine_name: str
    dose: str
    route: str
    status: Optional[str] = "ADMINISTERED"
    reason_not_administered: Optional[str] = None

@router.get("/observations")
def list_nursing_observations(
    patient_id: str = Query(...),
    encounter_id: Optional[str] = Query(None),
    admission_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=200),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Lists vital signs and nursing observations timeline for a patient."""
    return sp_repository.list_nursing_observations(
        patient_id=patient_id,
        encounter_id=encounter_id,
        admission_id=admission_id,
        limit=limit
    )

@router.post("/observations")
def record_nursing_observation(
    payload: RecordObservationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Records a single vital observation point."""
    nurse_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-nurse"
    hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    obs = sp_repository.record_nursing_observation(
        patient_id=payload.patient_id,
        hospital_id=hospital_id,
        nurse_id=nurse_id,
        vital_type=payload.vital_type,
        value=payload.value,
        unit=payload.unit,
        pain_score=payload.pain_score,
        encounter_id=payload.encounter_id,
        admission_id=payload.admission_id,
        notes=payload.notes
    )
    return {"status": "SUCCESS", "message": "Observation recorded", "data": obs}

@router.post("/vitals/batch")
def record_vitals_batch(
    payload: RecordVitalsBatchRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Atomically records a comprehensive battery of vital signs."""
    nurse_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-nurse"
    hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    vitals_data = {
        "temperature": payload.temperature,
        "heart_rate": payload.heart_rate,
        "blood_pressure_systolic": payload.blood_pressure_systolic,
        "blood_pressure_diastolic": payload.blood_pressure_diastolic,
        "respiratory_rate": payload.respiratory_rate,
        "spo2": payload.spo2,
        "weight": payload.weight,
        "height": payload.height,
        "pain_score": payload.pain_score,
        "notes": payload.notes
    }

    obs_list = sp_repository.record_vitals_batch(
        patient_id=payload.patient_id,
        hospital_id=hospital_id,
        nurse_id=nurse_id,
        vitals_data=vitals_data,
        encounter_id=payload.encounter_id,
        admission_id=payload.admission_id
    )
    return {"status": "SUCCESS", "message": f"{len(obs_list)} vitals recorded successfully", "data": obs_list}

@router.get("/notes")
def list_nursing_notes(
    patient_id: str = Query(...),
    admission_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Lists nursing shift notes and clinical evaluations."""
    return sp_repository.list_nursing_notes(
        patient_id=patient_id,
        admission_id=admission_id,
        limit=limit
    )

@router.post("/notes")
def record_nursing_note(
    payload: RecordNursingNoteRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Creates a nursing shift progress note."""
    nurse_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-nurse"
    hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    note = sp_repository.record_nursing_note(
        patient_id=payload.patient_id,
        hospital_id=hospital_id,
        nurse_id=nurse_id,
        note_type=payload.note_type or "GENERAL_ASSESSMENT",
        assessment=payload.assessment,
        care_provided=payload.care_provided,
        patient_response=payload.patient_response,
        concerns=payload.concerns,
        admission_id=payload.admission_id
    )
    return {"status": "SUCCESS", "message": "Nursing note recorded", "data": note}

@router.get("/medication-administrations")
def list_medication_administrations(
    patient_id: str = Query(...),
    admission_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=200),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user_context)
):
    """Lists Medication Administration Record (MAR) log."""
    return sp_repository.list_medication_administrations(
        patient_id=patient_id,
        admission_id=admission_id,
        limit=limit
    )

@router.post("/medication-administrations")
def record_medication_administration(
    payload: RecordMedicationAdminRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """Nurse confirms medicine administration (MAR)."""
    nurse_id = current_user.get("user_ref_id") or current_user.get("id") or "usr-nurse"
    hospital_id = current_user.get("hospital_id") or "hosp-kedar"

    mar = sp_repository.record_medication_administration(
        prescription_id=payload.prescription_id,
        patient_id=payload.patient_id,
        hospital_id=hospital_id,
        nurse_id=nurse_id,
        medicine_name=payload.medicine_name,
        dose=payload.dose,
        route=payload.route,
        status=payload.status or "ADMINISTERED",
        reason_not_administered=payload.reason_not_administered,
        admission_id=payload.admission_id
    )
    return {"status": "SUCCESS", "message": "Medication administration logged", "data": mar}
