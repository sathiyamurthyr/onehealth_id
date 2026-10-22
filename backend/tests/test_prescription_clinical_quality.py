import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
import uuid
import json
from datetime import datetime, date, timedelta
from jose import jwt
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.database.session import get_db_cursor
from backend.app.repositories.sp_views_repository import sp_repository

client = TestClient(app)

def create_auth_headers(user_id: str, role: str = "DOCTOR", permissions: list = None, hospital_id: str = "hosp-kedar"):
    perms = permissions if permissions is not None else (["*"] if role in ["DOCTOR", "HOSPITAL_ADMIN", "SUPER_ADMIN"] else ["patient.self.read"])
    payload = {
        "sub": f"user_{user_id}",
        "uid": user_id,
        "name": f"Test {role.title()}",
        "hospital_id": hospital_id,
        "hospital_ref_id": hospital_id,
        "role": role,
        "role_id": f"role-{role.lower()}",
        "usertype_ref_id": f"role-{role.lower()}",
        "permissions": perms
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": hospital_id,
        "X-Usertype-Ref-Id": f"role-{role.lower()}"
    }

@pytest.fixture(scope="module")
def clinical_test_env():
    """Sets up hospital, doctor, patient, and benchmark prescriptions for clinical tests."""
    suffix = uuid.uuid4().hex[:6].lower()
    hosp_id = "hosp-kedar"
    doc_id = f"doc-test-{suffix}"
    pat1_id = f"pat-test-1-{suffix}"
    pat2_id = f"pat-test-2-{suffix}"

    with get_db_cursor() as cur:
        # Ensure hospital exists with exact name and address
        cur.execute("""
            INSERT INTO oh_id.hospitals (id, name, code, address, phone, is_active)
            VALUES (%s, 'Kedar Hospital', 'KEDAR-MGL', 'Mount-Poonamallee High Road, Mugalivakkam, Chennai', '+91 44 2252 1100', TRUE)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, phone = EXCLUDED.phone;
        """, (hosp_id,))

        # Create doctor with registration details
        cur.execute("""
            INSERT INTO oh_id.doctors (
                id, hospital_id, name, specialty, qualification, registration_number, registration_authority, is_available
            ) VALUES (
                %s, %s, 'Dr. Senthil Kumar', 'General Medicine', 'MBBS, MD', 'TMC-64829', 'Tamil Nadu Medical Council', TRUE
            ) ON CONFLICT (id) DO UPDATE SET
                registration_number = EXCLUDED.registration_number,
                registration_authority = EXCLUDED.registration_authority;
        """, (doc_id, hosp_id))

        # Create patients
        cur.execute("""
            INSERT INTO oh_id.patients (id, hospital_id, name, onehealth_id, blood_group, age, gender, qr_token, diagnosis)
            VALUES (%s, %s, 'Kavitha Raman', %s, 'B+', 34, 'FEMALE', %s, 'General Checkup')
            ON CONFLICT (id) DO NOTHING;
        """, (pat1_id, hosp_id, f"OH-2026-{suffix}1", f"qr-{suffix}1"))

        cur.execute("""
            INSERT INTO oh_id.patients (id, hospital_id, name, onehealth_id, blood_group, age, gender, qr_token, diagnosis)
            VALUES (%s, %s, 'Suresh Kumar', %s, 'A+', 45, 'MALE', %s, 'General Checkup')
            ON CONFLICT (id) DO NOTHING;
        """, (pat2_id, hosp_id, f"OH-2026-{suffix}2", f"qr-{suffix}2"))

    return {
        "hospital_id": hosp_id,
        "doctor_id": doc_id,
        "patient1_id": pat1_id,
        "patient2_id": pat2_id,
        "suffix": suffix
    }


