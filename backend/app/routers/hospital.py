from fastapi import APIRouter, Query, HTTPException, Depends, Body, Path
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    get_current_user_context,
    require_any_permission,
    validate_hospital_tenant_scope,
)

router = APIRouter(prefix="/hospital", tags=["Hospital & Facility Administration"])

# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================

class DoctorRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    email: str = Field(..., max_length=128)
    phone: str = Field(..., min_length=5, max_length=32)
    gender: str = Field("Male", max_length=16)
    specialty: str = Field(..., max_length=128)
    qualification: str = Field("MBBS, MD", max_length=128)
    registration_number: str = Field(..., max_length=128)
    registration_authority: str = Field("Tamil Nadu Medical Council", max_length=128)
    department_id: Optional[str] = None
    opd_counter_id: Optional[str] = None
    room_number: Optional[str] = "Room 101"
    employment_type: Optional[str] = "FULL_TIME"
    hospital_id: Optional[str] = "hosp-kedar"

class NurseRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    email: str = Field(..., max_length=128)
    phone: str = Field(..., min_length=5, max_length=32)
    qualification: str = Field("B.Sc Nursing", max_length=128)
    registration_number: str = Field("TN-NUR-2025-REG", max_length=128)
    department_id: Optional[str] = None
    ward: Optional[str] = "OPD Triage Wing A"
    shift: Optional[str] = "MORNING"
    hospital_id: Optional[str] = "hosp-kedar"

class TraineeRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    email: str = Field(..., max_length=128)
    phone: str = Field(..., min_length=5, max_length=32)
    training_type: str = Field("INTERN", max_length=64)
    institution: str = Field("Madras Medical College", max_length=256)
    qualification: str = Field("MBBS (Intern)", max_length=128)
    department_id: Optional[str] = None
    supervisor_doctor_id: Optional[str] = None
    supervisor_name: Optional[str] = "Dr. Senthil Nathan"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    hospital_id: Optional[str] = "hosp-kedar"

class OPDCounterUpsertRequest(BaseModel):
    id: Optional[str] = None
    counter_name: str = Field(..., max_length=128)
    counter_number: str = Field(..., max_length=32)
    department_id: Optional[str] = None
    location: Optional[str] = "Ground Floor OPD Wing"
    token_prefix: str = Field("OPD-", max_length=16)
    token_start: int = Field(1, ge=1)
    status: str = Field("ACTIVE", max_length=32)
    assigned_doctor_id: Optional[str] = None
    operating_hours: str = Field("08:00 AM - 02:00 PM", max_length=64)
    hospital_id: Optional[str] = "hosp-kedar"

class StaffRosterUpdateRequest(BaseModel):
    on_duty_status: Optional[str] = None
    shift: Optional[str] = None
    room_number: Optional[str] = None
    opd_counter_id: Optional[str] = None

class HospitalServiceUpsertRequest(BaseModel):
    id: Optional[str] = None
    service_name: str = Field(..., max_length=128)
    service_code: str = Field(..., max_length=32)
    category: str = Field("CONSULTATION", max_length=64)
    department_id: Optional[str] = None
    duration_mins: int = Field(15, ge=1, le=240)
    fee: float = Field(350.00, ge=0.0)
    status: str = Field("ACTIVE", max_length=32)
    hospital_id: Optional[str] = "hosp-kedar"

class StaffInvitationRequest(BaseModel):
    full_name: str = Field(..., max_length=128)
    email: str = Field(..., max_length=128)
    mobile: str = Field(..., min_length=5, max_length=32)
    role_code: str = Field("DOCTOR", max_length=64)
    department_id: Optional[str] = None
    designation: Optional[str] = None
    employment_type: str = Field("FULL_TIME", max_length=64)
    hospital_id: Optional[str] = "hosp-kedar"

class CreateHospitalUserRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=64)
    middle_name: Optional[str] = Field(None, max_length=64)
    last_name: str = Field(..., min_length=1, max_length=64)
    photo_url: Optional[str] = None
    gender: Optional[str] = "Male"
    dob: Optional[str] = None
    mobile: str = Field(..., min_length=5, max_length=32)
    email: str = Field(..., min_length=3, max_length=128)
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    employee_id: Optional[str] = None
    joining_date: Optional[str] = None
    employment_type: str = Field("FULL_TIME", max_length=32)
    designation: str = Field(..., max_length=128)
    reporting_manager_id: Optional[str] = None
    reporting_manager_name: Optional[str] = None
    employment_status: Optional[str] = "ACTIVE"
    role_code: str = Field(..., max_length=64)
    additional_roles: Optional[List[str]] = []
    branch_id: Optional[str] = "br-kedar-01"
    branch_ids: Optional[List[str]] = []
    department_id: Optional[str] = "dept-k-01"
    department_ids: Optional[List[str]] = []
    custom_permissions: Optional[List[str]] = []
    shift_access: Optional[str] = "ALL_SHIFTS"
    login_enabled: bool = True
    mfa_enabled: bool = False
    role_metadata: Optional[Dict[str, Any]] = {}
    credential_number: Optional[str] = None
    credential_authority: Optional[str] = None
    credential_expiry_date: Optional[str] = None
    verification_status: Optional[str] = "PENDING"
    password: Optional[str] = "Welcome@123"
    send_invitation: bool = False
    hospital_id: Optional[str] = "hosp-kedar"

class UpdateHospitalUserRequest(BaseModel):
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    photo_url: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    designation: Optional[str] = None
    department_id: Optional[str] = None
    branch_id: Optional[str] = None
    employment_type: Optional[str] = None
    role_code: Optional[str] = None
    additional_roles: Optional[List[str]] = None
    branch_ids: Optional[List[str]] = None
    department_ids: Optional[List[str]] = None
    custom_permissions: Optional[List[str]] = None
    shift_access: Optional[str] = None
    login_enabled: Optional[bool] = None
    role_metadata: Optional[Dict[str, Any]] = None
    credential_number: Optional[str] = None
    credential_authority: Optional[str] = None
    credential_expiry_date: Optional[str] = None
    verification_status: Optional[str] = None

class SetUserStatusRequest(BaseModel):
    status: str = Field(..., max_length=32)
    reason: Optional[str] = None

class UserSecurityActionRequest(BaseModel):
    action: str = Field(..., max_length=64) # TOGGLE_LOGIN, UNLOCK, RESET_PASSWORD, REVOKE_SESSIONS

# =============================================================================
# 1. OVERVIEW & OPERATIONAL DASHBOARD
# =============================================================================

@router.get("/overview", response_model=Dict[str, Any])
def get_hospital_overview(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "dashboard.read", "system.manage")),
):
    """
    Returns live operational summary metrics for Hospital Administrator console.
    Strictly tenant-scoped.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.get_hospital_operational_overview(hospital_id=target_hosp)

# =============================================================================
# 2. DOCTOR ADMINISTRATION
# =============================================================================

@router.get("/doctors", response_model=List[Dict[str, Any]])
def list_hospital_doctors(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "doctor.read", "system.manage")),
):
    """
    Lists registered doctors with specialty, qualification, verification status, and OPD counter mapping.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_doctors_admin(hospital_id=target_hosp)

@router.post("/doctors/register", response_model=Dict[str, Any])
def register_hospital_doctor(
    payload: DoctorRegisterRequest,
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.create", "system.manage")),
):
    """
    Registers a new doctor and provisions their hospital department and OPD counter mapping.
    """
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.register_doctor_admin(
        hospital_id=target_hosp,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        gender=payload.gender,
        specialty=payload.specialty,
        qualification=payload.qualification,
        registration_number=payload.registration_number,
        registration_authority=payload.registration_authority,
        department_id=payload.department_id,
        opd_counter_id=payload.opd_counter_id,
        room_number=payload.room_number,
        employment_type=payload.employment_type,
        actor_id=user.get("username", "hospadmin")
    )

# =============================================================================
# 3. NURSES & TRAINEES ADMINISTRATION
# =============================================================================

@router.get("/nurses", response_model=List[Dict[str, Any]])
def list_hospital_nurses(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "nursing.tasks.manage", "system.manage")),
):
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_nurses_admin(hospital_id=target_hosp)

@router.post("/nurses/register", response_model=Dict[str, Any])
def register_hospital_nurse(
    payload: NurseRegisterRequest,
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.create", "system.manage")),
):
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.register_nurse_admin(
        hospital_id=target_hosp,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        qualification=payload.qualification,
        registration_number=payload.registration_number,
        department_id=payload.department_id,
        ward=payload.ward,
        shift=payload.shift,
        actor_id=user.get("username", "hospadmin")
    )

