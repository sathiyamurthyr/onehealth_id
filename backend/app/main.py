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
    doctor_workspace, compliance, super_admin, ohid,
    pharmacy, laboratory, radiology, nursing, ipd, emergency, referrals, discharges,
    integrations, fhir, data_sharing, abdm,
    services, hospital_billing, insurance, operational_analytics, patient_billing,
    ai_gateway, ai_clinical, ai_patient, ai_operations, ai_search, ai_knowledge, ai_agents,
    network_onboarding, network_identity, network_consent, network_exchange,
    network_referrals, network_marketplace, network_pharmacy, network_diagnostics,
    network_emergency, network_intelligence,
    global_country, global_developer, global_telehealth, global_wearables,
    global_payer, global_localization, global_research
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
    allow_headers=["Authorization", "Content-Type", "X-Hospital-Ref-Id", "X-Usertype-Ref-Id", "Accept", "Origin", "X-Signature", "X-Idempotency-Key"],
)

# API v1 Router Mount
api_v1 = FastAPI()
api_v1.include_router(auth.router)
api_v1.include_router(workspace.router)
api_v1.include_router(me.router)
api_v1.include_router(ohid.router)
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
api_v1.include_router(super_admin.router)
api_v1.include_router(pharmacy.router)
api_v1.include_router(laboratory.router)
api_v1.include_router(radiology.router)
api_v1.include_router(nursing.router)
api_v1.include_router(ipd.router)
api_v1.include_router(emergency.router)
api_v1.include_router(referrals.router)
api_v1.include_router(discharges.router)
api_v1.include_router(integrations.router)
api_v1.include_router(fhir.router)
api_v1.include_router(data_sharing.router)
api_v1.include_router(abdm.router)
api_v1.include_router(services.router)
api_v1.include_router(hospital_billing.router)
api_v1.include_router(insurance.router)
api_v1.include_router(operational_analytics.router)
api_v1.include_router(patient_billing.router)
api_v1.include_router(ai_gateway.router)
api_v1.include_router(ai_clinical.router)
api_v1.include_router(ai_patient.router)
api_v1.include_router(ai_operations.router)
api_v1.include_router(ai_search.router)
api_v1.include_router(ai_knowledge.router)
api_v1.include_router(ai_agents.router)

# Phase 7 Network Ecosystem Routers
api_v1.include_router(network_onboarding.router)
api_v1.include_router(network_identity.router)
api_v1.include_router(network_consent.router)
api_v1.include_router(network_exchange.router)
api_v1.include_router(network_referrals.router)
api_v1.include_router(network_marketplace.router)
api_v1.include_router(network_pharmacy.router)
api_v1.include_router(network_diagnostics.router)
api_v1.include_router(network_emergency.router)
api_v1.include_router(network_intelligence.router)

# Phase 8 Global Healthcare Platform Routers
api_v1.include_router(global_country.router)
api_v1.include_router(global_developer.router)
api_v1.include_router(global_telehealth.router)
api_v1.include_router(global_wearables.router)
api_v1.include_router(global_payer.router)
api_v1.include_router(global_localization.router)
api_v1.include_router(global_research.router)

app.mount("/api/v1", api_v1)

# Also mount routers directly on app for convenience
app.include_router(auth.router)
app.include_router(workspace.router)
app.include_router(me.router)
app.include_router(ohid.router)
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
app.include_router(super_admin.router)
app.include_router(pharmacy.router)
app.include_router(laboratory.router)
app.include_router(radiology.router)
app.include_router(nursing.router)
app.include_router(ipd.router)
app.include_router(emergency.router)
app.include_router(referrals.router)
app.include_router(discharges.router)
app.include_router(integrations.router)
app.include_router(fhir.router)
app.include_router(data_sharing.router)
app.include_router(abdm.router)
app.include_router(services.router)
app.include_router(hospital_billing.router)
app.include_router(insurance.router)
app.include_router(operational_analytics.router)
app.include_router(patient_billing.router)
app.include_router(ai_gateway.router)
app.include_router(ai_clinical.router)
app.include_router(ai_patient.router)
app.include_router(ai_operations.router)
app.include_router(ai_search.router)
app.include_router(ai_knowledge.router)
app.include_router(ai_agents.router)

# Phase 7 Network Ecosystem Routers on Root
app.include_router(network_onboarding.router)
app.include_router(network_identity.router)
app.include_router(network_consent.router)
app.include_router(network_exchange.router)
app.include_router(network_referrals.router)
app.include_router(network_marketplace.router)
app.include_router(network_pharmacy.router)
app.include_router(network_diagnostics.router)
app.include_router(network_emergency.router)
app.include_router(network_intelligence.router)

# Phase 8 Global Healthcare Platform Routers on Root
app.include_router(global_country.router)
app.include_router(global_developer.router)
app.include_router(global_telehealth.router)
app.include_router(global_wearables.router)
app.include_router(global_payer.router)
app.include_router(global_localization.router)
app.include_router(global_research.router)

@app.get("/")
def read_root():
    return {"message": "Hello World"}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "oh-id-api"}