def test_01_hospital_name_comes_from_db(clinical_test_env):
    """1. Hospital name in prescription detail comes from DB (not hardcoded)."""
    env = clinical_test_env
    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Hypertension Stage 1",
        actor_id="doctor"
    )
    headers = create_auth_headers(env["doctor_id"], role="DOCTOR")
    res = client.get(f"/api/v1/prescriptions/{rx['id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["hospital_name"] == "Kedar Hospital"
    assert data["hospital_address"] == "Mount-Poonamallee High Road, Mugalivakkam, Chennai"


def test_02_prescription_id_matches_request(clinical_test_env):
    """2. Prescription ID matches requested ID."""
    env = clinical_test_env
    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Mild Dyspepsia",
        actor_id="doctor"
    )
    headers = create_auth_headers(env["doctor_id"], role="DOCTOR")
    res = client.get(f"/api/v1/prescriptions/{rx['id']}", headers=headers)
    assert res.status_code == 200
    assert res.json()["id"] == rx["id"]


def test_03_active_prescription_has_valid_dates(clinical_test_env):
    """3. Active prescription has valid_from and valid_until dates, computed_status is ACTIVE."""
    env = clinical_test_env
    today = date.today().isoformat()
    future = (date.today() + timedelta(days=30)).isoformat()

    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Type 2 Diabetes Mellitus",
        valid_from=today,
        valid_until=future,
        actor_id="doctor"
    )
    detail = sp_repository.get_patient_prescription_detail(rx["id"])
    assert detail is not None
    assert detail["computed_status"] == "ACTIVE"
    assert detail["is_valid"] is True
    assert detail["is_expired"] is False
    assert str(detail["valid_from"]) == today
    assert str(detail["valid_until"]) == future


def test_04_prescription_without_validity_has_null_dates_and_unspecified_flag(clinical_test_env):
    """4. Prescription created without validity has NULL dates and validity_period_not_specified=True."""
    env = clinical_test_env
    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Acute Pharyngitis",
        valid_from=None,
        valid_until=None,
        actor_id="doctor"
    )
    detail = sp_repository.get_patient_prescription_detail(rx["id"])
    assert detail is not None
    assert detail["valid_from"] is None
    assert detail["valid_until"] is None
    assert detail["validity_period_not_specified"] is True
    assert detail["computed_status"] == "ACTIVE"
    assert "No explicit validity period" in detail["validity_narrative"]