@router.get("/trainees", response_model=List[Dict[str, Any]])
def list_hospital_trainees(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "system.manage")),
):
    """
    Lists medical & nursing trainees, interns, and junior residents with restricted guardrails.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_trainees_admin(hospital_id=target_hosp)

@router.post("/trainees/register", response_model=Dict[str, Any])
def register_hospital_trainee(
    payload: TraineeRegisterRequest,
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.create", "system.manage")),
):
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.register_trainee_admin(
        hospital_id=target_hosp,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        training_type=payload.training_type,
        institution=payload.institution,
        qualification=payload.qualification,
        department_id=payload.department_id,
        supervisor_doctor_id=payload.supervisor_doctor_id,
        supervisor_name=payload.supervisor_name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        actor_id=user.get("username", "hospadmin")
    )

# =============================================================================
# 4. OPD COUNTERS & TOKEN RULES
# =============================================================================

@router.get("/counters", response_model=List[Dict[str, Any]])
def list_opd_counters(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "queue.read", "system.manage")),
):
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_opd_counters(hospital_id=target_hosp)

@router.post("/counters", response_model=Dict[str, Any])
def upsert_opd_counter(
    payload: OPDCounterUpsertRequest,
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "system.manage")),
):
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.upsert_opd_counter(
        hospital_id=target_hosp,
        counter_name=payload.counter_name,
        counter_number=payload.counter_number,
        department_id=payload.department_id,
        location=payload.location,
        token_prefix=payload.token_prefix,
        token_start=payload.token_start,
        status=payload.status,
        assigned_doctor_id=payload.assigned_doctor_id,
        operating_hours=payload.operating_hours,
        actor_id=user.get("username", "hospadmin"),
        counter_id=payload.id
    )

# =============================================================================
# 5. ON-DUTY ROSTER & SHIFT MANAGEMENT
# =============================================================================

@router.get("/roster", response_model=List[Dict[str, Any]])
def list_staff_roster(
    staff_type: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "system.manage")),
):
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_staff_rosters(hospital_id=target_hosp, staff_type=staff_type)

@router.put("/roster/{roster_id}", response_model=Dict[str, Any])
def update_staff_roster_entry(
    roster_id: str = Path(...),
    payload: StaffRosterUpdateRequest = Body(...),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "system.manage")),
):
    return sp_repository.update_staff_roster(
        roster_id=roster_id,
        on_duty_status=payload.on_duty_status,
        shift=payload.shift,
        room_number=payload.room_number,
        opd_counter_id=payload.opd_counter_id,
        actor_id=user.get("username", "hospadmin")
    )

# =============================================================================
# 6. HOSPITAL SERVICES & TARIFF CATALOGUE
# =============================================================================

@router.get("/services", response_model=List[Dict[str, Any]])
def list_hospital_services(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "billing.read", "system.manage")),
):
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_services_admin(hospital_id=target_hosp)

@router.post("/services", response_model=Dict[str, Any])
def upsert_hospital_service(
    payload: HospitalServiceUpsertRequest,
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "system.manage")),
):
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.upsert_hospital_service(
        hospital_id=target_hosp,
        service_name=payload.service_name,
        service_code=payload.service_code,
        category=payload.category,
        department_id=payload.department_id,
        duration_mins=payload.duration_mins,
        fee=payload.fee,
        status=payload.status,
        actor_id=user.get("username", "hospadmin"),
        service_id=payload.id
    )

# =============================================================================
# 7. HOSPITAL FACILITIES & COMPLIANCE
# =============================================================================

@router.get("/facilities", response_model=List[Dict[str, Any]])
def list_hospital_facilities(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "system.manage")),
):
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_facilities_admin(hospital_id=target_hosp)

@router.get("/compliance", response_model=List[Dict[str, Any]])
def list_hospital_compliance(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "system.manage")),
):
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_compliance_records(hospital_id=target_hosp)

# =============================================================================
# 8. STAFF INVITATIONS & ACCESS LOGS
# =============================================================================

@router.get("/invitations", response_model=List[Dict[str, Any]])
def list_staff_invitations(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "user.read", "system.manage")),
):
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_staff_invitations(hospital_id=target_hosp)

@router.post("/invitations", response_model=Dict[str, Any])
def create_staff_invitation(
    payload: StaffInvitationRequest,
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.create", "system.manage")),
):
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.create_staff_invitation(
        hospital_id=target_hosp,
        full_name=payload.full_name,
        email=payload.email,
        mobile=payload.mobile,
        role_code=payload.role_code,
        department_id=payload.department_id,
        employment_type=payload.employment_type,
        invited_by=user.get("username", "hospadmin")
    )

@router.get("/access-logs", response_model=List[Dict[str, Any]])
def list_patient_access_logs(
    limit: int = Query(100, ge=1, le=500),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("audit.read", "system.manage")),
):
    """
    Returns audit trail of patient record access for healthcare privacy compliance.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_patient_access_logs(hospital_id=target_hosp, limit=limit)

