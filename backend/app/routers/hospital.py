import logging
from fastapi import APIRouter, Query, HTTPException, Depends, Body, Path
from typing import Dict, Any, Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.rbac import (
    get_current_user_context,
    require_any_permission,
    validate_hospital_tenant_scope,
)

logger = logging.getLogger("ohid.router.hospital")
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
    hospital_id: Optional[str] = None

class NurseRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    email: str = Field(..., max_length=128)
    phone: str = Field(..., min_length=5, max_length=32)
    qualification: str = Field("B.Sc Nursing", max_length=128)
    registration_number: str = Field("TN-NUR-2025-REG", max_length=128)
    department_id: Optional[str] = None
    ward: Optional[str] = "OPD Triage Wing A"
    shift: Optional[str] = "MORNING"
    hospital_id: Optional[str] = None

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
    hospital_id: Optional[str] = None

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
    hospital_id: Optional[str] = None

class StaffRosterUpdateRequest(BaseModel):
    on_duty_status: Optional[str] = None
    shift: Optional[str] = None
    room_number: Optional[str] = None
    opd_counter_id: Optional[str] = None

class DoctorRosterUpsertRequest(BaseModel):
    id: Optional[str] = None
    doctor_id: str
    hospital_id: Optional[str] = None
    department_id: Optional[str] = None
    roster_date: Optional[str] = None
    shift: str = Field("MORNING", max_length=32)
    room_number: Optional[str] = "Room 101"
    opd_counter_id: Optional[str] = None
    max_tokens: int = Field(50, ge=1, le=200)
    status: str = Field("ON_DUTY", max_length=32)

class NurseRosterUpsertRequest(BaseModel):
    id: Optional[str] = None
    nurse_id: str
    hospital_id: Optional[str] = None
    department_id: Optional[str] = None
    ward: Optional[str] = "OPD Triage Wing A"
    roster_date: Optional[str] = None
    shift: str = Field("MORNING", max_length=32)
    status: str = Field("ON_DUTY", max_length=32)

class HospitalServiceUpsertRequest(BaseModel):
    id: Optional[str] = None
    service_name: Optional[str] = None
    service_code: Optional[str] = None
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = ""
    category: str = Field("CONSULTATION", max_length=64)
    department_id: Optional[str] = None
    duration_mins: int = Field(15, ge=1, le=240)
    fee: float = Field(350.00, ge=0.0)
    base_price: Optional[float] = None
    taxable: bool = False
    tax_rate: float = 0.00
    currency: str = "INR"
    status: str = Field("ACTIVE", max_length=32)
    hospital_id: Optional[str] = None

class StaffInvitationRequest(BaseModel):
    full_name: str = Field(..., max_length=128)
    email: str = Field(..., max_length=128)
    mobile: str = Field(..., min_length=5, max_length=32)
    role_code: str = Field("DOCTOR", max_length=64)
    department_id: Optional[str] = None
    designation: Optional[str] = None
    employment_type: str = Field("FULL_TIME", max_length=64)
    hospital_id: Optional[str] = None

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
    branch_id: Optional[str] = None
    branch_ids: Optional[List[str]] = []
    department_id: Optional[str] = None
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
    hospital_id: Optional[str] = None

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

class SetUserPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=128)

class HospitalOnboardingSetupRequest(BaseModel):
    hospital_id: str
    profile: Optional[Dict[str, Any]] = None
    branches: Optional[List[Dict[str, Any]]] = None
    facilities: Optional[List[Dict[str, Any]]] = None
    departments: Optional[List[Dict[str, Any]]] = None
    staff: Optional[List[Dict[str, Any]]] = None

# =============================================================================
# 0. HOSPITAL ADMIN ONBOARDING & SETUP
# =============================================================================