def test_05_expired_prescription_is_viewable_with_expired_status(clinical_test_env):
    """5. Expired prescription is viewable (200) with computed_status=EXPIRED, is_valid=False, is_expired=True."""
    env = clinical_test_env
    past_from = (date.today() - timedelta(days=60)).isoformat()
    past_until = (date.today() - timedelta(days=30)).isoformat()

    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Chronic Sinusitis",
        valid_from=past_from,
        valid_until=past_until,
        actor_id="doctor"
    )
    headers = create_auth_headers(env["doctor_id"], role="DOCTOR")
    res = client.get(f"/api/v1/prescriptions/{rx['id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["computed_status"] == "EXPIRED"
    assert data["is_valid"] is False
    assert data["is_expired"] is True
    assert data["watermark_text"] == "EXPIRED"


def test_06_superseded_prescription_status(clinical_test_env):
    """6. Superseded prescription has computed_status=SUPERSEDED, is_valid=False."""
    env = clinical_test_env
    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Hypertension",
        actor_id="doctor"
    )
    newer_rx_id = f"RX-NEW-{uuid.uuid4().hex[:6].upper()}"
    with get_db_cursor() as cur:
        cur.execute("""
            UPDATE oh_id.prescriptions
            SET superseded_by_id = %s, superseded_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (newer_rx_id, rx["id"]))

    detail = sp_repository.get_patient_prescription_detail(rx["id"])
    assert detail["computed_status"] == "SUPERSEDED"
    assert detail["is_valid"] is False
    assert detail["watermark_text"] == "SUPERSEDED"


def test_07_medicine_items_have_required_keys(clinical_test_env):
    """7. Medicine items have all required keys (medicine_name, frequency, strength, dosage_form, route)."""
    env = clinical_test_env
    items = [
        {
            "medicine_name": "Telmisartan 40mg",
            "strength": "40 mg",
            "dosage_form": "Tablet",
            "dose": "1 tab",
            "frequency": "Once daily (1-0-0)",
            "duration_days": 30,
            "route": "Oral",
            "quantity": 30,
            "food_instruction": "After food"
        }
    ]
    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Essential Hypertension",
        items=items,
        actor_id="doctor"
    )
    detail = sp_repository.get_patient_prescription_detail(rx["id"])
    assert len(detail["items"]) == 1
    it = detail["items"][0]
    for key in ["medicine_name", "frequency", "strength", "dosage_form", "route", "quantity"]:
        assert key in it
        assert it[key] is not None


def test_08_medication_data_matches_benchmark_input(clinical_test_env):
    """8. Medication data matches benchmark inputs (Telmisartan, Atorvastatin) accurately."""
    env = clinical_test_env
    benchmark_items = [
        {
            "medicine_name": "Telmisartan 40mg",
            "strength": "40 mg",
            "dosage_form": "Tablet",
            "dose": "1 tab",
            "frequency": "Once daily morning",
            "duration_days": 30,
            "route": "Oral",
            "quantity": 30
        },
        {
            "medicine_name": "Atorvastatin 10mg",
            "strength": "10 mg",
            "dosage_form": "Tablet",
            "dose": "1 tab",
            "frequency": "Once daily night",
            "duration_days": 30,
            "route": "Oral",
            "quantity": 30
        }
    ]
    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Hypertension & Dyslipidemia",
        items=benchmark_items,
        actor_id="doctor"
    )
    detail = sp_repository.get_patient_prescription_detail(rx["id"])
    med_names = [it["medicine_name"] for it in detail["items"]]
    assert "Telmisartan 40mg" in med_names
    assert "Atorvastatin 10mg" in med_names
    strengths = [it["strength"] for it in detail["items"]]
    assert "40 mg" in strengths
    assert "10 mg" in strengths


def test_09_prescriber_identity_fields_present(clinical_test_env):
    """9. Prescriber identity fields present (doctor_name, signed_by, signed_at, digital_signature_hash, registration authority)."""
    env = clinical_test_env
    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Clinical Assessment",
        actor_id="doctor"
    )
    detail = sp_repository.get_patient_prescription_detail(rx["id"])
    assert detail["doctor_name"] == "Dr. Senthil Kumar"
    assert detail["signed_by"] is not None
    assert detail["digital_signature_hash"] is not None
    assert detail["doctor_registration"] == "TMC-64829"
    assert detail["doctor_registration_authority"] == "Tamil Nadu Medical Council"


def test_10_public_verification_does_not_expose_clinical_data(clinical_test_env):
    """10. Public verification endpoint does NOT expose diagnosis, doctor_notes, allergies_snapshot, vitals_snapshot."""
    env = clinical_test_env
    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Highly Confidential Psychiatric Assessment",
        doctor_notes="Confidential therapy notes that must not be public",
        actor_id="doctor"
    )
    token = rx["verification_token"]
    res = client.get(f"/api/v1/public/verify/prescription/{token}")
    assert res.status_code == 200
    res_data = res.json()["data"]

    # Verify public authenticity data is present
    assert res_data["is_verified"] is True
    assert res_data["prescription_id"] == rx["id"]
    assert "hospital" in res_data
    assert "doctor" in res_data
    assert res_data["doctor"]["registration_authority"] == "Tamil Nadu Medical Council"

    # CRITICAL: Verify NO confidential clinical data leaked
    assert "diagnosis" not in res_data
    assert "doctor_notes" not in res_data
    assert "allergies_snapshot" not in res_data
    assert "vitals_snapshot" not in res_data
    assert "chief_complaint" not in res_data


def test_11_prescription_version_preserved(clinical_test_env):
    """11. Prescription version preserved (version integer >= 1)."""
    env = clinical_test_env
    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Asthma Exacerbation",
        actor_id="doctor"
    )
    detail = sp_repository.get_patient_prescription_detail(rx["id"])
    assert detail["version"] >= 1


def test_12_pdf_endpoint_returns_200_with_complete_data(clinical_test_env):
    """12. PDF endpoint returns 200 with complete prescription data."""
    env = clinical_test_env
    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Upper Respiratory Infection",
        actor_id="doctor"
    )
    headers = create_auth_headers(env["doctor_id"], role="DOCTOR")
    res = client.get(f"/api/v1/prescriptions/{rx['id']}/pdf", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "download_url" in data
    assert "filename" in data
    assert "prescription" in data
    assert data["prescription"]["id"] == rx["id"]


def test_13_unauthenticated_access_returns_401(clinical_test_env):
    """13. Unauthenticated access returns 401."""
    env = clinical_test_env
    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Common Cold",
        actor_id="doctor"
    )
    res = client.get(f"/api/v1/prescriptions/{rx['id']}")
    assert res.status_code in [401, 403]


def test_14_patient_idor_protection(clinical_test_env):
    """14. Patient IDOR protection (403 when patient views another patient's prescription)."""
    env = clinical_test_env
    # Prescription belongs to patient1
    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Sprain",
        actor_id="doctor"
    )
    # Auth headers for patient2 (different patient)
    headers_pat2 = create_auth_headers(env["patient2_id"], role="PATIENT", permissions=["patient.self.read"])
    res = client.get(f"/api/v1/prescriptions/{rx['id']}", headers=headers_pat2)
    assert res.status_code == 403
    assert "Forbidden" in res.json().get("detail", "")


def test_15_medication_schedule_matrix_included(clinical_test_env):
    """15. Medication schedule matrix is included in prescription detail response."""
    env = clinical_test_env
    items = [
        {
            "medicine_name": "Amoxicillin 500mg",
            "frequency": "Three times daily (1-1-1)",
            "dosage_form": "Capsule",
            "quantity": 15
        }
    ]
    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Bronchitis",
        items=items,
        actor_id="doctor"
    )
    detail = sp_repository.get_patient_prescription_detail(rx["id"])
    assert "medication_schedule" in detail
    assert isinstance(detail["medication_schedule"], list)
    assert len(detail["medication_schedule"]) == 1
    sched = detail["medication_schedule"][0]
    assert sched["medicine_name"] == "Amoxicillin 500mg"
    assert sched["morning"] is True
    assert sched["night"] is True


