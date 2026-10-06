import os, sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def get_auth_token(username: str, password: str) -> str:
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def doctor_token():
    return get_auth_token("dr.senthil", "doctor123")


@pytest.fixture(scope="module")
def patient_self_token():
    return get_auth_token("patient", "patient123")


def test_doctor_get_patient_consultation_context(doctor_token):
    """Verify doctor can retrieve complete clinical context for Patient p-101."""
    response = client.get(
        "/api/v1/doctor/patients/p-101/context",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "patient" in data
    assert data["patient"]["id"] == "p-101"
    assert "allergies" in data
    assert "chronic_conditions" in data
    assert "active_medications" in data
    assert "recent_investigations" in data
    assert "pending_investigations_count" in data
    assert "upcoming_appointments" in data


def test_doctor_get_patient_longitudinal_history(doctor_token):
    """Verify doctor can retrieve longitudinal cross-hospital history with filters."""
    response = client.get(
        "/api/v1/doctor/patients/p-101/history",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert response.status_code == 200, response.text
    events = response.json()
    assert isinstance(events, list)
    assert len(events) > 0
    # Verify structure
    first_event = events[0]
    assert "event_id" in first_event
    assert "record_type" in first_event
    assert "title" in first_event


def test_patient_reported_intake_workflow(doctor_token, patient_self_token):
    """Verify patient can submit intake and doctor can retrieve it."""
    # 1. Patient submits intake
    intake_payload = {
        "reason_for_visit": "Persistent migraine headache and eye strain for 4 days",
        "duration": "4 days",
        "main_concern": "Migraine with photophobia",
        "description": "Severe throbbing right temporal pain, worse when exposed to bright screen light.",
        "severity": "Severe",
        "location": "Right temporal region",
        "relieving_factors": "Rest in a quiet dark room",
        "aggravating_factors": "Computer screen, sunlight",
        "associated_symptoms": ["Throbbing Pain", "Photophobia", "Nausea"],
        "previous_treatments": "Took Paracetamol 650mg once",
        "current_medications": "Metformin 500mg PO BD",
        "known_allergies": "Penicillin (Severe Rash)"
    }
    sub_res = client.post(
        "/api/v1/doctor/patients/p-101/intake",
        json=intake_payload,
        headers={"Authorization": f"Bearer {patient_self_token}"}
    )
    assert sub_res.status_code == 201, sub_res.text

    # 2. Doctor retrieves patient intake
    get_res = client.get(
        "/api/v1/doctor/patients/p-101/intake",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert get_res.status_code == 200, get_res.text
    intake_data = get_res.json()
    assert intake_data is not None
    assert "migraine" in intake_data["reason_for_visit"].lower() or "headache" in intake_data["reason_for_visit"].lower()


def test_investigation_catalog_and_ordering(doctor_token):
    """Verify doctor can browse investigation catalog and order tests with priority."""
    # 1. Get catalog
    cat_res = client.get(
        "/api/v1/doctor/investigations/catalog?category=Blood",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert cat_res.status_code == 200, cat_res.text
    tests = cat_res.json()
    assert len(tests) > 0
    cbc_test = next((t for t in tests if "CBC" in t["name"] or "Blood" in t["category"]), tests[0])

    # 2. Order investigation
    order_payload = {
        "orders": [
            {
                "test_id": cbc_test["id"],
                "priority": "URGENT",
                "clinical_reason": "Rule out acute infection or anemia",
                "instructions": "Collect early morning sample",
                "fasting_required": False,
                "collection_type": "Hospital"
            }
        ]
    }
    ord_res = client.post(
        "/api/v1/doctor/patients/p-101/investigations",
        json=order_payload,
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert ord_res.status_code == 201, ord_res.text
    created = ord_res.json()
    assert len(created) == 1
    assert created[0]["priority"] == "URGENT"
    order_id = created[0]["id"]

    # 3. Doctor reviews result
    rev_res = client.patch(
        f"/api/v1/doctor/investigations/{order_id}/review",
        json={"review_notes": "Reviewed by Dr. Senthil. Parameters stable. Continue current therapy."},
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert rev_res.status_code == 200, rev_res.text


def test_doctor_referral_creation(doctor_token):
    """Verify doctor can create specialist referral with selective document sharing."""
    # 1. Get directory
    dir_res = client.get(
        "/api/v1/doctor/referrals/directory?specialty=Cardiology",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert dir_res.status_code == 200, dir_res.text

    # 2. Create referral
    ref_payload = {
        "receiving_doctor_id": "doc-k-01",
        "receiving_doctor_name": "Dr. Senthil Nathan",
        "specialty": "Cardiology",
        "referral_type": "INTERNAL",
        "reason": "Evaluation of borderline hypertension and palpitations",
        "clinical_summary": "42F presenting with episodic elevated BP and headaches. Family history of CAD.",
        "priority": "ROUTINE",
        "requested_evaluation": "Echocardiogram + 24h Holter",
        "attached_reports": [
            {"type": "LAB_REPORT", "title": "CBC Report", "date": "02 Oct 2026"},
            {"type": "ECG", "title": "12-Lead ECG", "date": "02 Oct 2026"}
        ]
    }
    create_res = client.post(
        "/api/v1/doctor/patients/p-101/referrals",
        json=ref_payload,
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert create_res.status_code == 201, create_res.text
    ref_data = create_res.json()
    assert ref_data["status"] == "SENT"


def test_anti_idor_cross_patient_access_prevention(patient_self_token):
    """Verify that a patient trying to access another patient's clinical context is rejected with 403."""
    # Patient p-101 attempting to access Patient p-102 context
    response = client.get(
        "/api/v1/doctor/patients/p-102/context",
        headers={"Authorization": f"Bearer {patient_self_token}"}
    )
    assert response.status_code == 403
    assert "Forbidden" in response.text or "restricted" in response.text.lower()