@router.get("/onboarding/status")
def get_onboarding_status(
    hospital_id: str = Query("hosp-kedar", description="Hospital ID")
):
    """Returns onboarding and configuration status for the hospital workspace."""
    try:
        data = sp_repository.get_hospital_onboarding_status(hospital_id)
        return {
            "success": True,
            "data": data,
            "message": "Hospital onboarding status loaded"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/onboarding/setup")
def save_onboarding_setup(
    payload: HospitalOnboardingSetupRequest
):
    """
    Hospital Admin 5-Step Hospital Configuration:
    Step 1: Hospital Profile & Statutory Registration
    Step 2: Branches & Locations
    Step 3: Clinical Facilities & In-Hospital Services
    Step 4: Departments & Specialties
    Step 5: Operational Workforce Setup
    """
    try:
        res = sp_repository.save_hospital_admin_onboarding(
            hospital_id=payload.hospital_id,
            payload=payload.model_dump()
        )
        return {
            "success": True,
            "data": res,
            "message": "Hospital setup and configuration completed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@router.get("/dashboard", response_model=Dict[str, Any])
def get_hospital_operations_dashboard_endpoint(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "dashboard.read", "system.manage")),
):
    """
    Returns live operational summary for OPD today: total appointments, checked in, waiting,
    in consultation, completed, no-show, active doctors/nurses, active counters, and real-time alerts.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.get_hospital_operations_dashboard(hospital_id=target_hosp)

@router.get("/dashboard/patient-flow", response_model=List[Dict[str, Any]])
def get_patient_flow_hourly_endpoint(
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "dashboard.read", "system.manage")),
):
    """
    Returns hourly patient flow metrics: checked-in, called, in-consultation, completed, and wait times.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.get_patient_flow_hourly(hospital_id=target_hosp, date=date)

@router.get("/dashboard/queues", response_model=List[Dict[str, Any]])
def get_hospital_dashboard_queues_endpoint(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "dashboard.read", "queue.read", "system.manage")),
):
    """
    Returns department queue breakdown with active tokens, waiting, in-service, and completed counts.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    dash = sp_repository.get_hospital_operations_dashboard(hospital_id=target_hosp)
    return dash.get("departments_breakdown", [])

@router.get("/alerts", response_model=List[Dict[str, Any]])
def get_operational_alerts_endpoint(
    status: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "system.manage")),
):
    """
    Returns real-time operational alerts (e.g. wait time exceeded, queue backlog).
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_operational_alerts(hospital_id=target_hosp, status=status)

@router.post("/alerts/{alert_id}/ack", response_model=Dict[str, Any])
def acknowledge_operational_alert_endpoint(
    alert_id: str = Path(...),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "system.manage")),
):
    """
    Acknowledges an active operational alert.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    user_id = user.get("user_ref_id") or user.get("id") or user.get("username", "staff")
    return sp_repository.acknowledge_operational_alert(alert_id=alert_id, user_id=user_id)

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
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or user.get("hospital_id")
    if not target_hosp:
        raise HTTPException(status_code=400, detail="Hospital facility context is required.")
    validate_hospital_tenant_scope(user, target_hosp)
    try:
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
    except Exception as e:
        logger.error(f"Doctor registration failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to register doctor: {str(e)}")

# =============================================================================
# 3. NURSES & TRAINEES ADMINISTRATION
# =============================================================================

@router.get("/nurses", response_model=List[Dict[str, Any]])
def list_hospital_nurses(
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "nursing.tasks.manage", "system.manage")),
):
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_nurses_admin(hospital_id=target_hosp)

@router.post("/nurses/register", response_model=Dict[str, Any])
def register_hospital_nurse(
    payload: NurseRegisterRequest,
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.create", "system.manage")),
):
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or user.get("hospital_id")
    if not target_hosp:
        raise HTTPException(status_code=400, detail="Hospital facility context is required.")
    validate_hospital_tenant_scope(user, target_hosp)
    try:
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
    except Exception as e:
        logger.error(f"Nurse registration failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to register nurse: {str(e)}")

@router.get("/trainees", response_model=List[Dict[str, Any]])
def list_hospital_trainees(
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "system.manage")),
):
    """
    Lists medical & nursing trainees, interns, and junior residents with restricted guardrails.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_trainees_admin(hospital_id=target_hosp)

@router.post("/trainees/register", response_model=Dict[str, Any])
def register_hospital_trainee(
    payload: TraineeRegisterRequest,
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.create", "system.manage")),
):
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or user.get("hospital_id")
    if not target_hosp:
        raise HTTPException(status_code=400, detail="Hospital facility context is required.")
    validate_hospital_tenant_scope(user, target_hosp)
    try:
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
            start_date=payload.start_date,
            end_date=payload.end_date,
            actor_id=user.get("username", "hospadmin")
        )
    except Exception as e:
        logger.error(f"Trainee registration failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to register trainee: {str(e)}")

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

