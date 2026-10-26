"""
OH-ID Universal Enterprise QR-Based Patient Identity & Hospital Access Test Suite
=================================================================================
Validates:
1. QR token extraction & URL normalization (raw token, full URL, relative path).
2. Anonymous/public kiosk scan (masked PII, no clinical data).
3. Receptionist scan & strict clinical diagnosis redaction.
4. Cross-hospital patient registration without duplicating patient identities.
5. 1-Click appointment check-in via QR workflow.
6. Direct OPD walk-in queue token issuance.
7. Doctor same-hospital authorized clinical access.
8. Doctor cross-hospital clinical sharing block (DPDP Act & HIPAA compliance).
9. Tampered/forged QR token safe 404 rejection without leakage.
10. Immutable security audit logging for all QR operations.
"""

import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from jose import jwt

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.database.session import get_db_cursor, get_readonly_cursor
from backend.app.repositories.sp_views_repository import sp_repository

client = TestClient(app)

def create_auth_token(user_id: str, username: str, hospital_id: str, role: str, permissions: list) -> str:
    """Helper to generate JWT bearer tokens for synthetic test actors."""
    payload = {
        "sub": username,
        "uid": user_id,
        "user_ref_id": user_id,
        "id": user_id,
        "hospital_id": hospital_id,
        "hospital_ref_id": hospital_id,
        "role": role,
        "roles": [role],
        "permissions": permissions,
        "exp": datetime.now(timezone.utc) + timedelta(hours=2)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

@pytest.fixture(scope="module")
def qr_test_env():
    """Sets up isolated synthetic hospitals, doctors, receptionists, and patients."""
    suffix = uuid.uuid4().hex[:6]
    hosp_primary = f"hosp-kedar-{suffix}"
    hosp_secondary = f"hosp-apollo-{suffix}"
    
    pat_id = f"P-QR-{suffix}"
    ohid = f"OHID-TEST-2026-{suffix.upper()}"
    qr_token = f"qr-secure-{suffix}-{secrets.token_hex(8)}"
    doctor_id = f"doc-kedar-{suffix}"
    doc_sec_id = f"doc-apollo-{suffix}"
    receptionist_id = f"rec-kedar-{suffix}"

    with get_db_cursor() as cur:
        # 1. Primary Hospital
        cur.execute("""
            INSERT INTO oh_id.hospitals (id, name, code, city, status, is_active)
            VALUES (%s, 'Kedar Hospital Test', %s, 'Mumbai', 'ACTIVE', TRUE)
            ON CONFLICT (id) DO UPDATE SET is_active = TRUE;
        """, (hosp_primary, f"KD{suffix.upper()[:6]}"))

        # 2. Secondary Hospital
        cur.execute("""
            INSERT INTO oh_id.hospitals (id, name, code, city, status, is_active)
            VALUES (%s, 'Apollo Central Test', %s, 'Chennai', 'ACTIVE', TRUE)
            ON CONFLICT (id) DO UPDATE SET is_active = TRUE;
        """, (hosp_secondary, f"AP{suffix.upper()[:6]}"))

        # 3. Patient
        cur.execute("""
            INSERT INTO oh_id.patients (
                id, hospital_id, onehealth_id, qr_token, name, age, gender,
                phone, email, blood_group, address, emergency_contact, diagnosis, status
            ) VALUES (
                %s, %s, %s, %s, 'Ramesh Kumar Test', 42, 'Male',
                '9876543210', 'ramesh.test@example.com', 'B+',
                '123 Gandhi Road, Mumbai', '9876500000', 'Hypertension & Type 2 Diabetes', 'ACTIVE'
            )
            ON CONFLICT (id) DO UPDATE SET qr_token = EXCLUDED.qr_token;
        """, (pat_id, hosp_primary, ohid, qr_token))

        # 4. Bind primary facility relationship
        cur.execute("""
            INSERT INTO oh_id.patient_facility_relationships (
                id, patient_id, facility_id, local_uhid, status, registered_by
            ) VALUES (
                %s, %s, %s, %s, 'ACTIVE', 'admin'
            )
            ON CONFLICT (patient_id, facility_id) DO NOTHING;
        """, (f"pfr-{pat_id}-{hosp_primary}", pat_id, hosp_primary, f"UHID-KEDAR-{suffix.upper()}"))

        # 5. Doctor at primary hospital
        cur.execute("""
            INSERT INTO oh_id.doctors (id, hospital_id, name, specialty, is_available)
            VALUES (%s, %s, 'Dr. Sarah Kedar Test', 'General Medicine', true)
            ON CONFLICT (id) DO UPDATE SET is_available = TRUE;
        """, (doctor_id, hosp_primary))

        # 6. Doctor at secondary hospital
        cur.execute("""
            INSERT INTO oh_id.doctors (id, hospital_id, name, specialty, is_available)
            VALUES (%s, %s, 'Dr. Apollo External Test', 'Cardiology', true)
            ON CONFLICT (id) DO UPDATE SET is_available = TRUE;
        """, (doc_sec_id, hosp_secondary))

    yield {
        "hosp_primary": hosp_primary,
        "hosp_secondary": hosp_secondary,
        "patient_id": pat_id,
        "onehealth_id": ohid,
        "qr_token": qr_token,
        "doctor_id": doctor_id,
        "doc_sec_id": doc_sec_id,
        "receptionist_id": receptionist_id,
        "suffix": suffix
    }

    # Clean up test records
    with get_db_cursor() as cur:
        cur.execute("DELETE FROM oh_id.audit_logs WHERE resource_id = %s;", (pat_id,))
        cur.execute("DELETE FROM oh_id.patient_flow_events WHERE patient_id = %s;", (pat_id,))
        cur.execute("DELETE FROM oh_id.queue_entries WHERE patient_id = %s;", (pat_id,))
        cur.execute("DELETE FROM oh_id.visits WHERE patient_id = %s;", (pat_id,))
        cur.execute("DELETE FROM oh_id.appointments WHERE patient_id = %s;", (pat_id,))
        cur.execute("DELETE FROM oh_id.patient_facility_relationships WHERE patient_id = %s;", (pat_id,))
        cur.execute("DELETE FROM oh_id.patients WHERE id = %s;", (pat_id,))
        cur.execute("DELETE FROM oh_id.doctors WHERE id IN (%s, %s);", (doctor_id, doc_sec_id))
        cur.execute("DELETE FROM oh_id.hospitals WHERE id IN (%s, %s);", (hosp_primary, hosp_secondary))


def test_01_qr_token_extraction_and_url_normalization():
    """Verify that opaque token is extracted from raw strings, URLs, and paths."""
    token = "qr-89a74c2e"
    assert sp_repository.extract_qr_token(token) == "qr-89a74c2e"
    assert sp_repository.extract_qr_token(f"https://ohid.online/scan/{token}") == "qr-89a74c2e"
    assert sp_repository.extract_qr_token(f"http://localhost:3000/scan/{token}/") == "qr-89a74c2e"
    assert sp_repository.extract_qr_token(f"/scan/{token}") == "qr-89a74c2e"


def test_02_anonymous_public_kiosk_scan(qr_test_env):
    """Anonymous kiosk scan resolves identity with masked PII and no clinical exposure."""
    token = qr_test_env["qr_token"]
    url_input = f"https://ohid.online/scan/{token}"

    resp = client.post("/api/v1/patients/qr/scan-workflow", json={
        "qr_input": url_input,
        "hospital_id": qr_test_env["hosp_primary"]
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["role"] == "ANONYMOUS"
    assert data["patient_identity"]["onehealth_id"] == qr_test_env["onehealth_id"]
    assert data["patient_identity"]["phone_masked"] == "***-***-3210"
    assert data["patient_identity"]["address_masked"] == "[Protected demographic]"
    assert "diagnosis" not in data["patient_identity"]
    assert data["workflow_data"]["cross_hospital_sharing_blocked"] is True
    assert "Sign in as authorized staff" in data["workflow_data"]["sharing_block_reason"]


def test_03_receptionist_scan_clinical_redaction(qr_test_env):
    """Receptionist receives demographic & queue info, but clinical diagnosis is strictly redacted."""
    rec_token = create_auth_token(
        user_id=qr_test_env["receptionist_id"],
        username="receptionist_kedar",
        hospital_id=qr_test_env["hosp_primary"],
        role="RECEPTIONIST",
        permissions=["patient.qr.scan", "patient.read", "appointment.read", "reception.manage"]
    )

    resp = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "qr_input": qr_test_env["qr_token"],
            "hospital_id": qr_test_env["hosp_primary"]
        }
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["role"] == "RECEPTIONIST"
    assert data["patient_identity"]["phone"] == "9876543210"
    assert data["patient_identity"]["name"] == "Ramesh Kumar Test"
    assert "diagnosis" not in data["patient_identity"]
    assert "clinical_summary" not in data["workflow_data"]

    # Also verify legacy verify-qr route redacts diagnosis for receptionist
    v_resp = client.get(
        f"/api/v1/patients/verify-qr/{qr_test_env['qr_token']}",
        headers={"Authorization": f"Bearer {rec_token}"}
    )
    assert v_resp.status_code == 200
    v_data = v_resp.json()
    assert v_data["diagnosis"] == "[Protected Clinical Data - Clinician Access Only]"


def test_04_cross_hospital_registration_idempotent_no_duplicate_patient(qr_test_env):
    """Registering patient at secondary hospital creates facility relationship without duplicating patient master."""
    sec_rec_token = create_auth_token(
        user_id=f"rec-sec-{qr_test_env['suffix']}",
        username="receptionist_apollo",
        hospital_id=qr_test_env["hosp_secondary"],
        role="RECEPTIONIST",
        permissions=["patient.register", "patient.create", "patient.update", "reception.manage", "hospital.update"]
    )

    # 1. First registration call
    reg_resp = client.post(
        "/api/v1/patients/qr/register-hospital",
        headers={"Authorization": f"Bearer {sec_rec_token}"},
        json={
            "patient_id": qr_test_env["patient_id"],
            "hospital_id": qr_test_env["hosp_secondary"]
        }
    )
    assert reg_resp.status_code == 200, reg_resp.text
    reg_data = reg_resp.json()["data"]
    assert reg_data["hospital_id"] == qr_test_env["hosp_secondary"]
    assert reg_data["status"] == "ACTIVE"
    assert reg_data["local_uhid"].startswith("UHID-AP")

    # 2. Second registration call (idempotent)
    reg_resp_2 = client.post(
        "/api/v1/patients/qr/register-hospital",
        headers={"Authorization": f"Bearer {sec_rec_token}"},
        json={
            "patient_id": qr_test_env["patient_id"],
            "hospital_id": qr_test_env["hosp_secondary"]
        }
    )
    assert reg_resp_2.status_code == 200
    assert reg_resp_2.json()["data"]["local_uhid"] == reg_data["local_uhid"]

    # 3. Verify exactly 1 patient row exists in oh_id.patients
    with get_readonly_cursor() as cur:
        cur.execute("SELECT COUNT(*) AS cnt FROM oh_id.patients WHERE id = %s;", (qr_test_env["patient_id"],))
        assert cur.fetchone()["cnt"] == 1


def test_05_appointment_check_in_via_qr(qr_test_env):
    """Check in an appointment for a patient using QR workflow."""
    appt_id = f"appt-{qr_test_env['suffix']}"
    with get_db_cursor() as cur:
        cur.execute("""
            INSERT INTO oh_id.appointments (
                id, hospital_id, patient_id, doctor_id, appointment_date, appointment_time, slot, status
            ) VALUES (
                %s, %s, %s, %s, CURRENT_DATE, '10:30:00', '10:30 AM', 'scheduled'
            );
        """, (appt_id, qr_test_env["hosp_primary"], qr_test_env["patient_id"], qr_test_env["doctor_id"]))

    rec_token = create_auth_token(
        user_id=qr_test_env["receptionist_id"],
        username="receptionist_kedar",
        hospital_id=qr_test_env["hosp_primary"],
        role="RECEPTIONIST",
        permissions=["appointment.checkin", "appointment.manage", "appointment.update", "patient.qr.scan"]
    )

    checkin_resp = client.post(
        "/api/v1/patients/qr/check-in",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"appointment_id": appt_id, "hospital_id": qr_test_env["hosp_primary"]}
    )
    assert checkin_resp.status_code == 200, checkin_resp.text
    res_data = checkin_resp.json()["data"]
    assert res_data["status"].lower() == "checked_in"
    assert "token_number" in res_data


def test_06_issue_walk_in_queue_token(qr_test_env):
    """Direct walk-in patient issued OPD token via QR scan workflow."""
    rec_token = create_auth_token(
        user_id=qr_test_env["receptionist_id"],
        username="receptionist_kedar",
        hospital_id=qr_test_env["hosp_primary"],
        role="RECEPTIONIST",
        permissions=["appointment.create", "appointment.manage", "reception.manage", "patient.qr.scan"]
    )

    token_resp = client.post(
        "/api/v1/patients/qr/issue-token",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "patient_id": qr_test_env["patient_id"],
            "hospital_id": qr_test_env["hosp_primary"],
            "department_name": "General Medicine",
            "priority": "NORMAL",
            "chief_complaint": "Acute headache and fever"
        }
    )
    assert token_resp.status_code == 200, token_resp.text
    res_data = token_resp.json()["data"]
    assert res_data["token_number"] > 0
    assert res_data["status"] in ("CHECKED_IN", "WAITING")


