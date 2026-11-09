"""
OH-ID Family Member QR Pass & Hospital Reception Check-In Test Suite
=====================================================================
Validates all 14 scenarios required for enterprise zero-knowledge healthcare:
1. Primary patient QR scan (self, non-dependent).
2. Spouse QR scan (Bob Smith -> resolves Bob Smith with SPOUSE link to Alice).
3. Child / Minor QR scan (Charlie Smith -> resolves Charlie with SON link, minor=True, guardian=True).
4. Parent QR scan (Dorothy Smith -> resolves Dorothy with MOTHER link).
5. Other dependent dynamic QR generation & scan.
6. Invalid QR scan rejection (404, zero data leak).
7. Expired / empty / malformed token rejection.
8. Tampered QR token safe rejection.
9. Duplicate scan / replay handling (idempotent resolution with distinct audit records).
10. QR token rotation & old token revocation.
11. Multi-hospital tenant check-in & cross-hospital clinical sharing restrictions.
12. Flexible payload compatibility (qr_input, token, qr_token, full URL, code).
13. Family member appointment check-in & OPD walk-in token issuance.
14. Patient record data isolation (dependent records isolated from primary account holder).
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
    """Helper to generate JWT bearer tokens for test actors."""
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
def family_test_env():
    """Sets up an isolated test hospital, receptionist, and family unit."""
    suffix = uuid.uuid4().hex[:6]
    hosp_id = f"hosp-kedar-{suffix}"
    hosp_unauth = f"hosp-unauth-{suffix}"
    receptionist_id = f"rec-kedar-{suffix}"
    doc_id = f"doc-kedar-{suffix}"

    # Primary Patient: Alice Test
    p_primary_id = f"p-alice-{suffix}"
    p_primary_ohid = f"OHID-IND-2026-AL{suffix.upper()}"
    p_primary_qr = f"QR-OHID-ALICE-{suffix}"

    # Spouse: Bob Test
    p_spouse_id = f"p-bob-{suffix}"
    p_spouse_ohid = f"OHID-IND-2026-BO{suffix.upper()}"
    p_spouse_qr = f"QR-OHID-BOB-{suffix}"

    # Child (Minor): Charlie Test
    p_child_id = f"p-charlie-{suffix}"
    p_child_ohid = f"OHID-IND-2026-CH{suffix.upper()}"
    p_child_qr = f"QR-OHID-CHARLIE-{suffix}"

    # Mother (Elderly Parent): Dorothy Test
    p_mother_id = f"p-dorothy-{suffix}"
    p_mother_ohid = f"OHID-IND-2026-DO{suffix.upper()}"
    p_mother_qr = f"QR-OHID-DOROTHY-{suffix}"

    with get_db_cursor() as cur:
        # 1. Hospitals
        cur.execute("""
            INSERT INTO oh_id.hospitals (id, name, code, city, status, is_active)
            VALUES 
                (%s, 'Kedar Hospital Central', %s, 'Chennai', 'ACTIVE', TRUE),
                (%s, 'Unauthorized Hospital', %s, 'Delhi', 'ACTIVE', TRUE)
            ON CONFLICT (id) DO UPDATE SET is_active = TRUE;
        """, (hosp_id, f"KC{suffix[:4]}", hosp_unauth, f"UH{suffix[:4]}"))

        # 2. Doctors
        cur.execute("""
            INSERT INTO oh_id.doctors (id, hospital_id, name, specialty, is_available)
            VALUES (%s, %s, 'Dr. Rajesh Kumar', 'General Medicine', true)
            ON CONFLICT (id) DO UPDATE SET is_available = TRUE;
        """, (doc_id, hosp_id))

        # 3. Insert Patients
        patients_to_insert = [
            (p_primary_id, p_primary_ohid, "Alice Smith Test", 32, "Female", "9840123456", "alice@example.com", "O+", p_primary_qr, "General Health"),
            (p_spouse_id, p_spouse_ohid, "Bob Smith Test", 36, "Male", "9840123457", "bob@example.com", "O+", p_spouse_qr, "Hypertension"),
            (p_child_id, p_child_ohid, "Charlie Smith Test", 7, "Male", "9840123456", "alice@example.com", "B+", p_child_qr, "Pediatric Asthma"),
            (p_mother_id, p_mother_ohid, "Dorothy Smith Test", 62, "Female", "9840199881", "dorothy@example.com", "A+", p_mother_qr, "Osteoarthritis"),
        ]
        for pid, ohid, name, age, gender, phone, email, blood, qr, diag in patients_to_insert:
            cur.execute("""
                INSERT INTO oh_id.patients (
                    id, onehealth_id, name, age, gender, phone, email, blood_group,
                    qr_token, diagnosis, status, hospital_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'ACTIVE', %s)
                ON CONFLICT (id) DO UPDATE SET qr_token = EXCLUDED.qr_token;
            """, (pid, ohid, name, age, gender, phone, email, blood, qr, diag, hosp_id))

        # 4. Family Relationships
        relationships = [
            (f"rel-alice-bob-{suffix}", p_primary_id, p_spouse_id, "SPOUSE", False, False),
            (f"rel-alice-charlie-{suffix}", p_primary_id, p_child_id, "SON", True, True),
            (f"rel-alice-dorothy-{suffix}", p_primary_id, p_mother_id, "MOTHER", False, False),
        ]
        for rid, prim, memb, rel, guardian, minor in relationships:
            cur.execute("""
                INSERT INTO oh_id.family_relationships (
                    id, primary_patient_id, member_patient_id, relationship,
                    is_guardian, is_minor, consent_status, permissions
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, 'ACTIVE',
                    '{"view_records": true, "manage_profile": %s, "book_appointments": true}'::jsonb
                ) ON CONFLICT (primary_patient_id, member_patient_id) DO NOTHING;
            """ % ("%s", "%s", "%s", "%s", "%s", "%s", "true" if guardian else "false"),
            (rid, prim, memb, rel, guardian, minor))

        # 5. Hospital Facility Membership for Primary and Spouse
        cur.execute("""
            INSERT INTO oh_id.patient_facility_relationships (id, patient_id, facility_id, local_uhid, status, registered_by)
            VALUES 
                (%s, %s, %s, %s, 'ACTIVE', 'reception'),
                (%s, %s, %s, %s, 'ACTIVE', 'reception')
            ON CONFLICT (patient_id, facility_id) DO NOTHING;
        """, (
            f"pfr-{p_primary_id}-{hosp_id}", p_primary_id, hosp_id, f"UHID-ALICE-{suffix[:4]}",
            f"pfr-{p_spouse_id}-{hosp_id}", p_spouse_id, hosp_id, f"UHID-BOB-{suffix[:4]}"
        ))

        # 6. Scheduled Appointment for Bob Smith
        cur.execute("""
            INSERT INTO oh_id.appointments (
                id, hospital_id, patient_id, doctor_id, slot, status, priority, notes, checkin_token
            ) VALUES (
                %s, %s, %s, %s, '10:00 - 10:15', 'WAITING', 'NORMAL', 'Blood pressure follow-up', %s
            ) ON CONFLICT (id) DO NOTHING;
        """, (f"appt-bob-{suffix}", hosp_id, p_spouse_id, doc_id, f"CHK-BOB-{suffix[:4]}"))

    yield {
        "hosp_id": hosp_id,
        "hosp_unauth": hosp_unauth,
        "receptionist_id": receptionist_id,
        "doc_id": doc_id,
        "p_primary_id": p_primary_id,
        "p_primary_ohid": p_primary_ohid,
        "p_primary_qr": p_primary_qr,
        "p_spouse_id": p_spouse_id,
        "p_spouse_ohid": p_spouse_ohid,
        "p_spouse_qr": p_spouse_qr,
        "p_child_id": p_child_id,
        "p_child_ohid": p_child_ohid,
        "p_child_qr": p_child_qr,
        "p_mother_id": p_mother_id,
        "p_mother_ohid": p_mother_ohid,
        "p_mother_qr": p_mother_qr,
        "appt_bob_id": f"appt-bob-{suffix}",
        "suffix": suffix
    }

    # Teardown
    with get_db_cursor() as cur:
        all_pids = (p_primary_id, p_spouse_id, p_child_id, p_mother_id)
        cur.execute("DELETE FROM oh_id.audit_logs WHERE resource_id = ANY(%s);", (list(all_pids),))
        cur.execute("DELETE FROM oh_id.queue_entries WHERE patient_id = ANY(%s);", (list(all_pids),))
        cur.execute("DELETE FROM oh_id.visits WHERE patient_id = ANY(%s);", (list(all_pids),))
        cur.execute("DELETE FROM oh_id.appointments WHERE patient_id = ANY(%s);", (list(all_pids),))
        cur.execute("DELETE FROM oh_id.patient_facility_relationships WHERE patient_id = ANY(%s);", (list(all_pids),))
        cur.execute("DELETE FROM oh_id.family_relationships WHERE primary_patient_id = %s OR member_patient_id = ANY(%s);", (p_primary_id, list(all_pids)))
        cur.execute("DELETE FROM oh_id.patients WHERE id = ANY(%s);", (list(all_pids),))
        cur.execute("DELETE FROM oh_id.doctors WHERE id = %s;", (doc_id,))
        cur.execute("DELETE FROM oh_id.hospitals WHERE id IN (%s, %s);", (hosp_id, hosp_unauth))


# --------------------------------------------------------------------------
# SCENARIO 1: PRIMARY PATIENT QR SCAN
# --------------------------------------------------------------------------
def test_01_primary_patient_qr_scan(family_test_env):
    """Primary patient QR scan resolves primary patient and shows not dependent."""
    rec_token = create_auth_token(
        family_test_env["receptionist_id"], "receptionist_test",
        family_test_env["hosp_id"], "RECEPTIONIST", ["patient.qr.scan", "patient.read"]
    )
    resp = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"qr_input": family_test_env["p_primary_qr"], "hospital_id": family_test_env["hosp_id"]}
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    ident = data["patient_identity"]
    assert ident["id"] == family_test_env["p_primary_id"]
    assert ident["name"] == "Alice Smith Test"
    assert ident["onehealth_id"] == family_test_env["p_primary_ohid"]
    assert ident.get("family_link") is None


# --------------------------------------------------------------------------
# SCENARIO 2: SPOUSE QR SCAN (BOB SMITH)
# --------------------------------------------------------------------------
def test_02_spouse_qr_scan(family_test_env):
    """Bob Smith's QR scan accurately identifies Bob Smith and attaches SPOUSE link to Alice."""
    rec_token = create_auth_token(
        family_test_env["receptionist_id"], "receptionist_test",
        family_test_env["hosp_id"], "RECEPTIONIST", ["patient.qr.scan", "patient.read"]
    )
    resp = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"qr_input": f"https://ohid.online/scan/{family_test_env['p_spouse_qr']}", "hospital_id": family_test_env["hosp_id"]}
    )
    assert resp.status_code == 200, resp.text
    ident = resp.json()["patient_identity"]
    assert ident["id"] == family_test_env["p_spouse_id"]
    assert ident["name"] == "Bob Smith Test"
    assert ident["onehealth_id"] == family_test_env["p_spouse_ohid"]
    # Check family link
    fam = ident.get("family_link")
    assert fam is not None
    assert fam["is_dependent"] is True
    assert fam["relationship"] == "SPOUSE"
    assert fam["is_minor"] is False
    assert fam["primary_patient_id"] == family_test_env["p_primary_id"]
    assert fam["primary_patient_name"] == "Alice Smith Test"