def test_16_vitals_snapshot_is_parsed_as_dict(clinical_test_env):
    """16. Vitals snapshot is parsed as object/dict, not raw JSON string."""
    env = clinical_test_env
    vitals_data = {"bp": "120/80 mmHg", "pulse": "72 bpm", "spo2": "99%"}
    rx = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Hypertension Review",
        actor_id="doctor"
    )
    with get_db_cursor() as cur:
        cur.execute("""
            UPDATE oh_id.prescriptions
            SET vitals_snapshot = %s::jsonb
            WHERE id = %s;
        """, (json.dumps(vitals_data), rx["id"]))

    detail = sp_repository.get_patient_prescription_detail(rx["id"])
    assert isinstance(detail["vitals_snapshot"], dict)
    assert detail["vitals_snapshot"]["bp"] == "120/80 mmHg"
    assert detail["vitals_snapshot"]["pulse"] == "72 bpm"


def test_17_allergies_snapshot_is_parsed_as_array_or_none(clinical_test_env):
    """17. Allergies snapshot is parsed as list when recorded, and None when not recorded."""
    env = clinical_test_env
    allergies_list = ["Penicillin", "Sulfa Drugs"]
    rx1 = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Allergic Rhinitis",
        actor_id="doctor"
    )
    with get_db_cursor() as cur:
        cur.execute("""
            UPDATE oh_id.prescriptions
            SET allergies_snapshot = %s::jsonb
            WHERE id = %s;
        """, (json.dumps(allergies_list), rx1["id"]))

    detail1 = sp_repository.get_patient_prescription_detail(rx1["id"])
    assert isinstance(detail1["allergies_snapshot"], list)
    assert detail1["allergies_snapshot"] == allergies_list

    # Unrecorded allergies prescription
    rx2 = sp_repository.create_standalone_prescription(
        patient_id=env["patient1_id"],
        doctor_id=env["doctor_id"],
        hospital_id=env["hospital_id"],
        diagnosis="Routine Check",
        actor_id="doctor"
    )
    detail2 = sp_repository.get_patient_prescription_detail(rx2["id"])
    assert detail2["allergies_snapshot"] is None
