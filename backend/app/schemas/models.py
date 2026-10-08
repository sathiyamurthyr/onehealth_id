from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime

# --- Auth & RBAC Schemas ---
class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=128)

class UserProfile(BaseModel):
    id: Optional[str] = None
    user_ref_id: Optional[str] = None
    username: str
    name: str
    role: str
    usertype_ref_id: Optional[str] = None
    email: str
    hospital_id: Optional[str] = None
    hospital_ref_id: Optional[str] = None
    hospital_name: Optional[str] = None
    tenant_name: Optional[str] = None
    roles: List[str] = []
    permissions: List[str] = []

class NavigationItem(BaseModel):
    title: str
    href: str
    icon: Optional[str] = "LayoutDashboard"
    section: Optional[str] = "General"
    badge: Optional[str] = None
    permission: Optional[str] = None

class WorkspaceDefinition(BaseModel):
    id: str
    workspace_type: str  # SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, NURSE, EMPLOYEE, PATIENT, OTHER
    role_code: str
    role_name: str
    default_route: str
    hospital_ref_id: str
    hospital_name: str
    hospital_code: Optional[str] = None
    branch_ref_id: Optional[str] = None
    branch_name: Optional[str] = None
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None
    is_primary: Optional[bool] = True

class DashboardConfig(BaseModel):
    layout: List[str] = []
    widgets: List[Dict[str, Any]] = []

class WorkspaceResponse(BaseModel):
    user: UserProfile
    workspace: WorkspaceDefinition
    navigation: List[NavigationItem]
    permissions: List[str]
    dashboard: DashboardConfig
    available_workspaces: List[Dict[str, Any]] = []
    available_hospitals: List[Dict[str, Any]] = []

class SwitchContextRequest(BaseModel):
    hospital_ref_id: Optional[str] = None
    usertype_ref_id: Optional[str] = None

class SwitchContextResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    workspace: WorkspaceResponse

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
    workspace: Optional[WorkspaceResponse] = None

# --- Patient Schemas ---
class PatientBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    age: int = Field(..., ge=0, le=150)
    diagnosis: Optional[str] = Field("General Outpatient Consultation", max_length=500)
    gender: Optional[str] = Field("Unspecified", max_length=50)
    phone: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=150)
    address: Optional[str] = Field(None, max_length=500)
    emergency_contact: Optional[str] = Field(None, max_length=150)
    blood_group: Optional[str] = Field(None, max_length=20)
    identity_type: Optional[str] = Field("NATIONAL_ID", max_length=50)
    identity_number: Optional[str] = Field(None, max_length=50)
    hospital_id: Optional[str] = Field(None, max_length=50)
    branch_id: Optional[str] = Field(None, max_length=50)

class PatientCreate(PatientBase):
    id: Optional[str] = None
    is_demo_data: Optional[bool] = False

class PatientResponse(PatientBase):
    id: str
    onehealth_id: Optional[str] = None
    qr_token: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    branch_name: Optional[str] = None
    is_demo_data: Optional[bool] = False
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None
    total_appointments: Optional[int] = 0
    pending_bills_count: Optional[int] = 0

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    diagnosis: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class DuplicateCheckRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    identity_number: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = None
    hospital_id: Optional[str] = None

class DuplicateCheckResponse(BaseModel):
    duplicate_found: bool
    matches: List[PatientResponse] = []

class QRTokenResolveRequest(BaseModel):
    qr_token: str
    scanned_by: Optional[str] = "staff"

# --- Doctor Schemas ---
class DoctorBase(BaseModel):
    name: str = Field(..., min_length=2)
    specialty: str = Field(..., min_length=2)
    qualification: Optional[str] = "MBBS, MD"
    phone: Optional[str] = None
    email: Optional[str] = None
    room_number: Optional[str] = "Room 101"
    opd_timings: Optional[str] = "09:00 AM - 01:00 PM"
    consultation_fee: Optional[float] = 500.00

class DoctorCreate(DoctorBase):
    id: Optional[str] = None
    department_id: Optional[str] = None
    hospital_id: Optional[str] = None

class DoctorResponse(DoctorBase):
    id: str
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    rating: Optional[float] = 4.9
    is_available: Optional[bool] = True
    active_waiting_count: Optional[int] = 0
    upcoming_appointments_count: Optional[int] = 0