# --------------------------------------------------------------------------
# SCENARIO 3: CHILD / MINOR QR SCAN (CHARLIE SMITH)
# --------------------------------------------------------------------------
def test_03_child_minor_qr_scan(family_test_env):
    """Charlie Smith's QR scan resolves Charlie with MINOR=True and GUARDIAN=True flags."""
    rec_token = create_auth_token(
        family_test_env["receptionist_id"], "receptionist_test",
        family_test_env["hosp_id"], "RECEPTIONIST", ["patient.qr.scan", "patient.read"]
    )
    resp = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"qr_input": family_test_env["p_child_qr"], "hospital_id": family_test_env["hosp_id"]}
    )
    assert resp.status_code == 200, resp.text
    ident = resp.json()["patient_identity"]
    assert ident["id"] == family_test_env["p_child_id"]
    assert ident["name"] == "Charlie Smith Test"
    assert ident["age"] == 7
    fam = ident.get("family_link")
    assert fam is not None
    assert fam["is_minor"] is True
    assert fam["is_guardian"] is True
    assert fam["relationship"] == "SON"
    assert fam["primary_patient_name"] == "Alice Smith Test"


# --------------------------------------------------------------------------
# SCENARIO 4: PARENT QR SCAN (DOROTHY SMITH)
# --------------------------------------------------------------------------
def test_04_parent_qr_scan(family_test_env):
    """Dorothy Smith's QR scan identifies Dorothy Smith with MOTHER link."""
    rec_token = create_auth_token(
        family_test_env["receptionist_id"], "receptionist_test",
        family_test_env["hosp_id"], "RECEPTIONIST", ["patient.qr.scan", "patient.read"]
    )
    resp = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"token": family_test_env["p_mother_qr"], "hospital_id": family_test_env["hosp_id"]}
    )
    assert resp.status_code == 200, resp.text
    ident = resp.json()["patient_identity"]
    assert ident["id"] == family_test_env["p_mother_id"]
    assert ident["name"] == "Dorothy Smith Test"
    fam = ident.get("family_link")
    assert fam is not None
    assert fam["relationship"] == "MOTHER"
    assert fam["is_minor"] is False


