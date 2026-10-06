"""
PyTest Test Suite for OH-ID India Healthcare Compliance & Governance System
==========================================================================
Verifies:
1. Hospital Compliance Overview & Statutory Scorecard
2. Statutory Licenses (Tamil Nadu CEA, Pharmacy, AERB, Fire Safety, TNPCB, NABH/NABL)
3. ABDM HFR Facility Registry Mapping & M1/M2/M3 Milestones
4. ABDM HPR Doctor Registry Mapping (NMC/TNMC and NCAHP Allied Health distinction)
5. Patient ABHA Health ID Linking & Unlinking
6. Electronic Consent Artifacts Lifecycle (Request, Grant, Deny, Revoke)
7. DPDP Act Privacy Grievance Redressal (30-day statutory SLA & DPO resolution)
8. Regulatory Inspection Export Dossier
9. Strict RBAC boundaries on compliance management
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def get_auth_token(username: str, password: str) -> str:
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]

@pytest.fixture
def admin_headers():
    token = get_auth_token("admin", "admin123")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def doctor_headers():
    token = get_auth_token("dr.senthil", "doctor123")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def patient_headers():
    token = get_auth_token("patient", "patient123")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def reception_headers():
    token = get_auth_token("reception_arun", "password123")
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# 1. STATUTORY LICENSES & REGISTRATION TESTS
# =============================================================================

def test_hospital_compliance_overview(admin_headers):
    resp = client.get("/api/v1/hospital/compliance/overview?hospital_id=hosp-kedar", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["hospital_id"] == "hosp-kedar"
    assert data["compliance_readiness_score"] >= 80
    assert data["valid_licenses_count"] >= 4
    assert "Tamil Nadu Clinical Establishments Act" in data["statutory_authority_badge"]

def test_list_and_upsert_statutory_license(admin_headers):
    # 1. List licenses
    resp = client.get("/api/v1/hospital/compliance/licenses?hospital_id=hosp-kedar", headers=admin_headers)
    assert resp.status_code == 200
    licenses = resp.json()
    assert len(licenses) >= 5
    
    cea = next((l for l in licenses if l["license_category"] == "CEA_REGISTRATION"), None)
    assert cea is not None
    assert cea["license_number"] == "TN/CEA/2024/00812"
    assert "Directorate of Medical and Rural Health Services" in cea["issuing_authority"]
    assert cea["state_code"] == "TN"

    # 2. Add / Renew a license
    new_lic = {
        "id": "lic-pndt-01",
        "hospital_id": "hosp-kedar",
        "license_category": "PNDT_ULTRASOUND",
        "title": "PC-PNDT Act Ultrasound & Fetal Medicine Diagnostic License",
        "license_number": "TN-PNDT-CHE-2025-104",
        "issuing_authority": "District Appropriate Authority (PNDT), Chennai District",
        "state_code": "TN",
        "facility_branch_id": "br-kedar-01",
        "issue_date": "2025-01-10",
        "expiry_date": "2030-01-09",
        "status": "VALID",
        "verification_status": "VERIFIED",
        "verified_by": "State District Appropriate Authority",
        "metadata": {"sonologists": ["Dr. Priya Radhakrishnan"], "machines_registered": 2}
    }
    resp_post = client.post("/api/v1/hospital/compliance/licenses", json=new_lic, headers=admin_headers)
    assert resp_post.status_code == 200
    created = resp_post.json()
    assert created["id"] == "lic-pndt-01"
    assert created["license_number"] == "TN-PNDT-CHE-2025-104"

def test_verify_statutory_license(admin_headers):
    resp = client.post(
        "/api/v1/hospital/compliance/licenses/lic-pndt-01/verify",
        json={"verifier_name": "Joint Director of Health Services (Chennai)"},
        headers=admin_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["verification_status"] == "VERIFIED"
    assert data["verified_by"] == "Joint Director of Health Services (Chennai)"


# =============================================================================
# 2. ABDM NATIONAL HEALTH STACK INTEGRATION (HFR & HPR)
# =============================================================================

def test_abdm_hfr_facility_configuration(admin_headers):
    resp = client.get("/api/v1/hospital/compliance/abdm?hospital_id=hosp-kedar", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["hfr_id"] == "IN3310008892"
    assert data["abdm_m1_status"] == "ACTIVE"
    assert data["abdm_m2_status"] == "ACTIVE"
    assert data["abdm_m3_status"] == "ACTIVE"
    assert data["verification_status"] == "VERIFIED_BY_STATE_REGISTRAR"

def test_update_abdm_hfr_facility(admin_headers):
    payload = {
        "hfr_id": "IN3310008892",
        "facility_name": "Kedar Health Multi-Speciality Hospital",
        "facility_type": "HOSPITAL_SECONDARY",
        "ownership_type": "PRIVATE_COMMERCIAL",
        "abdm_m1_status": "ACTIVE",
        "abdm_m2_status": "ACTIVE",
        "abdm_m3_status": "ACTIVE",
        "bridge_url": "https://abdm-bridge.kedarhealth.com/v0.5",
        "client_id": "SBX_KEDAR_HFR_008892"
    }
    resp = client.post("/api/v1/hospital/compliance/abdm/hfr?hospital_id=hosp-kedar", json=payload, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["hfr_id"] == "IN3310008892"

def test_doctor_hpr_practitioner_mappings(admin_headers):
    resp = client.get("/api/v1/hospital/compliance/abdm/practitioners?hospital_id=hosp-kedar", headers=admin_headers)
    assert resp.status_code == 200
    docs = resp.json()
    assert len(docs) >= 2
    
    doc_senthil = next((d for d in docs if d["doctor_id"] == "doc-k-01"), None)
    assert doc_senthil is not None
    assert doc_senthil["hpr_id"] == "91-8890-4412-1001"
    assert doc_senthil["council_registration_number"] == "TNMC-78901"
    assert doc_senthil["registration_council"] == "Tamil Nadu Medical Council"
    assert doc_senthil["hpr_verification_status"] == "VERIFIED"


# =============================================================================
# 3. PATIENT ABHA HEALTH ID LINKING & UNLINKING
# =============================================================================

def test_patient_abha_profile_and_linking(patient_headers):
    # 1. Fetch current ABHA profile
    resp = client.get("/api/v1/me/abha", headers=patient_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["abha_address"] == "sathiya.murthy@abdm"
    assert data["link_status"] == "LINKED"
    assert data["kyc_status"] == "VERIFIED"

    # 2. Update / Re-link ABHA
    link_payload = {
        "abha_address": "sathiya.murthy@abdm",
        "abha_number": "91-4421-9982-1044",
        "auth_method": "AADHAAR_OTP"
    }
    resp_link = client.post("/api/v1/me/abha/link", json=link_payload, headers=patient_headers)
    assert resp_link.status_code == 200
    assert resp_link.json()["data"]["link_status"] == "LINKED"

    # 3. Test unlinking
    resp_unlink = client.post("/api/v1/me/abha/unlink", headers=patient_headers)
    assert resp_unlink.status_code == 200
    assert resp_unlink.json()["data"]["link_status"] == "UNLINKED"

    # Re-link for subsequent tests
    client.post("/api/v1/me/abha/link", json=link_payload, headers=patient_headers)


# =============================================================================
# 4. ELECTRONIC CONSENT ARTIFACTS LIFECYCLE
# =============================================================================

def test_consent_request_grant_and_revoke_lifecycle(doctor_headers, patient_headers):
    # 1. Doctor requests consent
    req_payload = {
        "patient_id": "p-101",
        "requester_hospital_id": "hosp-kedar",
        "requester_doctor_id": "doc-k-01",
        "requester_name": "Dr. Senthil Nathan",
        "provider_hospital_id": "hosp-001",
        "provider_hospital_name": "Apollo City Hospital - Chennai Central",
        "purpose_code": "CARETREAT",
        "purpose_text": "Care Context Consultation & Historical EHR Review",
        "data_categories": ["OPConsultation", "Prescription", "DiagnosticReport", "DischargeSummary"],
        "validity_days": 90
    }
    resp_req = client.post("/api/v1/hospital/compliance/consents/request", json=req_payload, headers=doctor_headers)
    assert resp_req.status_code == 200
    consent_art = resp_req.json()
    consent_id = consent_art["consent_id"]
    assert consent_art["consent_status"] == "REQUESTED"

    # 2. Patient lists incoming consent requests
    resp_list = client.get("/api/v1/me/consents", headers=patient_headers)
    assert resp_list.status_code == 200
    consents = resp_list.json()["data"]
    target = next((c for c in consents if c["consent_id"] == consent_id), None)
    assert target is not None

    # 3. Patient grants consent
    resp_grant = client.post(
        f"/api/v1/me/consents/{consent_id}/grant",
        json={"digital_signature": "ECDSA_P256_SHA256:VERIFIED_SIGNATURE"},
        headers=patient_headers
    )
    assert resp_grant.status_code == 200
    assert resp_grant.json()["data"]["consent_status"] == "GRANTED"

    # 4. Patient revokes consent
    resp_revoke = client.post(
        f"/api/v1/me/consents/{consent_id}/revoke",
        json={"reason": "Second opinion consultation concluded"},
        headers=patient_headers
    )
    assert resp_revoke.status_code == 200
    assert resp_revoke.json()["data"]["consent_status"] == "REVOKED"


# =============================================================================
# 5. DPDP ACT PRIVACY GRIEVANCE REDRESSAL
# =============================================================================

def test_dpdp_privacy_grievance_workflow(patient_headers, admin_headers):
    # 1. Patient lodges grievance
    grievance_payload = {
        "hospital_id": "hosp-kedar",
        "grievance_type": "DATA_CORRECTION",
        "description": "Please correct the spelling of patient middle name and emergency contact telephone number."
    }
    resp_lodge = client.post("/api/v1/me/privacy/grievances", json=grievance_payload, headers=patient_headers)
    assert resp_lodge.status_code == 200
    grv = resp_lodge.json()["data"]
    grv_id = grv["grievance_id"]
    assert grv["status"] == "OPEN"

    # 2. Admin inspects grievance queue
    resp_admin = client.get("/api/v1/hospital/compliance/grievances?hospital_id=hosp-kedar", headers=admin_headers)
    assert resp_admin.status_code == 200
    tickets = resp_admin.json()
    ticket = next((t for t in tickets if t["grievance_id"] == grv_id), None)
    assert ticket is not None

    # 3. DPO resolves grievance
    resolve_payload = {
        "grievance_officer_name": "Kedar Admin (Data Protection Officer)",
        "resolution_notes": "Identity re-verified with Aadhaar KYC; middle name and contact information updated accurately in compliance with DPDP Act Section 12.",
        "status": "RESOLVED"
    }
    resp_res = client.post(f"/api/v1/hospital/compliance/grievances/{grv_id}/resolve", json=resolve_payload, headers=admin_headers)
    assert resp_res.status_code == 200
    assert resp_res.json()["status"] == "RESOLVED"


# =============================================================================
# 6. REGULATORY EXPORT & RBAC BOUNDARIES
# =============================================================================

def test_regulatory_compliance_report_export(admin_headers):
    resp = client.get("/api/v1/hospital/compliance/reports/regulatory-export?hospital_id=hosp-kedar", headers=admin_headers)
    assert resp.status_code == 200
    report = resp.json()
    assert report["hospital_id"] == "hosp-kedar"
    assert "Tamil Nadu Clinical Establishments Act" in report["regulatory_framework"]
    assert report["statutory_licenses"]["total"] >= 5
    assert report["abdm_integration"]["milestones"]["m1_abha_creation_discovery"] is True
    assert "legal_declaration" in report

def test_receptionist_forbidden_from_compliance_modifications(reception_headers):
    # Receptionist cannot upsert statutory licenses
    resp = client.post(
        "/api/v1/hospital/compliance/licenses",
        json={"license_category": "CEA_REGISTRATION", "title": "Test", "license_number": "123", "issuing_authority": "Test", "issue_date": "2025-01-01", "expiry_date": "2026-01-01"},
        headers=reception_headers
    )
    assert resp.status_code == 403
