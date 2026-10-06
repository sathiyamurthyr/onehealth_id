import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.routers import (
    auth, patients, doctors, appointments, queue, clinical, billing, dashboard,
    admin, hospital, workspace, me, family, discovery, prescriptions, public_verify,
    doctor_workspace, compliance
)

from backend.app.core.middleware import SecurityHeadersMiddleware

app = FastAPI(
    title="OneHealth ID (OH-ID) Enterprise Hospital Operating System API",
    version="1.0.0",
    description="Enterprise Hospital Operating System powered exclusively by Database Views and Stored Procedures."
)

# Enterprise Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# Hardened CORS Middleware (Explicit origins, restricted methods & headers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Hospital-Ref-Id", "X-Usertype-Ref-Id", "Accept", "Origin"],
)

# API v1 Router Mount
api_v1 = FastAPI()
api_v1.include_router(auth.router)
api_v1.include_router(workspace.router)
api_v1.include_router(me.router)
api_v1.include_router(family.router)
api_v1.include_router(discovery.router)
api_v1.include_router(prescriptions.router)
api_v1.include_router(public_verify.router)
api_v1.include_router(patients.router)
api_v1.include_router(doctors.router)
api_v1.include_router(appointments.router)
api_v1.include_router(queue.router)
api_v1.include_router(clinical.router)
api_v1.include_router(doctor_workspace.router)
api_v1.include_router(billing.router)
api_v1.include_router(dashboard.router)
api_v1.include_router(admin.router)
api_v1.include_router(hospital.router)
api_v1.include_router(compliance.router)

app.mount("/api/v1", api_v1)

# Also mount routers directly on app for convenience
app.include_router(auth.router)
app.include_router(workspace.router)
app.include_router(me.router)
app.include_router(family.router)
app.include_router(discovery.router)
app.include_router(prescriptions.router)
app.include_router(public_verify.router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(queue.router)
app.include_router(clinical.router)
app.include_router(doctor_workspace.router)
app.include_router(billing.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(hospital.router)
app.include_router(compliance.router)

@app.get("/")
def read_root():
    return {"message": "Hello World"}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "oh-id-api"}