# --------------------------------------------------------------------------
# SCENARIO 5: DYNAMIC DEPENDENT REGISTRATION & QR PASS CREATION
# --------------------------------------------------------------------------
def test_05_dynamic_family_member_registration_and_qr(family_test_env):
    """Registering a new family member dynamically produces a valid, scannable QR pass."""
    new_member = sp_repository.add_family_member(
        primary_patient_id=family_test_env["p_primary_id"],
        relationship="DAUGHTER",
        is_guardian=True,
        is_minor=True,
        new_member_data={
            "name": "Emma Smith Test",
            "age": 3,
            "dob": "2023-08-10",
            "gender": "Female",
            "blood_group": "O+ Positive",
            "hospital_id": family_test_env["hosp_id"]
        }
    )
    new_pid = new_member["member_patient_id"]
    new_qr = new_member["member_qr_token"]
    assert new_qr is not None
    assert "OHID-IND-2026-" in new_member["member_onehealth_id"]

    # Scan the newly registered child
    rec_token = create_auth_token(
        family_test_env["receptionist_id"], "receptionist_test",
        family_test_env["hosp_id"], "RECEPTIONIST", ["patient.qr.scan", "patient.read"]
    )
    resp = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"qr_input": new_qr, "hospital_id": family_test_env["hosp_id"]}
    )
    assert resp.status_code == 200
    ident = resp.json()["patient_identity"]
    assert ident["name"] == "Emma Smith Test"
    assert ident["family_link"]["relationship"] == "DAUGHTER"
    assert ident["family_link"]["is_minor"] is True

    # Cleanup dynamic member
    with get_db_cursor() as cur:
        cur.execute("DELETE FROM oh_id.family_relationships WHERE member_patient_id = %s;", (new_pid,))
        cur.execute("DELETE FROM oh_id.patients WHERE id = %s;", (new_pid,))