def test_07_doctor_same_hospital_clinical_access(qr_test_env):
    """Doctor from same hospital accesses authorized clinical records upon scanning QR."""
    doc_token = create_auth_token(
        user_id=qr_test_env["doctor_id"],
        username="dr_sarah_kedar",
        hospital_id=qr_test_env["hosp_primary"],
        role="DOCTOR",
        permissions=["patient.qr.scan", "patient.read", "clinical.read", "clinical.consultation"]
    )

    resp = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {doc_token}"},
        json={"qr_input": qr_test_env["qr_token"], "hospital_id": qr_test_env["hosp_primary"]}
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["role"] == "DOCTOR"
    assert data["workflow_data"]["cross_hospital_sharing_blocked"] is False
    assert "clinical_summary" in data["workflow_data"]
    assert data["workflow_data"]["clinical_summary"]["diagnosis"] == "Hypertension & Type 2 Diabetes"
    assert "START_CONSULTATION" in data["permitted_actions"]


def test_08_doctor_cross_hospital_sharing_blocked(qr_test_env):
    """Doctor from secondary hospital is blocked from accessing clinical history without consent authorization."""
    sec_doc_token = create_auth_token(
        user_id=qr_test_env["doc_sec_id"],
        username="dr_apollo_external",
        hospital_id=qr_test_env["hosp_secondary"],
        role="DOCTOR",
        permissions=["patient.qr.scan", "patient.read", "clinical.read"]
    )

    resp = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {sec_doc_token}"},
        json={"qr_input": qr_test_env["qr_token"], "hospital_id": qr_test_env["hosp_secondary"]}
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["role"] == "DOCTOR"
    assert data["workflow_data"]["cross_hospital_sharing_blocked"] is True
    assert "DPDP Act 2023 & HIPAA compliance" in data["workflow_data"]["sharing_block_reason"]
    # Clinical history from primary hospital must not be exposed
    assert data["workflow_data"]["clinical_summary"]["prescriptions"] == []
    assert data["workflow_data"]["clinical_summary"]["past_consultations"] == []


def test_09_forged_or_invalid_qr_rejected():
    """Tampered or invalid QR tokens are safely rejected with 404."""
    resp = client.post("/api/v1/patients/qr/scan-workflow", json={
        "qr_input": "qr-forged-token-99999",
        "hospital_id": "hosp-kedar"
    })
    assert resp.status_code == 404
    assert resp.json()["detail"] == "OneHealth ID or QR Token could not be verified"


def test_10_audit_trail_logging(qr_test_env):
    """Verify security audit logs are recorded for QR operations."""
    with get_readonly_cursor() as cur:
        cur.execute("""
            SELECT action, actor_id, hospital_id FROM oh_id.audit_logs
            WHERE resource_id = %s
            ORDER BY created_at DESC;
        """, (qr_test_env["patient_id"],))
        rows = cur.fetchall()
        actions = [r["action"] for r in rows]

        assert "QR_WORKFLOW_SCAN" in actions
        assert "CROSS_HOSPITAL_PATIENT_REGISTERED" in actions
        assert "WALK_IN_TOKEN_ISSUED" in actions
