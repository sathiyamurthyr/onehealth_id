import sys
import os
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
import re
import uuid
from datetime import datetime, timedelta, timezone
from jose import jwt
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.repositories.sp_views_repository import sp_repository

client = TestClient(app)

@pytest.fixture
def patient_auth_headers():
    token = jwt.encode(
        {
            "sub": "patient",
            "uid": "usr-patient",
            "role": "PATIENT",
            "roles": ["PATIENT"],
            "hospital_ref_id": "hosp-kedar",
            "hospital_id": "hosp-kedar",
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": "hosp-kedar"
    }

@pytest.fixture
def doctor_auth_headers():
    token = jwt.encode(
        {
            "sub": "dr.kumar",
            "uid": "usr-kedar-doc-kumar",
            "role": "DOCTOR",
            "roles": ["DOCTOR"],
            "hospital_ref_id": "hosp-kedar",
            "hospital_id": "hosp-kedar",
            "permissions": ["clinical.read", "clinical.write", "consultation.create", "consultation.update", "patient.read", "prescription.sign", "lab.write"],
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": "hosp-kedar"
    }

@pytest.fixture
def receptionist_auth_headers():
    token = jwt.encode(
        {
            "sub": "receptionist",
            "uid": "usr-receptionist",
            "role": "RECEPTIONIST",
            "roles": ["RECEPTIONIST"],
            "hospital_ref_id": "hosp-kedar",
            "hospital_id": "hosp-kedar",
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": "hosp-kedar"
    }

# ------------------------------------------------------------------------------
# 1. OH-ID FORMAT & GENERATION TESTS
# ------------------------------------------------------------------------------

def test_generate_unique_oh_id_format():
    ohid = sp_repository.generate_unique_oh_id()
    assert ohid.startswith("OH-")
    assert len(ohid) == 15 # "OH-" + 12 chars
    assert re.match(r"^OH-[A-Z0-9]{12}$", ohid)

def test_get_identity_by_ohid_public_and_auth(patient_auth_headers, receptionist_auth_headers):
    # Public lookup
    p = sp_repository.get_patient_by_id("p-101")
    target_ohid = p["onehealth_id"]
    res_pub = client.get(f"/api/v1/oh-id/{target_ohid}")

    assert res_pub.status_code == 200
    data = res_pub.json()["data"]
    assert "onehealth_id" in data
    assert data["verification_status"] == "VERIFIED_ACTIVE"

    # Authenticated lookup
    res_auth = client.get(
        f"/api/v1/oh-id/{target_ohid}",
        headers=receptionist_auth_headers
    )
    assert res_auth.status_code == 200
    data_auth = res_auth.json()["data"]
    assert "connected_facilities" in data_auth
    assert len(data_auth["connected_facilities"]) >= 1

# ------------------------------------------------------------------------------
# 2. ZERO-KNOWLEDGE QR GENERATION & SERVER-SIDE VERIFICATION
# ------------------------------------------------------------------------------

def test_qr_token_generate_and_verify(patient_auth_headers):
    # Generate QR pass for authenticated patient
    res_gen = client.post(
        "/api/v1/oh-id/qr/generate",
        json={},
        headers=patient_auth_headers
    )
    assert res_gen.status_code == 200
    qr_data = res_gen.json()["data"]
    qr_token = qr_data["qr_token"]
    assert qr_token is not None

    # Verify QR pass server-side
    res_ver = client.post(
        "/api/v1/oh-id/qr/verify",
        json={"qr_token": qr_token, "scanned_by": "kiosk_test"}
    )
    assert res_ver.status_code == 200
    ver_data = res_ver.json()["data"]
    assert ver_data["verification_status"] == "VERIFIED_ACTIVE"
    assert "connected_facilities" in ver_data

# ------------------------------------------------------------------------------
# 3. RECEPTION PATIENT SEARCH & REGISTRATION FLOW
# ------------------------------------------------------------------------------

def test_hospital_patient_search_and_registration(receptionist_auth_headers):
    # 1. Search existing patient
    res_search = client.post(
        "/api/v1/hospital/patients/search",
        json={"query": "Alice", "hospital_id": "hosp-kedar"},
        headers=receptionist_auth_headers
    )
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert search_data["success"] is True

    # 2. Register a new patient
    random_suffix = uuid.uuid4().hex[:6]
    test_phone = f"+91 98401 {random_suffix[:5]}"
    reg_payload = {
        "name": f"Test Patient {random_suffix}",
        "age": 32,
        "gender": "Female",
        "phone": test_phone,
        "email": f"test_{random_suffix}@example.com",
        "city": "Chennai",
        "hospital_id": "hosp-kedar",
        "diagnosis": "Cardiology Check-up"
    }

    res_reg = client.post(
        "/api/v1/hospital/patients/register",
        json=reg_payload,
        headers=receptionist_auth_headers
    )
    assert res_reg.status_code == 201
    reg_data = res_reg.json()
    assert reg_data["success"] is True
    assert reg_data["onehealth_id"].startswith("OH-")
    assert reg_data["local_uhid"].startswith("UHID-")
    new_patient_id = reg_data["patient"]["id"]

    # 3. Create visit encounter for this registered patient
    res_visit = client.post(
        f"/api/v1/hospital/patients/{new_patient_id}/visits",
        json={"reason": "Routine Consultation", "priority": "NORMAL"},
        headers=receptionist_auth_headers
    )
    assert res_visit.status_code == 201
    visit_data = res_visit.json()
    assert visit_data["success"] is True
    assert "token_number" in visit_data["visit"]

# ------------------------------------------------------------------------------
# 4. PATIENT WORKSPACE /ME ENDPOINTS
# ------------------------------------------------------------------------------

def test_patient_my_ohid_card(patient_auth_headers):
    res = client.get("/api/v1/me/oh-id", headers=patient_auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "onehealth_id" in data
    assert "qr_token" in data
    assert "connected_facilities" in data
    assert data["verification_status"] == "VERIFIED_ACTIVE"

def test_patient_unified_health_timeline(patient_auth_headers):
    res = client.get("/api/v1/me/health-timeline", headers=patient_auth_headers)
    assert res.status_code == 200
    res_json = res.json()
    assert "data" in res_json
    events = res_json["data"]
    assert isinstance(events, list)
    if len(events) > 0:
        evt = events[0]
        assert "event_id" in evt
        assert "event_type" in evt
        assert "title" in evt
        assert "event_timestamp" in evt

# ------------------------------------------------------------------------------
# 5. CLINICAL RECORD IMMUTABILITY & SUPERSEDING
# ------------------------------------------------------------------------------

def test_consultation_finalization_immutability(doctor_auth_headers):
    # Find or register patient in hosp-kedar
    patients = sp_repository.list_patients(hospital_id="hosp-kedar")
    if not patients:
        p_res = sp_repository.register_hospital_patient("hosp-kedar", {
            "name": "Clinical Test Patient",
            "phone": "+91 99999 11223",
            "gender": "Female",
            "age": 28
        })
        patient_id = p_res["id"]
    else:
        patient_id = patients[0]["id"]

    # Record consultation draft
    res_create = client.post(
        "/api/v1/clinical/consultations",
        json={
            "patient_id": patient_id,
            "doctor_id": "doc-k-01",
            "diagnosis": "Essential Hypertension Stage 1",
            "symptoms": "Mild dizziness on standing",
            "clinical_notes": "BP 140/90 mmHg. Advised lifestyle modifications and low sodium diet."
        },
        headers=doctor_auth_headers
    )
    assert res_create.status_code == 201
    con_data = res_create.json()
    con_id = con_data["id"]

    # Finalize consultation
    res_fin = client.post(
        f"/api/v1/clinical/consultations/{con_id}/finalize",
        json={"notes": "Finalized after clinician review"},
        headers=doctor_auth_headers
    )
    assert res_fin.status_code == 200
    fin_data = res_fin.json()
    assert fin_data["success"] is True
    assert fin_data["consultation"]["status"] == "FINALIZED"
    assert fin_data["consultation"]["digital_signature"] is not None

def test_prescription_supersede_workflow(doctor_auth_headers):
    patients = sp_repository.list_patients(hospital_id="hosp-kedar")
    patient_id = patients[0]["id"] if patients else "p-101"
    
    # Create or fetch existing prescription
    p_rx = sp_repository.list_patient_prescriptions(patient_id)
    if p_rx:
        rx_id = p_rx[0]["id"]
    else:
        rx_create_res = client.post(
            "/api/v1/clinical/prescriptions",
            json={
                "patient_id": patient_id,
                "doctor_id": "doc-k-01",
                "items": [
                    {
                        "medicine_name": "Telmisartan 40mg",
                        "dosage": "40mg",
                        "frequency": "1-0-0",
                        "duration_days": 15,
                        "quantity": 15
                    }
                ],
                "instructions": "Take after food",
                "status": "FINALIZED"
            },
            headers=doctor_auth_headers
        )
        assert rx_create_res.status_code == 201
        rx_id = rx_create_res.json()["id"]

    supersede_payload = {
        "new_items": [
            {
                "medicine_name": "Amlodipine 5mg",
                "dosage": "5mg",
                "frequency": "1-0-0 After Food",
                "duration_days": 30,
                "quantity": 30
            }
        ],
        "instructions": "Take once daily in the morning after breakfast",
        "reason": "Dose adjustment for better blood pressure control"
    }

    res_sup = client.post(
        f"/api/v1/clinical/prescriptions/{rx_id}/supersede",
        json=supersede_payload,
        headers=doctor_auth_headers
    )
    assert res_sup.status_code == 200
    sup_data = res_sup.json()
    assert sup_data["success"] is True
    new_rx = sup_data["prescription"]
    assert new_rx["status"] == "FINALIZED"
    assert len(new_rx["items"]) >= 1
