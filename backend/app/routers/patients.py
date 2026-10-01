from fastapi import APIRouter, HTTPException, Query, status, Header
from typing import List, Optional
from uuid import uuid4
from backend.app.schemas.models import (
    PatientCreate, PatientResponse, PatientUpdate,
    DuplicateCheckRequest, DuplicateCheckResponse,
    QRTokenResolveRequest
)
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.response import success_response, error_response

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.get("", response_model=List[PatientResponse])
@router.get("/", response_model=List[PatientResponse], include_in_schema=False)
def list_patients(
    search: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    try:
        db_patients = sp_repository.list_patients(
            search=search,
            hospital_id=hospital_id,
            branch_id=branch_id,
            limit=limit,
            offset=offset
        )
        return db_patients
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch patients: {str(e)}")

@router.post("/check-duplicate", response_model=DuplicateCheckResponse)
@router.post("/check-duplicates", response_model=DuplicateCheckResponse, include_in_schema=False)
def check_duplicate(payload: DuplicateCheckRequest):
    """
    Search for potential matching patient records before registering a new patient.
    Matches phone, email, identity number, or name + age.
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
def create_patient(payload: PatientCreate):
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
            hospital_id=payload.hospital_id or "hosp-kedar",
            branch_id=payload.branch_id or "branch-kedar-01",
            patient_id=assigned_id,
            is_demo_data=payload.is_demo_data or False
        )
        if registered:
            return registered
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

    raise HTTPException(status_code=500, detail="Failed to register patient")

@router.post("/qr/resolve", response_model=PatientResponse)
def resolve_qr_token(payload: QRTokenResolveRequest):
    """
    Resolves a Zero-Knowledge QR Token into an authorized patient profile
    and logs the access attempt in the audit log.
    """
    patient = sp_repository.resolve_qr_token(payload.qr_token, scanned_by=payload.scanned_by or "staff")
    if not patient:
        raise HTTPException(status_code=404, detail="OneHealth ID or QR Token could not be verified")
    return patient

@router.get("/verify-qr/{qr_token}", response_model=PatientResponse)
def verify_patient_qr(qr_token: str):
    patient = sp_repository.resolve_qr_token(qr_token, scanned_by="staff")
    if not patient:
        raise HTTPException(status_code=404, detail="OneHealth ID or QR Token could not be verified")
    return patient

@router.post("/{patient_id}/qr/rotate", response_model=PatientResponse)
def rotate_qr_token(patient_id: str):
    """
    Rotates the zero-knowledge QR token for a patient to prevent stale/captured code reuse.
    """
    updated = sp_repository.rotate_patient_qr(patient_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return updated

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: str):
    patient = sp_repository.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.patch("/{patient_id}", response_model=PatientResponse)
def update_patient(patient_id: str, update: PatientUpdate):
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
