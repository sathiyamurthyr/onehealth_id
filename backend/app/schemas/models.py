from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    username: str
    password: str

class UserProfile(BaseModel):
    username: str
    name: str
    role: str
    email: str
    hospital_name: Optional[str] = "Apollo Central Hospital"
    tenant_name: Optional[str] = "Apollo Healthcare Network"

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
    hospital_id: Optional[str] = "hosp-001"

class PatientCreate(PatientBase):
    id: Optional[str] = None

class PatientResponse(PatientBase):
    id: str
    onehealth_id: Optional[str] = None
    qr_token: Optional[str] = None
    status: Optional[str] = "ACTIVE"
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
    department_id: Optional[str] = "dept-101"
    hospital_id: Optional[str] = "hosp-001"

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
    slot: str
    status: str = "scheduled"
    notes: Optional[str] = None
    priority: Optional[str] = "NORMAL"

class AppointmentCreate(AppointmentBase):
    id: Optional[str] = None
    hospital_id: Optional[str] = None
    department_id: Optional[str] = None

class AppointmentStatusUpdate(BaseModel):
    status: str

class AppointmentResponse(AppointmentBase):
    id: str
    patient_name: Optional[str] = None
    onehealth_id: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_age: Optional[int] = None
    patient_diagnosis: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    room_number: Optional[str] = None
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    token_number: Optional[int] = 1
    created_at: Optional[Any] = None

# --- Queue Schemas ---
class QueueActionRequest(BaseModel):
    action: str = Field(..., description="CALL_NEXT, START_CONSULT, COMPLETE, HOLD, SKIP")

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
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    room_number: Optional[str] = None
    department_name: Optional[str] = None
    hospital_name: Optional[str] = None
    appointment_slot: Optional[str] = None
    priority: Optional[str] = "NORMAL"

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