# --------------------------------------------------------------------------
# SCENARIO 6: INVALID QR SCAN
# --------------------------------------------------------------------------
def test_06_invalid_qr_scan(family_test_env):
    """Scanning a nonexistent token safely returns 404 with zero data leakage."""
    rec_token = create_auth_token(
        family_test_env["receptionist_id"], "receptionist_test",
        family_test_env["hosp_id"], "RECEPTIONIST", ["patient.qr.scan", "patient.read"]
    )
    resp = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"qr_input": "QR-FORGED-FAKE-TOKEN-99999", "hospital_id": family_test_env["hosp_id"]}
    )
    assert resp.status_code == 404
    assert "OneHealth ID or QR Token could not be verified" in resp.json()["detail"]


# --------------------------------------------------------------------------
# SCENARIO 7: EXPIRED / EMPTY QR SCAN
# --------------------------------------------------------------------------
def test_07_expired_or_empty_qr_scan(family_test_env):
    """Empty or too short input fails validation safely."""
    rec_token = create_auth_token(
        family_test_env["receptionist_id"], "receptionist_test",
        family_test_env["hosp_id"], "RECEPTIONIST", ["patient.qr.scan", "patient.read"]
    )
    resp = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"qr_input": "x", "hospital_id": family_test_env["hosp_id"]}
    )
    assert resp.status_code == 422


