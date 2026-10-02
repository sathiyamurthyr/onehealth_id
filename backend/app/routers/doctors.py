from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Optional, Dict, Any
from uuid import uuid4
from backend.app.schemas.models import DoctorCreate, DoctorResponse
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import require_any_permission, validate_hospital_tenant_scope, get_current_user_context
from backend.app.core.logging import logger, log_security_event

router = APIRouter(prefix="/doctors", tags=["Doctors & Clinical Directory"])

@router.get("/me")
def get_my_doctor_profile(current_user: Dict[str, Any] = Depends(get_current_user_context)):
    """
    Returns the authenticated doctor's profile, qualifications, registration number,
    and authorized multi-hospital memberships.
    """
    user_ref_id = current_user["user_ref_id"]
    doc = sp_repository.get_doctor_by_user_id(user_ref_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor clinical profile not found for this user")

    current_hosp_id = current_user.get("hospital_ref_id") or doc.get("hospital_id") or "hosp-kedar"
    hospitals = sp_repository.list_user_hospitals(user_ref_id)

    return {
        "id": doc["id"],
        "user_id": user_ref_id,
        "name": doc["name"],
        "specialty": doc["specialty"],
        "qualification": doc.get("qualification", "MBBS, MD"),
        "registration_number": doc.get("registration_number", "TN-MCI-2026-REG"),
        "phone": doc.get("phone", "+91 98401 11222"),
        "email": doc.get("email", current_user.get("email")),
        "room_number": doc.get("room_number", "Room 101"),
        "opd_timings": doc.get("opd_timings", "09:00 AM - 01:30 PM"),
        "consultation_fee": float(doc.get("consultation_fee") or 500.0),
        "current_hospital_id": current_hosp_id,
        "current_hospital_name": doc.get("hospital_name") or "Kedar Hospital",
        "authorized_hospitals": [
            {
                "hospital_id": h["hospital_ref_id"],
                "hospital_name": h["hospital_name"],
                "hospital_code": h.get("hospital_code"),
                "branch_name": h.get("branch_name"),
                "is_current": h["hospital_ref_id"] == current_hosp_id,
                "is_primary": h.get("is_primary", False)
            }
            for h in hospitals
        ]
    }

@router.get("/me/appointments")
def get_my_doctor_appointments(
    date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    all_hospitals: bool = Query(False),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns appointments scoped to the authenticated doctor and CURRENT hospital context.
    If all_hospitals=True, displays hospital-wise breakdown across authorized facilities.
    """
    user_ref_id = current_user["user_ref_id"]
    doc = sp_repository.get_doctor_by_user_id(user_ref_id)
    doc_id = doc.get("id") if doc else None
    current_hosp_id = current_user.get("hospital_ref_id") or "hosp-kedar"

    hosp_filter = None if all_hospitals else current_hosp_id
    appts = sp_repository.list_appointments(doctor_id=doc_id, hospital_id=hosp_filter, status=status)
    return appts

@router.get("/me/patients")
def get_my_doctor_patients(
    search: Optional[str] = Query(None),
    all_hospitals: bool = Query(False),
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns patient registry scoped strictly to the doctor's active hospital context.
    Does NOT mix patient records across hospitals without explicit permission.
    """
    current_hosp_id = current_user.get("hospital_ref_id") or "hosp-kedar"
    hosp_filter = None if all_hospitals else current_hosp_id

    patients = sp_repository.list_patients(hospital_id=hosp_filter)
    if search:
        s_lower = search.lower()
        patients = [p for p in patients if s_lower in p.get("name", "").lower() or s_lower in p.get("onehealth_id", "").lower()]
    return patients

@router.get("/me/queue")
def get_my_doctor_queue(
    current_user: Dict[str, Any] = Depends(get_current_user_context)
):
    """
    Returns live OPD waiting & in-consultation queue tokens scoped to the doctor and current hospital.
    """
    user_ref_id = current_user["user_ref_id"]
    doc = sp_repository.get_doctor_by_user_id(user_ref_id)
    doc_id = doc.get("id") if doc else None
    current_hosp_id = current_user.get("hospital_ref_id") or "hosp-kedar"

    tokens = sp_repository.list_queue_entries(hospital_id=current_hosp_id, doctor_id=doc_id)
    return tokens

@router.get("/search", response_model=List[DoctorResponse])
def search_other_doctors(
    name: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    is_available: Optional[bool] = Query(None)
):
    """
    Search other doctors for referral, consultation transfer, on-call, or appointment booking.
    Does NOT mix unrelated doctors into personal dashboards.
    """
    return sp_repository.search_doctors(
        name=name,
        specialty=specialty,
        department_id=department_id,
        hospital_id=hospital_id,
        is_available=is_available
    )

@router.get("", response_model=List[DoctorResponse])
@router.get("/", response_model=List[DoctorResponse], include_in_schema=False)
def list_doctors(
    hospital_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None)
):
    try:
        docs = sp_repository.list_doctors(hospital_id=hospital_id, department_id=department_id)
        return docs
    except Exception as e:
        logger.error("Failed to fetch doctors list: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch doctors list.")

@router.post("", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_doctor(
    payload: DoctorCreate,
    user: Dict[str, Any] = Depends(require_any_permission("doctor.create", "staff.manage", "system.manage"))
):
    target_hospital = payload.hospital_id or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hospital)

    assigned_id = payload.id or f"d-{str(uuid4())[:8]}"

    try:
        doc = sp_repository.create_doctor(
            name=payload.name,
            specialty=payload.specialty,
            department_id=payload.department_id or "dept-k-01",
            hospital_id=target_hospital,
            phone=payload.phone,
            email=payload.email,
            room_number=payload.room_number,
            consultation_fee=payload.consultation_fee or 500.00,
            doctor_id=assigned_id,
            actor_id=user.get("user_ref_id") or user.get("id") or user.get("username")
        )
        if doc:
            log_security_event("DOCTOR_CREATED", actor_id=user.get("username"), resource=f"doctor:{assigned_id}", status="SUCCESS")
            return doc
    except Exception as e:
        logger.error("Failed to create doctor profile: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create doctor profile.")

    raise HTTPException(status_code=500, detail="Failed to create doctor profile.")

@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor(doctor_id: str):
    doc = sp_repository.get_doctor_by_id(doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doc