@router.get("/doctors/roster", response_model=List[Dict[str, Any]])
def get_doctor_rosters_endpoint(
    date: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "doctor.read", "system.manage")),
):
    """
    Returns doctor daily rosters with shift, counter mapping, token capacity, and on-duty status.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_doctor_rosters(hospital_id=target_hosp, roster_date=date, department_id=department_id)

@router.post("/doctors/roster", response_model=Dict[str, Any])
def upsert_doctor_roster_endpoint(
    payload: DoctorRosterUpsertRequest,
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "system.manage")),
):
    """
    Upserts a doctor duty roster assignment.
    """
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.upsert_doctor_roster(
        hospital_id=target_hosp,
        doctor_id=payload.doctor_id,
        department_id=payload.department_id,
        roster_date=payload.roster_date,
        shift=payload.shift,
        room_number=payload.room_number,
        opd_counter_id=payload.opd_counter_id,
        max_tokens=payload.max_tokens,
        status=payload.status,
        roster_id=payload.id,
        actor_id=user.get("username", "hospadmin")
    )

@router.get("/nurses/roster", response_model=List[Dict[str, Any]])
def get_nurse_rosters_endpoint(
    date: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "nursing.tasks.manage", "system.manage")),
):
    """
    Returns nurse shift rosters for wards, triage, and OPD units.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_nurse_rosters(hospital_id=target_hosp, roster_date=date)

@router.post("/nurses/roster", response_model=Dict[str, Any])
def upsert_nurse_roster_endpoint(
    payload: NurseRosterUpsertRequest,
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "system.manage")),
):
    """
    Upserts a nurse duty roster assignment.
    """
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.upsert_nurse_roster(
        hospital_id=target_hosp,
        nurse_id=payload.nurse_id,
        department_id=payload.department_id,
        ward=payload.ward,
        roster_date=payload.roster_date,
        shift=payload.shift,
        status=payload.status,
        roster_id=payload.id,
        actor_id=user.get("username", "hospadmin")
    )

# =============================================================================
# 6. HOSPITAL SERVICES & TARIFF CATALOGUE
# =============================================================================

@router.get("/services", response_model=List[Dict[str, Any]])
def list_hospital_services(
    hospital_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "billing.read", "billing.manage", "system.manage", "doctor.workspace")),
):
    target_hosp = hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_services(hospital_id=target_hosp, category=category, is_active=is_active)

@router.post("/services", response_model=Dict[str, Any])
def upsert_hospital_service(
    payload: HospitalServiceUpsertRequest,
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "billing.manage", "system.manage")),
):
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or user.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    
    srv_code = payload.code or payload.service_code or "SRV-01"
    srv_name = payload.name or payload.service_name or "Service"
    srv_price = payload.base_price if payload.base_price is not None else payload.fee

    if payload.code or payload.name or payload.base_price is not None:
        res = sp_repository.create_hospital_service({
            "hospital_id": target_hosp,
            "code": srv_code,
            "name": srv_name,
            "description": payload.description or f"{srv_name} service",
            "category": payload.category,
            "department_id": payload.department_id,
            "taxable": payload.taxable,
            "tax_rate": payload.tax_rate,
            "base_price": srv_price,
            "currency": payload.currency
        })
        return {"success": True, "data": res}

    return sp_repository.upsert_hospital_service(
        hospital_id=target_hosp,
        service_name=srv_name,
        service_code=srv_code,
        category=payload.category,
        department_id=payload.department_id,
        duration_mins=payload.duration_mins,
        fee=srv_price,
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
    Returns live operational queue volume, hourly peak tokens, and department performance data.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)

    dash = sp_repository.get_hospital_operations_dashboard(hospital_id=target_hosp)
    hourly = sp_repository.get_patient_flow_hourly(hospital_id=target_hosp)

    dept_dist = []
    for d in dash.get("departments_breakdown", []):
        dept_dist.append({
            "department": d.get("department_name") or d.get("department_code", "General"),
            "patients": d.get("total_today", 0),
            "utilization_pct": min(100, int((d.get("total_today", 0) / max(1, d.get("total_capacity", 50))) * 100))
        })

    hourly_tokens = []
    for h in hourly:
        hourly_tokens.append({
            "hour": h.get("hour_label", "09:00 AM"),
            "tokens": h.get("total_checked_in", 0),
            "wait_time_mins": round(h.get("avg_wait_minutes", 15.0), 1)
        })

    return {
        "hourly_token_volume": hourly_tokens,
        "department_distribution": dept_dist,
        "average_wait_mins": round(dash.get("avg_wait_time_mins", 15.0), 1),
        "average_consult_mins": 12.0,
        "no_show_rate_pct": round(
            (dash.get("no_show_today", 0) / max(1, dash.get("total_appointments_today", 1))) * 100.0, 1
        )
    }

