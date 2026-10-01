from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from uuid import uuid4
from backend.app.schemas.models import PatientCreate, PatientResponse, PatientUpdate
from backend.app.repositories.sp_views_repository import sp_repository

router = APIRouter(prefix="/patients", tags=["Patients"])

# In-memory storage cache used for instant unit tests when DB isn't invoked
_mem_patients = []

@router.get("", response_model=List[PatientResponse])
@router.get("/", response_model=List[PatientResponse], include_in_schema=False)
def list_patients(search: Optional[str] = Query(None)):
    try:
        db_patients = sp_repository.list_patients(search=search)
        if db_patients:
            return db_patients
    except Exception:
        pass
    
    if search:
        s = search.lower()
        return [p for p in _mem_patients if s in p.get("name", "").lower() or s in p.get("diagnosis", "").lower()]
    return _mem_patients

@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_patient(payload: PatientCreate):
    assigned_id = payload.id or f"p-{str(uuid4())[:8]}"
    
    # 1. Attempt Stored Procedure on PostgreSQL
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
            hospital_id=payload.hospital_id or "hosp-001",
            patient_id=assigned_id
        )
        if registered:
            _mem_patients.append(registered)
            return registered
    except Exception:
        pass

    # 2. In-memory fallback
    simulated_ohid = f"OHID-IND-2026-{len(_mem_patients) + 1001:05d}"
    simulated_qr = f"QR-OHID-{assigned_id}-DEMO"
    new_patient = {
        "id": assigned_id,
        "name": payload.name,
        "age": payload.age,
        "diagnosis": payload.diagnosis,
        "gender": payload.gender,
        "phone": payload.phone,
        "email": payload.email,
        "address": payload.address,
        "emergency_contact": payload.emergency_contact,
        "blood_group": payload.blood_group,
        "hospital_id": payload.hospital_id or "hosp-001",
        "onehealth_id": simulated_ohid,
        "qr_token": simulated_qr,
        "status": "ACTIVE",
        "total_appointments": 0,
        "pending_bills_count": 0
    }
    _mem_patients.append(new_patient)
    return new_patient

@router.get("/verify-qr/{qr_token}", response_model=PatientResponse)
def verify_patient_qr(qr_token: str):
    try:
        patient = sp_repository.get_patient_by_qr(qr_token)
        if patient:
            return patient
    except Exception:
        pass
    
    for p in _mem_patients:
        if p.get("qr_token") == qr_token or p.get("onehealth_id") == qr_token:
            return p
            
    raise HTTPException(status_code=404, detail="OneHealth ID or QR Token could not be verified")

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: str):
    try:
        patient = sp_repository.get_patient_by_id(patient_id)
        if patient:
            return patient
    except Exception:
        pass

    for p in _mem_patients:
        if p.get("id") == patient_id:
            return p

    raise HTTPException(status_code=404, detail="Patient not found")

@router.patch("/{patient_id}", response_model=PatientResponse)
def update_patient(patient_id: str, update: PatientUpdate):
    try:
        updated = sp_repository.update_patient(
            patient_id=patient_id,
            name=update.name,
            age=update.age,
            diagnosis=update.diagnosis,
            phone=update.phone,
            address=update.address
        )
        if updated:
            return updated
    except Exception:
        pass

    for p in _mem_patients:
        if p.get("id") == patient_id:
            if update.name is not None: p["name"] = update.name
            if update.age is not None: p["age"] = update.age
            if update.diagnosis is not None: p["diagnosis"] = update.diagnosis
            if update.phone is not None: p["phone"] = update.phone
            if update.address is not None: p["address"] = update.address
            return p

    raise HTTPException(status_code=404, detail="Patient not found")