# --- Appointment Schemas ---
class AppointmentBase(BaseModel):
    patient_id: str
    doctor_id: str
    slot: Optional[str] = None
    appointment_date: Optional[Any] = None
    appointment_time: Optional[Any] = None
    status: str = "scheduled"
    notes: Optional[str] = None
    priority: Optional[str] = "NORMAL"

class AppointmentCreate(AppointmentBase):
    id: Optional[str] = None
    hospital_id: Optional[str] = None
    branch_id: Optional[str] = None
    department_id: Optional[str] = None

class AppointmentStatusUpdate(BaseModel):
    status: str

class AppointmentResponse(AppointmentBase):
    id: str
    patient_name: Optional[str] = None
    onehealth_id: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    patient_diagnosis: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    room_number: Optional[str] = None
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    token_number: Optional[int] = 1
    token_prefix: Optional[str] = "OPD-"
    checked_in_at: Optional[Any] = None
    visit_id: Optional[str] = None
    is_demo_data: Optional[bool] = False
    created_at: Optional[Any] = None

# --- Queue Schemas ---
class QueueActionRequest(BaseModel):
    action: str = Field(..., description="CALL_NEXT, START_CONSULT, COMPLETE, HOLD, SKIP, RECALL, TRANSFER")
    target_doctor_id: Optional[str] = None
    reason: Optional[str] = None

class QueueEntryResponse(BaseModel):
    id: str
    token_number: int
    token_prefix: Optional[str] = "OPD-"
    status: str
    estimated_wait_minutes: Optional[int] = 15
    called_at: Optional[Any] = None
    in_service_at: Optional[Any] = None
    completed_at: Optional[Any] = None
    created_at: Optional[Any] = None
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    onehealth_id: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    patient_is_demo_data: Optional[bool] = False
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    room_number: Optional[str] = None
    department_name: Optional[str] = None
    hospital_name: Optional[str] = None
    branch_name: Optional[str] = None
    appointment_id: Optional[str] = None
    appointment_slot: Optional[str] = None
    priority: Optional[str] = "NORMAL"

# --- Clinical Consultation & FHIR MedicationRequest Schemas ---
class PrescriptionItemCreate(BaseModel):
    id: Optional[str] = None
    medicine_name: str
    generic_name: Optional[str] = None
    brand_name: Optional[str] = None
    strength: Optional[str] = "500 mg"
    dosage_form: Optional[str] = "Tablet"
    route: Optional[str] = "Oral"
    dose: Optional[str] = "1 tablet"
    frequency: Optional[str] = "Once daily (1-0-0)"
    timing_morning: Optional[bool] = True
    timing_afternoon: Optional[bool] = False
    timing_evening: Optional[bool] = False
    timing_night: Optional[bool] = False
    food_instruction: Optional[str] = "AFTER_FOOD" # BEFORE_FOOD, AFTER_FOOD, WITH_FOOD, NO_INSTRUCTION
    duration_value: Optional[int] = 5
    duration_unit: Optional[str] = "Days"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    quantity: Optional[int] = 5
    expected_supply_duration: Optional[int] = 5
    refills: Optional[int] = 0
    is_prn: Optional[bool] = False
    prn_indication: Optional[str] = None
    specific_instructions: Optional[str] = None
    is_dispensed: Optional[bool] = False
    dispensed_quantity: Optional[int] = 0
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    status: Optional[str] = "ACTIVE"

class PrescriptionItemResponse(PrescriptionItemCreate):
    id: str

class PrescriptionCreate(BaseModel):
    id: Optional[str] = None
    consultation_id: Optional[str] = None
    patient_id: str
    doctor_id: str
    diagnosis: Optional[str] = None
    instructions: Optional[str] = None
    status: Optional[str] = "ACTIVE" # DRAFT, SIGNED, ACTIVE, DISPENSED, PARTIALLY_DISPENSED, COMPLETED, CANCELLED, EXPIRED
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    signed_by: Optional[str] = None
    signed_at: Optional[Any] = None
    digital_signature_hash: Optional[str] = None
    items: List[PrescriptionItemCreate] = []