@router.get("/reports/patient-flow", response_model=Dict[str, Any])
def get_patient_flow_report_endpoint(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "dashboard.read", "system.manage")),
):
    """
    Detailed patient flow event report across check-in, triage, call, consult, and discharge stages.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.get_patient_flow_report(hospital_id=target_hosp, start_date=start_date, end_date=end_date)

@router.get("/reports/appointments", response_model=Dict[str, Any])
def get_appointment_analytics_report_endpoint(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "dashboard.read", "system.manage")),
):
    """
    Appointment volume, status breakdown, booking lead time, and no-show rate analytics.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.get_appointment_analytics_report(hospital_id=target_hosp, start_date=start_date, end_date=end_date)

@router.get("/reports/departments", response_model=Dict[str, Any])
def get_department_queue_report_endpoint(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "dashboard.read", "system.manage")),
):
    """
    Department-wise queue throughput, counter utilization, and token completion rates.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.get_department_queue_report(hospital_id=target_hosp, start_date=start_date, end_date=end_date)

@router.get("/reports/doctors", response_model=Dict[str, Any])
def get_doctor_productivity_report_endpoint(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "dashboard.read", "system.manage")),
):
    """
    Doctor operational productivity report: consultations completed, average consult duration, and roster shifts.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.get_doctor_productivity_report(hospital_id=target_hosp, start_date=start_date, end_date=end_date)

@router.get("/config", response_model=Dict[str, Any])
def get_hospital_configuration(
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "hospital.update", "system.manage")),
):
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.get_hospital_configuration(hospital_id=target_hosp)

@router.put("/config", response_model=Dict[str, Any])
@router.post("/config", response_model=Dict[str, Any])
def update_hospital_configuration_endpoint(
    payload: Dict[str, Any] = Body(...),
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "hospital.manage", "system.manage")),
):
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.update_hospital_configuration(hospital_id=target_hosp, payload=payload)

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
    role_code: Optional[str] = Query(None),
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
    
    effective_role = role or role_code
    users_list = sp_repository.list_hospital_users_admin(
        hospital_id=target_hosp,
        role=effective_role,
        department_id=department_id,
        branch_id=branch_id,
        status=status,
        search=search,
        limit=limit,
        offset=offset
    )
    total = sp_repository.count_hospital_users_admin(
        hospital_id=target_hosp,
        role=effective_role,
        department_id=department_id,
        branch_id=branch_id,
        status=status,
        search=search
    )

    # Compute summary metrics and role categories
    all_hospital_users = sp_repository.list_hospital_users_admin(hospital_id=target_hosp, limit=500, offset=0)
    metrics = {
        "total_users": len(all_hospital_users),
        "active_users": sum(1 for u in all_hospital_users if u.get("employment_status") == "ACTIVE"),
        "inactive_users": sum(1 for u in all_hospital_users if u.get("employment_status") == "INACTIVE"),
        "suspended_users": sum(1 for u in all_hospital_users if u.get("employment_status") == "SUSPENDED"),
        "locked_users": sum(1 for u in all_hospital_users if u.get("employment_status") == "LOCKED"),
        "invited_users": sum(1 for u in all_hospital_users if u.get("employment_status") == "INVITED"),
        "pending_verification_count": sum(1 for u in all_hospital_users if u.get("verification_status") == "PENDING"),
    }
    categories = {
        "doctors_count": sum(1 for u in all_hospital_users if u.get("role_code") == "DOCTOR"),
        "nurses_count": sum(1 for u in all_hospital_users if u.get("role_code") == "NURSE"),
        "trainees_count": sum(1 for u in all_hospital_users if u.get("role_code") == "TRAINEE"),
        "receptionists_count": sum(1 for u in all_hospital_users if u.get("role_code") == "RECEPTIONIST"),
        "diagnostic_staff_count": sum(1 for u in all_hospital_users if u.get("role_code") in ("LAB_TECH", "LAB_ADMIN", "RADIOLOGY_TECH")),
        "admin_staff_count": sum(1 for u in all_hospital_users if u.get("role_code") in ("HOSPITAL_ADMIN", "HOSPITAL_MANAGER", "STAFF", "ACCOUNTS")),
    }

    return {
        "users": users_list,
        "items": users_list,
        "total": total,
        "total_count": total,
        "limit": limit,
        "offset": offset,
        "hospital_id": target_hosp,
        "metrics": metrics,
        "categories": categories,
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

@router.get("/users/roles-catalog", response_model=Dict[str, Any])
def get_hospital_roles_catalog(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "user.read", "system.manage")),
):
    """
    Returns list of role templates and default permission sets available for assignment.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    roles = sp_repository.list_hospital_roles_catalog(hospital_id=target_hosp)
    return {
        "roles": roles,
        "items": roles,
        "count": len(roles),
        "total_count": len(roles),
    }

@router.get("/users/audit", response_model=Dict[str, Any])
def list_hospital_user_audit_logs(
    target_user_id: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("audit.read", "user.read", "system.manage")),
):
    """
    Returns immutable audit trail of role modifications, credential verifications, and security events.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    logs = sp_repository.list_hospital_user_audit_trail(
        hospital_id=target_hosp,
        target_user_id=target_user_id,
        action_type=action_type,
        limit=limit
    )
    return {
        "audit_logs": logs,
        "items": logs,
        "total_count": len(logs),
        "count": len(logs),
    }

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

