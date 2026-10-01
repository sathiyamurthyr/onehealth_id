from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime

# --- Auth & RBAC Schemas ---
class LoginRequest(BaseModel):
    username: str
    password: str

class UserProfile(BaseModel):
    id: Optional[str] = None
    username: str
    name: str
    role: str
    email: str
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    tenant_name: Optional[str] = None
    roles: List[str] = []
    permissions: List[str] = []

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

# --- Patient Schemas ---
class PatientBase(BaseModel):
    name: str = Field(..., min_length=2)
    age: int = Field(..., ge=0)
    diagnosis: str = Field(..., min_length=2)
    gender: Optional[str] = "Unspecified"
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None
    identity_type: Optional[str] = "NATIONAL_ID"
    identity_number: Optional[str] = None
    hospital_id: Optional[str] = None
    branch_id: Optional[str] = None

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
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
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
    is_demo_data: Optional[bool] = False
    created_at: Optional[Any] = None

# --- Queue Schemas ---
class QueueActionRequest(BaseModel):
    action: str = Field(..., description="CALL_NEXT, START_CONSULT, COMPLETE, HOLD, SKIP, RECALL")

class QueueEntryResponse(BaseModel):
    id: str
    token_number: int
    status: str
    estimated_wait_minutes: Optional[int] = 15
    called_at: Optional[Any] = None
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

# --- Clinical Consultation Schemas ---
class ConsultationCreate(BaseModel):
    appointment_id: Optional[str] = None
    patient_id: str
    doctor_id: str
    symptoms: Optional[str] = None
    diagnosis: str
    clinical_notes: Optional[str] = None
    vitals: Optional[Dict[str, Any]] = None

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
