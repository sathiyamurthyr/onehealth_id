import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import uuid4

app = FastAPI(title="Hospital Management System API", version="1.0.0")

from backend.app.core.config import settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class Patient(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=2)
    age: int = Field(..., ge=0)
    diagnosis: str = Field(..., min_length=2)


class Doctor(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=2)
    specialty: str = Field(..., min_length=2)


class Appointment(BaseModel):
    id: Optional[str] = None
    patient_id: str
    doctor_id: str
    slot: str
    status: str = "scheduled"


class AppointmentStatusUpdate(BaseModel):
    status: str


class LoginRequest(BaseModel):
    username: str
    password: str


class UserProfile(BaseModel):
    username: str
    name: str
    role: str
    email: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


DEMO_USERS = {
    "admin": {
        "password": "admin123",
        "profile": UserProfile(
            username="admin",
            name="Dr. Administrator",
            role="Admin",
            email="admin@hospital.org",
        ),
    },
    "doctor": {
        "password": "doctor123",
        "profile": UserProfile(
            username="doctor",
            name="Dr. Gregory House",
            role="Doctor",
            email="house@hospital.org",
        ),
    },
    "receptionist": {
        "password": "rec123",
        "profile": UserProfile(
            username="receptionist",
            name="Sarah Jenkins",
            role="Receptionist",
            email="reception@hospital.org",
        ),
    },
}

patients: List[Patient] = []
doctors: List[Doctor] = []
appointments: List[Appointment] = []


def seed_demo_data():
    if not patients and not doctors and not appointments:
        p1 = Patient(id="p-101", name="Alice Smith", age=32, diagnosis="Type 2 Diabetes")
        p2 = Patient(id="p-102", name="Robert Johnson", age=45, diagnosis="Hypertension")
        p3 = Patient(id="p-103", name="Emily Davis", age=26, diagnosis="Migraine & Fatigue")
        p4 = Patient(id="p-104", name="Michael Wilson", age=58, diagnosis="Cardiovascular Checkup")
        patients.extend([p1, p2, p3, p4])

        d1 = Doctor(id="d-201", name="Dr. Gregory House", specialty="Diagnostic Medicine")
        d2 = Doctor(id="d-202", name="Dr. Allison Cameron", specialty="Immunology")
        d3 = Doctor(id="d-203", name="Dr. James Wilson", specialty="Oncology")
        doctors.extend([d1, d2, d3])

        a1 = Appointment(id="a-301", patient_id="p-101", doctor_id="d-201", slot="2026-10-02 09:30", status="scheduled")
        a2 = Appointment(id="a-302", patient_id="p-102", doctor_id="d-202", slot="2026-10-02 11:00", status="scheduled")
        a3 = Appointment(id="a-303", patient_id="p-103", doctor_id="d-203", slot="2026-10-01 14:00", status="completed")
        appointments.extend([a1, a2, a3])


@app.on_event("startup")
def startup_event():
    seed_demo_data()


@app.get("/")
def read_root():
    return {"message": "Hospital Management System API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/auth/login", response_model=LoginResponse)
def login(creds: LoginRequest):
    user_entry = DEMO_USERS.get(creds.username)
    if not user_entry or user_entry["password"] != creds.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return LoginResponse(
        access_token=f"demo-token-{creds.username}",
        user=user_entry["profile"],
    )


@app.get("/patients", response_model=List[Patient])
def list_patients():
    return patients


@app.post("/patients", response_model=Patient, status_code=201)
def create_patient(patient: Patient):
    new_patient = patient.model_copy(update={"id": str(uuid4())})
    patients.append(new_patient)
    return new_patient


@app.get("/patients/{patient_id}", response_model=Patient)
def get_patient(patient_id: str):
    for patient in patients:
        if patient.id == patient_id:
            return patient
    raise HTTPException(status_code=404, detail="Patient not found")


@app.get("/doctors", response_model=List[Doctor])
def list_doctors():
    return doctors


@app.post("/doctors", response_model=Doctor, status_code=201)
def create_doctor(doctor: Doctor):
    new_doctor = doctor.model_copy(update={"id": str(uuid4())})
    doctors.append(new_doctor)
    return new_doctor


@app.get("/doctors/{doctor_id}", response_model=Doctor)
def get_doctor(doctor_id: str):
    for doctor in doctors:
        if doctor.id == doctor_id:
            return doctor
    raise HTTPException(status_code=404, detail="Doctor not found")


@app.get("/appointments", response_model=List[Appointment])
def list_appointments():
    return appointments


@app.post("/appointments", response_model=Appointment, status_code=201)
def create_appointment(appointment: Appointment):
    if not any(patient.id == appointment.patient_id for patient in patients):
        raise HTTPException(status_code=404, detail="Patient not found")
    if not any(doctor.id == appointment.doctor_id for doctor in doctors):
        raise HTTPException(status_code=404, detail="Doctor not found")

    new_appointment = appointment.model_copy(update={"id": str(uuid4())})
    appointments.append(new_appointment)
    return new_appointment


@app.patch("/appointments/{appointment_id}/status", response_model=Appointment)
def update_appointment_status(appointment_id: str, update: AppointmentStatusUpdate):
    for appt in appointments:
        if appt.id == appointment_id:
            appt.status = update.status
            return appt
    raise HTTPException(status_code=404, detail="Appointment not found")


# Mount full enterprise /api/v1 router endpoints
from backend.app.routers import auth, patients as pt_router, doctors as doc_router, appointments as appt_router, queue, clinical, billing, dashboard, admin, hospital, workspace

api_v1 = FastAPI(title="OneHealth ID API v1")
api_v1.include_router(auth.router)
api_v1.include_router(workspace.router)
api_v1.include_router(pt_router.router)
api_v1.include_router(doc_router.router)
api_v1.include_router(appt_router.router)
api_v1.include_router(queue.router)
api_v1.include_router(clinical.router)
api_v1.include_router(billing.router)
api_v1.include_router(dashboard.router)
api_v1.include_router(admin.router)
api_v1.include_router(hospital.router)

app.mount("/api/v1", api_v1)

# Also mount workspace directly for /me/workspace and /workspace/* convenience
app.include_router(workspace.router)
app.include_router(hospital.router)