@router.get("/users/invitations", response_model=Dict[str, Any])
def list_staff_invitations_endpoint(
    status: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "user.read", "system.manage")),
):
    """
    Returns pending staff invitations for the hospital.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    invites = sp_repository.list_staff_invitations(hospital_id=target_hosp)
    if status and status.upper() != "ALL":
        invites = [i for i in invites if (i.get("status") or "").upper() == status.upper()]
    return {"invitations": invites, "count": len(invites)}

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

@router.post("/users/{user_id}/password", response_model=Dict[str, Any])
def update_hospital_user_password(
    user_id: str = Path(...),
    payload: SetUserPasswordRequest = Body(...),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.manage", "system.manage")),
):
    """
    Directly sets a new password for the specified user and records an audit log.
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return sp_repository.set_hospital_user_password_admin(
            user_id=user_id,
            hospital_id=target_hosp,
            new_password=payload.new_password,
            actor_id=user.get("username", "hospadmin")
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update password: {str(e)}")

@router.delete("/users/{user_id}", response_model=Dict[str, Any])
def delete_hospital_user(
    user_id: str = Path(...),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.manage", "system.manage")),
):
    """
    Removes user from active hospital staff (terminates membership and deactivates account).
    """
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    try:
        return sp_repository.delete_hospital_user_admin(
            user_id=user_id,
            hospital_id=target_hosp,
            actor_id=user.get("username", "hospadmin")
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove user: {str(e)}")

# =============================================================================
# 10. ENTERPRISE WORKFORCE WIZARD & CUSTOM ROLES
# =============================================================================

@router.post("/users/wizard", response_model=Dict[str, Any])
def create_operational_user_wizard(
    payload: Dict[str, Any] = Body(...),
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "user.create", "user.manage", "system.manage")),
):
    """
    Executes the 11-step enterprise workforce creation wizard for Doctor, Nurse, Receptionist,
    Lab, Pharmacy, Radiology, Billing, and Trainee roles, generating single-use expiring invitations.
    """
    target_hosp = payload.get("hospital_id") or hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)

    role_code = (payload.get("role_code") or "DOCTOR").upper()
    if role_code in ("SUPER_ADMIN", "PLATFORM_ADMIN", "SYSTEM_ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Hospital Administrators are strictly forbidden from creating Super Admin accounts."
        )

    try:
        res = sp_repository.create_hospital_user_wizard(
            hospital_id=target_hosp,
            payload=payload,
            actor_id=user.get("username", "hospadmin")
        )
        return {
            "success": True,
            "data": res,
            "message": f"User '{res.get('name')}' created successfully"
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute user creation wizard: {e}")

@router.get("/branches", response_model=List[Dict[str, Any]])
def list_branches(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "system.manage")),
):
    """Lists branches for the hospital."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_branches(hospital_id=target_hosp)

@router.get("/departments", response_model=List[Dict[str, Any]])
def list_departments(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "system.manage")),
):
    """Lists departments for the hospital."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_departments(hospital_id=target_hosp)