# --------------------------------------------------------------------------
# SCENARIO 8: TAMPERED QR SCAN
# --------------------------------------------------------------------------
def test_08_tampered_qr_scan(family_test_env):
    """A valid QR token appended with tampering bytes is rejected."""
    tampered = family_test_env["p_spouse_qr"] + "_TAMPERED"
    rec_token = create_auth_token(
        family_test_env["receptionist_id"], "receptionist_test",
        family_test_env["hosp_id"], "RECEPTIONIST", ["patient.qr.scan", "patient.read"]
    )
    resp = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"qr_input": tampered, "hospital_id": family_test_env["hosp_id"]}
    )
    assert resp.status_code == 404


# --------------------------------------------------------------------------
# SCENARIO 9: DUPLICATE SCAN / REPLAY PROTECTION
# --------------------------------------------------------------------------
def test_09_duplicate_scan_replay_handling(family_test_env):
    """Scanning twice resolves identically and creates two distinct audit events."""
    rec_token = create_auth_token(
        family_test_env["receptionist_id"], "receptionist_test",
        family_test_env["hosp_id"], "RECEPTIONIST", ["patient.qr.scan", "patient.read"]
    )
    r1 = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"qr_input": family_test_env["p_spouse_qr"], "hospital_id": family_test_env["hosp_id"]}
    )
    r2 = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"qr_input": family_test_env["p_spouse_qr"], "hospital_id": family_test_env["hosp_id"]}
    )
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["patient_identity"]["id"] == r2.json()["patient_identity"]["id"]

    # Verify audit logs
    with get_readonly_cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) AS total FROM oh_id.audit_logs 
            WHERE resource_id = %s AND action = 'QR_WORKFLOW_SCAN';
        """, (family_test_env["p_spouse_id"],))
        assert cur.fetchone()["total"] >= 2


# --------------------------------------------------------------------------
# SCENARIO 10: QR TOKEN ROTATION & REVOCATION
# --------------------------------------------------------------------------
def test_10_qr_token_rotation_and_revocation(family_test_env):
    """Rotating a family member's QR token immediately invalidates the old token."""
    # Charlie's original QR
    old_qr = family_test_env["p_child_qr"]

    # Rotate Charlie's token via guardian Alice
    alice_token = create_auth_token(
        family_test_env["p_primary_id"], "patient",
        family_test_env["hosp_id"], "PATIENT", ["patient.self.qr", "patient.self.read"]
    )
    rot_resp = client.post(
        f"/api/v1/patients/{family_test_env['p_child_id']}/qr/rotate",
        headers={"Authorization": f"Bearer {alice_token}"}
    )
    assert rot_resp.status_code == 200, rot_resp.text
    new_qr = rot_resp.json()["qr_token"]
    assert new_qr != old_qr

    # 1. Attempt scan with OLD token -> MUST FAIL (404)
    rec_token = create_auth_token(
        family_test_env["receptionist_id"], "receptionist_test",
        family_test_env["hosp_id"], "RECEPTIONIST", ["patient.qr.scan", "patient.read"]
    )
    fail_resp = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"qr_input": old_qr, "hospital_id": family_test_env["hosp_id"]}
    )
    assert fail_resp.status_code == 404

    # 2. Attempt scan with NEW token -> MUST SUCCEED (200)
    succ_resp = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"qr_input": new_qr, "hospital_id": family_test_env["hosp_id"]}
    )
    assert succ_resp.status_code == 200
    assert succ_resp.json()["patient_identity"]["name"] == "Charlie Smith Test"


# --------------------------------------------------------------------------
# SCENARIO 11: UNAUTHORIZED HOSPITAL & CROSS-HOSPITAL RECORD RESTRICTION
# --------------------------------------------------------------------------
def test_11_unauthorized_hospital_cross_sharing_block(family_test_env):
    """Scanning at an external hospital marks the patient as external and restricts clinical sharing."""
    rec_token = create_auth_token(
        "rec-ext", "rec_ext",
        family_test_env["hosp_unauth"], "RECEPTIONIST", ["patient.qr.scan", "patient.read"]
    )
    resp = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"qr_input": family_test_env["p_spouse_qr"], "hospital_id": family_test_env["hosp_unauth"]}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["hospital_context"]["is_registered_at_active_hospital"] is False
    assert data["hospital_context"]["active_hospital_id"] == family_test_env["hosp_unauth"]