@router.get("/analytics", response_model=Dict[str, Any])
def get_hospital_analytics(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "system.manage")),
):
    """
    Returns operational queue volume, hourly peak tokens, and department performance data.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return {
        "hourly_token_volume": [
            {"hour": "08:00 AM", "tokens": 18, "wait_time_mins": 12},
            {"hour": "09:00 AM", "tokens": 42, "wait_time_mins": 16},
            {"hour": "10:00 AM", "tokens": 68, "wait_time_mins": 22},
            {"hour": "11:00 AM", "tokens": 54, "wait_time_mins": 19},
            {"hour": "12:00 PM", "tokens": 36, "wait_time_mins": 15},
            {"hour": "01:00 PM", "tokens": 20, "wait_time_mins": 10},
            {"hour": "02:00 PM", "tokens": 10, "wait_time_mins": 8},
        ],
        "department_distribution": [
            {"department": "General Medicine", "patients": 128, "utilization_pct": 92},
            {"department": "Cardiology", "patients": 42, "utilization_pct": 84},
            {"department": "Orthopedics", "patients": 51, "utilization_pct": 88},
            {"department": "Pediatrics", "patients": 67, "utilization_pct": 78},
            {"department": "Dental Care", "patients": 34, "utilization_pct": 65},
            {"department": "Dermatology", "patients": 26, "utilization_pct": 70},
        ],
        "average_wait_mins": 16.5,
        "average_consult_mins": 11.2,
        "no_show_rate_pct": 3.8
    }

@router.get("/config", response_model=Dict[str, Any])
def get_hospital_configuration(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "hospital.update", "system.manage")),
):
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.get_hospital_configuration(hospital_id=target_hosp)

@router.get("/audit-logs", response_model=List[Dict[str, Any]])
def get_hospital_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    user: Dict[str, Any] = Depends(require_any_permission("audit.read", "system.manage")),
):
    return sp_repository.list_audit_logs(limit=limit)

# =============================================================================
# 9. CENTRALIZED USER MANAGEMENT & ACCESS GOVERNANCE
# =============================================================================

@router.get("/users", response_model=Dict[str, Any])
def list_hospital_users(
    role: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "user.read", "system.manage")),
):
    """
    Returns paginated list of hospital staff users with multi-dimensional filtering.
    Strictly scoped to authorized hospital tenant.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    
    users_list = sp_repository.list_hospital_users_admin(
        hospital_id=target_hosp,
        role=role,
        department_id=department_id,
        branch_id=branch_id,
        status=status,
        search=search,
        limit=limit,
        offset=offset
    )
    total = sp_repository.count_hospital_users_admin(
        hospital_id=target_hosp,
        role=role,
        department_id=department_id,
        branch_id=branch_id,
        status=status,
        search=search
    )
    return {
        "items": users_list,
        "total": total,
        "limit": limit,
        "offset": offset,
        "hospital_id": target_hosp
    }

@router.post("/users", response_model=Dict[str, Any])
def create_hospital_user(
    payload: CreateHospitalUserRequest,
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.create", "user.manage", "system.manage")),
):
    """
    Creates a new hospital staff member with unified /login authentication, role-specific metadata,
    and automatic branch/department scoping. Rejects Super Admin escalation attempts.
    """
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)

    # Privilege Escalation Guardrail
    if payload.role_code.upper() in ("SUPER_ADMIN", "PLATFORM_ADMIN", "SYSTEM_ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Hospital Administrators are strictly forbidden from creating Super Admin or Platform Admin accounts."
        )

    try:
        created = sp_repository.create_hospital_user_admin(
            hospital_id=target_hosp,
            payload=payload.model_dump() if hasattr(payload, "model_dump") else payload.dict(),
            actor_id=user.get("username", "hospadmin")
        )
        return created
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create hospital user: {e}")