@router.get("/roles", response_model=List[Dict[str, Any]])
def list_roles(
    hospital_id: Optional[str] = Query("hosp-kedar"),
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "user.read", "system.manage")),
):
    """Lists system and custom roles available for this hospital."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)
    return sp_repository.list_hospital_roles_catalog(hospital_id=target_hosp)

class CreateCustomRoleRequest(BaseModel):
    code: str = Field(..., min_length=2, max_length=64)
    name: str = Field(..., min_length=2, max_length=128)
    description: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)
    hospital_id: Optional[str] = "hosp-kedar"

@router.post("/roles", response_model=Dict[str, Any])
def create_custom_role(
    payload: CreateCustomRoleRequest,
    user: Dict[str, Any] = Depends(require_any_permission("hospital.update", "role.manage", "system.manage")),
):
    """Creates a custom operational role with scoped granular permissions."""
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)

    if payload.code.upper() in ("SUPER_ADMIN", "PLATFORM_ADMIN", "SYSTEM_ADMIN"):
        raise HTTPException(status_code=403, detail="Cannot create super admin custom role.")

    try:
        return sp_repository.create_custom_hospital_role(
            hospital_id=target_hosp,
            code=payload.code,
            name=payload.name,
            description=payload.description,
            permissions=payload.permissions,
            actor_id=user.get("username", "hospadmin")
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create custom role: {e}")

@router.get("/permissions", response_model=List[Dict[str, Any]])
def list_permissions(
    user: Dict[str, Any] = Depends(require_any_permission("hospital.read", "user.read", "system.manage")),
):
    """Lists complete granular permissions catalog grouped by domain."""
    return sp_repository.list_all_permissions_catalog()

# =============================================================================
# HOSPITAL PATIENT IDENTITY & REGISTRATION MANAGEMENT
# =============================================================================

class HospitalPatientSearchRequest(BaseModel):
    query: str = Field(..., min_length=2)
    hospital_id: Optional[str] = None
    limit: Optional[int] = 20
    offset: Optional[int] = 0

class HospitalPatientRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2)
    age: int = Field(..., ge=0, le=130)
    gender: Optional[str] = "Unspecified"
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Chennai"
    state: Optional[str] = "Tamil Nadu"
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    diagnosis: Optional[str] = "General Outpatient Registration"
    hospital_id: Optional[str] = None
    branch_id: Optional[str] = None
    local_uhid: Optional[str] = None
    existing_oh_id: Optional[str] = None

class CreateVisitRequest(BaseModel):
    doctor_id: Optional[str] = None
    department_id: Optional[str] = None
    appointment_id: Optional[str] = None
    visit_type: Optional[str] = "OPD_CONSULTATION"
    reason: Optional[str] = "Regular Consultation"
    symptoms: Optional[str] = None
    priority: Optional[str] = "NORMAL"

@router.get("/patients")
def list_hospital_patients(
    search: Optional[str] = Query(None),
    hospital_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: Dict[str, Any] = Depends(require_any_permission("patient.read", "hospital.read", "system.manage")),
):
    """Lists all registered patients affiliated with this hospital facility."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)

    patients = sp_repository.list_patients(
        search=search,
        hospital_id=target_hosp,
        limit=limit,
        offset=offset
    )
    return patients

@router.post("/patients/search")
def search_hospital_patients(
    payload: HospitalPatientSearchRequest,
    user: Dict[str, Any] = Depends(require_any_permission("patient.read", "patient.create", "hospital.read", "system.manage")),
):
    """
    Two-step reception search:
    Searches by OH-ID, Mobile number, Hospital UHID, or Name to prevent duplicate identities.
    """
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)

    results = sp_repository.search_patients_secure(
        query=payload.query,
        hospital_id=target_hosp,
        limit=payload.limit or 20,
        offset=payload.offset or 0
    )
    return {
        "success": True,
        "query": payload.query,
        "matches": results,
        "total_count": len(results)
    }

