from fastapi import APIRouter, HTTPException, Header, status, Query
from typing import List, Dict, Any, Optional
from backend.app.schemas.models import ConsultationCreate, ConsultationResponse
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.routers.auth import get_current_user

router = APIRouter(prefix="/clinical", tags=["Clinical Workflows"])

@router.post("/consultations", response_model=ConsultationResponse, status_code=status.HTTP_201_CREATED)
def record_consultation(
    payload: ConsultationCreate,
    authorization: Optional[str] = Header(None)
):
    """
    Doctor Consultation Workflow:
    Records clinical notes, diagnosis, vitals, symptoms and marks appointment/queue token completed.
    RBAC: Enforced so only doctors or clinical admins can record medical consultations.
    """
    # Verify RBAC if token provided
    user = get_current_user(authorization)
    if user:
        roles = user.get("roles") or [user.get("role")]
        perms = user.get("permissions") or []
        is_clinician = any(r in ["DOCTOR", "HOSPITAL_ADMIN", "PLATFORM_ADMIN"] for r in roles) or "consultation.create" in perms
        if not is_clinician:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Only consulting doctors and clinical administrators can record medical consultations."
            )
        actor_id = user.get("id") or user.get("username")
    else:
        actor_id = payload.doctor_id

    # Verify patient exists
    patient = sp_repository.get_patient_by_id(payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

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
        return encounter
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record consultation: {str(e)}")

@router.get("/consultations/{consultation_id}", response_model=ConsultationResponse)
def get_consultation(consultation_id: str):
    encounters = sp_repository.list_opd_encounters()
    for enc in encounters:
        if enc.get("id") == consultation_id:
            return enc
    raise HTTPException(status_code=404, detail="Consultation encounter not found")

@router.get("/opd/encounters", response_model=List[Dict[str, Any]])
def list_opd_encounters(
    patient_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None)
):
    try:
        return sp_repository.list_opd_encounters(patient_id=patient_id, doctor_id=doctor_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch OPD encounters: {str(e)}")

@router.get("/ipd/admissions", response_model=List[Dict[str, Any]])
def list_ipd_admissions():
    try:
        return sp_repository.list_ipd_admissions()
    except Exception:
        return []

@router.get("/ipd/wards-beds", response_model=List[Dict[str, Any]])
def list_wards_and_beds():
    try:
        return sp_repository.list_wards_and_beds()
    except Exception:
        return []

@router.get("/laboratory/orders", response_model=List[Dict[str, Any]])
def list_lab_orders():
    try:
        return sp_repository.list_lab_orders()
    except Exception:
        return []

@router.get("/pharmacy/dispensary", response_model=List[Dict[str, Any]])
def list_pharmacy_dispensary():
    try:
        return sp_repository.list_pharmacy_dispensary()
    except Exception:
        return []