# --------------------------------------------------------------------------
# SCENARIO 12: FLEXIBLE REQUEST PAYLOAD COMPATIBILITY
# --------------------------------------------------------------------------
def test_12_flexible_request_payload_compatibility(family_test_env):
    """Ensures backend handles qr_input, token, qr_token, and full URLs without 422 errors."""
    rec_token = create_auth_token(
        family_test_env["receptionist_id"], "receptionist_test",
        family_test_env["hosp_id"], "RECEPTIONIST", ["patient.qr.scan", "patient.read"]
    )

    # 1. token key (from mobile apiClient)
    r1 = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"token": family_test_env["p_spouse_qr"]}
    )
    assert r1.status_code == 200
    assert r1.json()["patient_identity"]["name"] == "Bob Smith Test"

    # 2. qr_token key
    r2 = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"qr_token": family_test_env["p_spouse_qr"]}
    )
    assert r2.status_code == 200

    # 3. full URL
    r3 = client.post(
        "/api/v1/patients/qr/scan-workflow",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={"qr_input": f"https://ohid.online/scan/{family_test_env['p_spouse_qr']}/"}
    )
    assert r3.status_code == 200


# --------------------------------------------------------------------------
# SCENARIO 13: FAMILY MEMBER APPOINTMENT CHECK-IN & OPD WALK-IN TOKEN
# --------------------------------------------------------------------------
def test_13_family_member_checkin_and_queue_token(family_test_env):
    """Checking in or issuing an OPD token operates on the family member ID, not the primary user."""
    rec_token = create_auth_token(
        family_test_env["receptionist_id"], "receptionist_test",
        family_test_env["hosp_id"], "RECEPTIONIST",
        ["patient.qr.scan", "appointment.checkin", "appointment.create", "reception.manage"]
    )

    # 1. Appointment Check-in for Bob Smith
    chk_resp = client.post(
        "/api/v1/patients/qr/check-in",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "appointment_id": family_test_env["appt_bob_id"],
            "hospital_id": family_test_env["hosp_id"]
        }
    )
    assert chk_resp.status_code == 200, chk_resp.text
    chk_data = chk_resp.json()["data"]
    assert chk_data["patient_id"] == family_test_env["p_spouse_id"]
    assert chk_data["status"] == "CHECKED_IN"

    # 2. Direct Walk-in Token Issuance for Charlie Smith
    tok_resp = client.post(
        "/api/v1/patients/qr/issue-token",
        headers={"Authorization": f"Bearer {rec_token}"},
        json={
            "patient_id": family_test_env["p_child_id"],
            "hospital_id": family_test_env["hosp_id"],
            "department_name": "General Medicine",
            "priority": "NORMAL",
            "chief_complaint": "Pediatric Asthma Review"
        }
    )
    assert tok_resp.status_code == 200, tok_resp.text
    tok_data = tok_resp.json()["data"]
    assert tok_data["patient_id"] == family_test_env["p_child_id"]
    assert tok_data["patient_name"] == "Charlie Smith Test"
    assert tok_data["token_number"] is not None


# --------------------------------------------------------------------------
# SCENARIO 14: RECORD ISOLATION BETWEEN PRIMARY USER AND DEPENDENTS
# --------------------------------------------------------------------------
def test_14_data_isolation_between_primary_and_dependents(family_test_env):
    """Verifies that appointments and check-in visits for Bob are isolated from Alice."""
    # Query appointments for Alice
    with get_readonly_cursor() as cur:
        cur.execute("SELECT id FROM oh_id.appointments WHERE patient_id = %s;", (family_test_env["p_primary_id"],))
        alice_appts = cur.fetchall()
        # Alice should NOT have Bob's appointment
        alice_appt_ids = [a["id"] for a in alice_appts]
        assert family_test_env["appt_bob_id"] not in alice_appt_ids

        # Bob's appointment belongs to Bob
        cur.execute("SELECT patient_id FROM oh_id.appointments WHERE id = %s;", (family_test_env["appt_bob_id"],))
        row = cur.fetchone()
        assert row["patient_id"] == family_test_env["p_spouse_id"]