@router.post("/patients/register", status_code=201)
def register_hospital_patient_endpoint(
    payload: HospitalPatientRegisterRequest,
    user: Dict[str, Any] = Depends(require_any_permission("patient.create", "hospital.update", "system.manage")),
):
    """
    Registers a new or existing person at this healthcare facility:
    1. Checks if person exists (via existing_oh_id or phone)
    2. If existing: links person to hospital and assigns local hospital UHID
    3. If new: creates person with unique OH-XXXXXXXXXXXX and binds facility relationship
    """
    target_hosp = payload.hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)

    reg_result = sp_repository.register_hospital_patient(
        name=payload.name,
        age=payload.age,
        gender=payload.gender or "Unspecified",
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        city=payload.city or "Chennai",
        state=payload.state or "Tamil Nadu",
        blood_group=payload.blood_group,
        emergency_contact=payload.emergency_contact,
        diagnosis=payload.diagnosis or "General Outpatient Registration",
        hospital_id=target_hosp,
        branch_id=payload.branch_id or "branch-kedar-01",
        local_uhid=payload.local_uhid,
        existing_oh_id=payload.existing_oh_id,
        registered_by=user.get("username", "receptionist")
    )

    pid = reg_result.get("patient", {}).get("id") or reg_result.get("id")
    return {
        "success": True,
        "patient_id": pid,
        "id": pid,
        "message": f"Patient successfully registered and linked to {target_hosp} (OH-ID: {reg_result.get('onehealth_id')})",
        **reg_result
    }

@router.get("/patients/{patient_id}")
def get_hospital_patient_detail(
    patient_id: str = Path(...),
    hospital_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission("patient.read", "hospital.read", "system.manage")),
):
    """Retrieves patient record and connected facility relationships with strict tenant scoping."""
    target_hosp = hospital_id or user.get("hospital_ref_id") or "hosp-kedar"
    patient = sp_repository.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    validate_hospital_tenant_scope(user, patient.get("hospital_id") or target_hosp)
    memberships = sp_repository.list_patient_facility_memberships(patient["id"])

    return {
        "patient": patient,
        "onehealth_id": patient.get("onehealth_id"),
        "connected_facilities": memberships
    }

@router.post("/patients/{patient_id}/visits", status_code=201)
def create_patient_visit_encounter(
    patient_id: str = Path(...),
    payload: Optional[CreateVisitRequest] = Body(None),
    user: Dict[str, Any] = Depends(require_any_permission("appointment.create", "patient.update", "system.manage")),
):
    """Checks in patient or initiates an active visit encounter in the hospital queue."""
    patient = sp_repository.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    target_hosp = user.get("hospital_ref_id") or patient.get("hospital_id") or "hosp-kedar"
    doc_id = payload.doctor_id if payload and payload.doctor_id else "doc-k-01"

    # Create appointment / visit
    appt = sp_repository.book_patient_appointment(
        patient_id=patient["id"],
        booked_by_user_id=user.get("user_ref_id", user.get("id")),
        booked_by_name=user.get("name", "Staff"),
        booked_by_relationship="Hospital Staff",
        relationship_context="STAFF",
        hospital_id=target_hosp,
        doctor_id=doc_id,
        appointment_date=date.today().strftime("%Y-%m-%d"),
        appointment_time=datetime.now().strftime("%I:%M %p"),
        appointment_type=(payload.visit_type if payload else None) or "Direct Walk-In Visit",
        slot=f"{date.today().strftime('%Y-%m-%d')} {datetime.now().strftime('%I:%M %p')}",
        reason=(payload.reason if payload else None) or "Walk-in Consultation",
        symptoms_notes=(payload.symptoms if payload else None),
        priority=(payload.priority if payload else None) or "NORMAL"
    )

    return {
        "success": True,
        "message": f"Visit encounter successfully registered for {patient.get('name')} (Token: {appt.get('token_number')})",
        "visit": appt,
        "appointment": appt
    }

@router.post("/reception/walk-in", status_code=201)
def register_reception_walk_in(
    payload: Dict[str, Any] = Body(...),
    user: Dict[str, Any] = Depends(require_any_permission("appointment.create", "patient.create", "system.manage")),
):
    """
    Direct reception desk walk-in: Generates appointment, visit, department token, and queues the patient.
    """
    patient_id = payload.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")

    patient = sp_repository.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in registry")

    target_hosp = payload.get("hospital_id") or user.get("hospital_ref_id") or patient.get("hospital_id") or "hosp-kedar"
    validate_hospital_tenant_scope(user, target_hosp)

    actor_id = user.get("user_ref_id") or user.get("id") or user.get("username", "receptionist")
    return sp_repository.generate_walk_in_visit(
        hospital_id=target_hosp,
        patient_id=patient_id,
        department_id=payload.get("department_id"),
        doctor_id=payload.get("doctor_id"),
        priority=payload.get("priority", "NORMAL"),
        reason=payload.get("reason", "Direct Walk-In Arrival"),
        actor_id=actor_id
    )