class PrescriptionResponse(BaseModel):
    id: str
    consultation_id: Optional[str] = None
    patient_id: str
    patient_name: Optional[str] = None
    onehealth_id: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    doctor_id: str
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    hospital_name: Optional[str] = None
    diagnosis: Optional[str] = None
    instructions: Optional[str] = None
    status: str
    valid_from: Optional[Any] = None
    valid_until: Optional[Any] = None
    signed_by: Optional[str] = None
    signed_at: Optional[Any] = None
    digital_signature_hash: Optional[str] = None
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None
    version: Optional[int] = 1
    items: List[Dict[str, Any]] = []

class PrescriptionSignRequest(BaseModel):
    signed_by: str
    digital_signature_hash: Optional[str] = None

class PrescriptionDispenseRequest(BaseModel):
    dispensed_by: str
    items: List[Dict[str, Any]] # [{item_id, dispensed_quantity, batch_number, expiry_date}]

class ReferralCreate(BaseModel):
    patient_id: str
    referring_doctor_id: str
    receiving_doctor_id: Optional[str] = None
    referral_type: str = "INTERNAL" # INTERNAL, EXTERNAL
    specialty: str
    receiving_doctor_name: Optional[str] = None
    reason: str
    clinical_summary: Optional[str] = None
    priority: str = "ROUTINE" # ROUTINE, URGENT, EMERGENCY
    requested_evaluation: Optional[str] = None
    attached_reports: Optional[List[Any]] = []

class FollowUpCreate(BaseModel):
    patient_id: str
    doctor_id: str
    department_id: Optional[str] = None
    scheduled_date: str
    scheduled_time: Optional[str] = "10:30 AM"
    duration_minutes: Optional[int] = 15
    reason: Optional[str] = None
    required_investigations: Optional[List[str]] = []
    instructions: Optional[str] = None

class DoctorScheduleItem(BaseModel):
    day_of_week: str
    working_start_time: str = "09:00"
    working_end_time: str = "17:00"
    break_start_time: str = "13:00"
    break_end_time: str = "14:00"
    appointment_duration_minutes: int = 15
    buffer_time_minutes: int = 5
    emergency_slots_count: int = 2
    followup_slots_count: int = 4
    new_patient_slots_count: int = 8
    overbooking_allowed: bool = True
    overbooking_max: int = 2

class ConsultationCreate(BaseModel):
    appointment_id: Optional[str] = None
    patient_id: str
    doctor_id: str
    symptoms: Optional[str] = None
    diagnosis: str
    clinical_notes: Optional[str] = None
    vitals: Optional[Dict[str, Any]] = None
    chief_complaint: Optional[Dict[str, Any]] = None
    examination: Optional[Dict[str, Any]] = None
    medical_history: Optional[Dict[str, Any]] = None
    diagnoses: Optional[List[Dict[str, Any]]] = None
    prescription: Optional[PrescriptionCreate] = None
    referral: Optional[ReferralCreate] = None
    follow_up: Optional[FollowUpCreate] = None

class ConsultationResponse(BaseModel):
    id: str
    appointment_id: Optional[str] = None
    patient_id: str
    patient_name: Optional[str] = None
    onehealth_id: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    doctor_id: str
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    symptoms: Optional[str] = None
    diagnosis: str
    clinical_notes: Optional[str] = None
    vitals: Optional[Dict[str, Any]] = None
    chief_complaint: Optional[Dict[str, Any]] = None
    examination: Optional[Dict[str, Any]] = None
    medical_history: Optional[Dict[str, Any]] = None
    diagnoses: Optional[List[Dict[str, Any]]] = None
    consultation_status: Optional[str] = "COMPLETED"
    prescription_id: Optional[str] = None
    prescription_status: Optional[str] = None
    medicines_count: Optional[int] = 0
    created_at: Optional[Any] = None

# --- Billing & Payment Schemas ---
class PaymentRequest(BaseModel):
    amount: float
    payment_mode: str = "UPI"
    transaction_ref: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    patient_id: str
    patient_name: Optional[str] = None
    onehealth_id: Optional[str] = None
    patient_phone: Optional[str] = None
    hospital_name: Optional[str] = None
    subtotal: float
    tax_gst: float
    discount: float
    total_amount: float
    paid_amount: float
    balance_amount: float
    payment_status: str
    created_at: Optional[Any] = None
    items_count: Optional[int] = 0
    last_payment_mode: Optional[str] = None

# --- Standard Envelope Response ---
class APIResponse(BaseModel):
    success: bool = True
    data: Optional[Any] = None
    message: Optional[str] = None
    meta: Optional[dict] = None