@router.get("/users/access-review", response_model=Dict[str, Any])
def get_hospital_access_review_summary(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "user.read", "audit.read", "system.manage")),
):
    """
    Operational Access Review command center surfacing expiring credentials, expired licenses,
    inactive accounts (>90d), excessive permissions, pending invitations, and locked accounts.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.get_hospital_access_review(hospital_id=target_hosp)

@router.get("/users/roles-catalog", response_model=List[Dict[str, Any]])
def get_hospital_roles_catalog(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "user.read", "system.manage")),
):
    """
    Returns list of role templates and default permission sets available for assignment.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_roles_catalog(hospital_id=target_hosp)

@router.get("/users/audit", response_model=List[Dict[str, Any]])
def list_hospital_user_audit_logs(
    target_user_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("audit.read", "user.read", "system.manage")),
):
    """
    Returns immutable audit trail of role modifications, credential verifications, and security events.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_user_audit_trail(hospital_id=target_hosp, target_user_id=target_user_id, limit=limit)

@router.post("/users/invitations/{invitation_id}/resend", response_model=Dict[str, Any])
def resend_user_invitation(
    invitation_id: str = Path(...),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.create", "system.manage")),
):
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return sp_repository.resend_staff_invitation_admin(
            invitation_id=invitation_id,
            hospital_id=target_hosp,
            actor_id=user.get("username", "hospadmin")
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.post("/users/invitations/{invitation_id}/cancel", response_model=Dict[str, Any])
def cancel_user_invitation(
    invitation_id: str = Path(...),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.create", "system.manage")),
):
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return sp_repository.cancel_staff_invitation_admin(
            invitation_id=invitation_id,
            hospital_id=target_hosp,
            actor_id=user.get("username", "hospadmin")
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.get("/users/{user_id}", response_model=Dict[str, Any])
def get_hospital_user_profile(
    user_id: str = Path(...),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "user.read", "system.manage")),
):
    """
    Returns full demographic, employment, role, branch, credential, and recent audit details for a specific user.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    user_data = sp_repository.get_hospital_user_detail(user_id=user_id, hospital_id=target_hosp)
    if not user_data:
        raise HTTPException(status_code=404, detail="User record not found in this hospital.")
    return user_data

@router.put("/users/{user_id}", response_model=Dict[str, Any])
def update_hospital_user(
    user_id: str = Path(...),
    payload: UpdateHospitalUserRequest = Body(...),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.manage", "system.manage")),
):
    """
    Updates user details, role assignments, department scopes, or credentials, automatically generating audit events.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)

    if payload.role_code and payload.role_code.upper() in ("SUPER_ADMIN", "PLATFORM_ADMIN", "SYSTEM_ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Hospital Administrators cannot elevate user roles to Super Admin."
        )

    try:
        data = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload.dict(exclude_unset=True)
        return sp_repository.update_hospital_user_admin(
            user_id=user_id,
            hospital_id=target_hosp,
            payload=data,
            actor_id=user.get("username", "hospadmin")
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.post("/users/{user_id}/status", response_model=Dict[str, Any])
def set_hospital_user_status(
    user_id: str = Path(...),
    payload: SetUserStatusRequest = Body(...),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.manage", "system.manage")),
):
    """
    Transitions user status (ACTIVE, INACTIVE, SUSPENDED, LOCKED, TERMINATED). Non-destructive deactivation.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return sp_repository.set_hospital_user_status_admin(
            user_id=user_id,
            hospital_id=target_hosp,
            status=payload.status,
            reason=payload.reason,
            actor_id=user.get("username", "hospadmin")
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.post("/users/{user_id}/security", response_model=Dict[str, Any])
def manage_hospital_user_security(
    user_id: str = Path(...),
    payload: UserSecurityActionRequest = Body(...),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.manage", "system.manage")),
):
    """
    Executes controlled security actions (TOGGLE_LOGIN, UNLOCK, RESET_PASSWORD, REVOKE_SESSIONS) without revealing passwords.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return sp_repository.manage_hospital_user_security_admin(
            user_id=user_id,
            hospital_id=target_hosp,
            action=payload.action,
            actor_id=user.get("username", "hospadmin")
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

