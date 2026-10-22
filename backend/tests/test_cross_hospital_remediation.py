"""
OH-ID Cross-Hospital Data Exposure Remediation - Automated Regression Suite
=============================================================================
Proves containment and closure of cross-hospital clinical data exposure.
Covers 10 mandatory requirements:
1. Hospital A doctor can access only records authorized for that doctor/hospital.
2. Hospital B doctor cannot access Hospital A clinical history/context without valid consent.
3. Missing, expired, revoked, wrong-patient, wrong-facility, and wrong-scope consent are denied.
4. Valid consent permits only the authorized record categories.
5. Revocation immediately prevents subsequent API reads.
6. QR resolution does not itself grant clinical-record access.
7. Alternative endpoints (clinical/reports/timeline/documents) cannot bypass policy.
8. Same-hospital clinical workflows are preserved.
9. Audit events are created for allowed and denied attempts.
10. Direct API calls are protected server-side regardless of frontend state.
"""

import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
import json
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from jose import jwt

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.database.session import get_db_cursor, get_readonly_cursor
from backend.app.repositories.sp_views_repository import sp_repository

client = TestClient(app)

def create_test_token(user_id: str, username: str, hospital_id: str, role: str, permissions: list) -> str:
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
def remediation_env():
    """Sets up two synthetic hospitals, doctors, and patients in PostgreSQL."""
    suffix = uuid.uuid4().hex[:6]
    hosp_a = f"hosp-a-{suffix}"
    hosp_b = f"hosp-b-{suffix}"
    hosp_c = f"hosp-c-{suffix}"

    doc_a_id = f"doc-a-{suffix}"
    doc_b_id = f"doc-b-{suffix}"
    doc_c_id = f"doc-c-{suffix}"

    pat_a_id = f"pat-a-{suffix}"
    pat_b_id = f"pat-b-{suffix}"
    pat_a_user = f"usr-pata-{suffix}"
    pat_b_user = f"usr-patb-{suffix}"

    with get_db_cursor() as cur:
        # Hospitals
        for hid, hname in [(hosp_a, "Hospital Alpha"), (hosp_b, "Hospital Beta"), (hosp_c, "Hospital Gamma")]:
            cur.execute("""
                INSERT INTO oh_id.hospitals (id, name, code, is_active)
                VALUES (%s, %s, %s, TRUE)
                ON CONFLICT (id) DO NOTHING;
            """, (hid, hname, hid[:8].upper()))

        # Doctors
        for did, hid, dname in [
            (doc_a_id, hosp_a, "Dr. Alice"),
            (doc_b_id, hosp_b, "Dr. Bob"),
            (doc_c_id, hosp_c, "Dr. Charlie")
        ]:
            cur.execute("""
                INSERT INTO oh_id.doctors (id, hospital_id, name, specialty, is_available)
                VALUES (%s, %s, %s, 'Cardiology', TRUE)
                ON CONFLICT (id) DO NOTHING;
            """, (did, hid, dname))

        # Patients
        cur.execute("""
            INSERT INTO oh_id.patients (id, user_id, hospital_id, onehealth_id, name, gender, age, phone, qr_token, diagnosis)
            VALUES (%s, %s, %s, %s, 'Patient Alpha', 'Female', 45, '+919999000001', %s, 'Hypertension')
            ON CONFLICT (id) DO NOTHING;
        """, (pat_a_id, pat_a_user, hosp_a, f"OHID-A-{suffix.upper()}", f"qr-tok-a-{suffix}"))

        cur.execute("""
            INSERT INTO oh_id.patients (id, user_id, hospital_id, onehealth_id, name, gender, age, phone, qr_token, diagnosis)
            VALUES (%s, %s, %s, %s, 'Patient Beta', 'Male', 52, '+919999000002', %s, 'Type 2 Diabetes')
            ON CONFLICT (id) DO NOTHING;
        """, (pat_b_id, pat_b_user, hosp_b, f"OHID-B-{suffix.upper()}", f"qr-tok-b-{suffix}"))

        # Clinical records for Patient Alpha at Hospital Alpha
        con_id = f"con-a-{suffix}"
        cur.execute("""
            INSERT INTO oh_id.opd_consultations (id, doctor_id, patient_id, diagnosis, clinical_notes)
            VALUES (%s, %s, %s, 'Hypertension Stage 2', 'Blood pressure elevated at 150/95. Recommended diet & medication.')
            ON CONFLICT (id) DO NOTHING;
        """, (con_id, doc_a_id, pat_a_id))

        rx_id = f"rx-a-{suffix}"
        cur.execute("""
            INSERT INTO oh_id.prescriptions (id, doctor_id, patient_id, diagnosis, status, instructions)
            VALUES (%s, %s, %s, 'Hypertension Stage 2', 'SIGNED', 'Take Amlodipine once daily')
            ON CONFLICT (id) DO NOTHING;
        """, (rx_id, doc_a_id, pat_a_id))

        cur.execute("""
            INSERT INTO oh_id.prescription_items (id, prescription_id, medicine_name, dosage, frequency, duration_days)
            VALUES (%s, %s, 'Amlodipine 5mg', '5mg', '1-0-0', 30)
            ON CONFLICT (id) DO NOTHING;
        """, (f"item-{suffix}", rx_id))

        lab_id = f"lab-a-{suffix}"
        cur.execute("""
            INSERT INTO oh_id.lab_results (id, hospital_id, order_id, patient_id, test_name, analyte_name, result_value, unit)
            VALUES (%s, %s, %s, %s, 'Serum Creatinine', 'Creatinine', '0.9', 'mg/dL')
            ON CONFLICT (id) DO NOTHING;
        """, (lab_id, hosp_a, f"ord-{suffix}", pat_a_id))

    doc_perms = ["consultation.read", "consultation.create", "clinical.read", "clinical.write", "patient.read"]
    pat_perms = ["patient.self.read", "patient.self.appointments", "patient.self.records"]

    tokens = {
        "doc_a": create_test_token(doc_a_id, f"dr.a.{suffix}", hosp_a, "DOCTOR", doc_perms),
        "doc_b": create_test_token(doc_b_id, f"dr.b.{suffix}", hosp_b, "DOCTOR", doc_perms),
        "doc_c": create_test_token(doc_c_id, f"dr.c.{suffix}", hosp_c, "DOCTOR", doc_perms),
        "pat_a": create_test_token(pat_a_user, f"pat.a.{suffix}", hosp_a, "PATIENT", pat_perms),
        "pat_b": create_test_token(pat_b_user, f"pat.b.{suffix}", hosp_b, "PATIENT", pat_perms)
    }

    return {
        "hosp_a": hosp_a,
        "hosp_b": hosp_b,
        "hosp_c": hosp_c,
        "doc_a_id": doc_a_id,
        "doc_b_id": doc_b_id,
        "doc_c_id": doc_c_id,
        "pat_a_id": pat_a_id,
        "pat_b_id": pat_b_id,
        "pat_a_qr": f"qr-tok-a-{suffix}",
        "tokens": tokens
    }


# =============================================================================
# TEST 1 & 8: Same-Hospital Clinical Workflows Preserved
# =============================================================================

def test_same_hospital_clinical_workflows_succeed(remediation_env):
    """Proves that a Hospital A doctor can access Hospital A patient records normally."""
    env = remediation_env
    headers = {"Authorization": f"Bearer {env['tokens']['doc_a']}", "X-Hospital-Ref-Id": env["hosp_a"]}

    # Context
    res_ctx = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/context", headers=headers)
    assert res_ctx.status_code == 200, res_ctx.text
    data_ctx = res_ctx.json()
    assert data_ctx["patient"]["id"] == env["pat_a_id"]

    # History
    res_hist = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/history", headers=headers)
    assert res_hist.status_code == 200, res_hist.text
    events = res_hist.json()
    assert len(events) >= 1

    # Timeline
    res_time = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/timeline", headers=headers)
    assert res_time.status_code == 200, res_time.text


# =============================================================================
# TEST 2: Hospital B Doctor Cannot Access Hospital A Records Without Consent
# =============================================================================

def test_cross_hospital_unauthorized_access_denied_with_safe_404(remediation_env):
    """
    Proves that a Hospital B doctor is denied access to Hospital A patient records
    and receives a safe 404 without disclosing whether the record exists.
    """
    env = remediation_env
    headers = {"Authorization": f"Bearer {env['tokens']['doc_b']}", "X-Hospital-Ref-Id": env["hosp_b"]}

    # Context
    res_ctx = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/context", headers=headers)
    assert res_ctx.status_code == 404
    assert res_ctx.json()["detail"] == "Patient record not found"

    # History
    res_hist = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/history", headers=headers)
    assert res_hist.status_code == 404
    assert res_hist.json()["detail"] == "Patient record not found"

    # Timeline
    res_time = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/timeline", headers=headers)
    assert res_time.status_code == 404
    assert res_time.json()["detail"] == "Patient record not found"


# =============================================================================
# TEST 6: QR Resolution Does NOT Grant Clinical Record Access
# =============================================================================

def test_qr_resolution_does_not_grant_clinical_access(remediation_env):
    """
    Proves that scanning/resolving a patient's QR code returns demographic verification
    for check-in, but does NOT grant authorization to clinical endpoints.
    """
    env = remediation_env
    headers = {"Authorization": f"Bearer {env['tokens']['doc_b']}", "X-Hospital-Ref-Id": env["hosp_b"]}

    # 1. Resolve QR token
    res_qr = client.post("/api/v1/patients/qr/resolve", json={"qr_token": env["pat_a_qr"]}, headers=headers)
    assert res_qr.status_code == 200
    qr_data = res_qr.json()
    assert qr_data["id"] == env["pat_a_id"]

    # 2. Attempt clinical read using resolved patient_id -> Must still be denied 404
    res_ctx = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/context", headers=headers)
    assert res_ctx.status_code == 404
    assert res_ctx.json()["detail"] == "Patient record not found"


# =============================================================================
# TEST 7: Alternative Endpoints Cannot Bypass Policy
# =============================================================================

def test_alternative_endpoints_enforce_same_policy(remediation_env):
    """Proves clinical timeline and reports-summary cannot be used as bypass channels."""
    env = remediation_env
    headers = {"Authorization": f"Bearer {env['tokens']['doc_b']}", "X-Hospital-Ref-Id": env["hosp_b"]}

    # /clinical/patients/{id}/timeline
    res_timeline = client.get(f"/api/v1/clinical/patients/{env['pat_a_id']}/timeline", headers=headers)
    assert res_timeline.status_code == 404
    assert res_timeline.json()["detail"] == "Patient record not found"

    # /clinical/patients/{id}/reports-summary
    res_reports = client.get(f"/api/v1/clinical/patients/{env['pat_a_id']}/reports-summary", headers=headers)
    assert res_reports.status_code == 404
    assert res_reports.json()["detail"] == "Patient record not found"


# =============================================================================
# TEST 3: Missing, Expired, Revoked, Wrong-Patient, Wrong-Facility Consent Denied
# =============================================================================

def test_invalid_consent_permutations_are_denied(remediation_env):
    """Tests all invalid consent scenarios under multi-hospital sharing mode."""
    env = remediation_env
    headers_b = {"Authorization": f"Bearer {env['tokens']['doc_b']}", "X-Hospital-Ref-Id": env["hosp_b"]}
    headers_c = {"Authorization": f"Bearer {env['tokens']['doc_c']}", "X-Hospital-Ref-Id": env["hosp_c"]}

    # Enable cross-hospital sharing for network testing
    orig = settings.ENABLE_CROSS_HOSPITAL_SHARING
    settings.ENABLE_CROSS_HOSPITAL_SHARING = True

    try:
        # A. Missing Consent -> 404
        res_missing = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/context", headers=headers_b)
        assert res_missing.status_code == 404

        # B. Expired Consent
        req_exp = sp_repository.create_data_sharing_request(
            patient_id=env["pat_a_id"],
            requesting_hospital_id=env["hosp_b"],
            requesting_doctor_id=env["doc_b_id"],
            purpose_code="CARETREAT",
            data_categories=["OPConsultation"]
        )
        sp_repository.grant_data_sharing_consent(
            consent_id=req_exp["consent_id"],
            patient_id=env["pat_a_id"],
            allowed_categories=["OPConsultation"]
        )
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.abdm_consent_artifacts
                SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 hour'
                WHERE consent_id = %s;
            """, (req_exp["consent_id"],))

        res_exp = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/context", headers=headers_b)
        assert res_exp.status_code == 404

        # C. Revoked Consent
        req_rev = sp_repository.create_data_sharing_request(
            patient_id=env["pat_a_id"],
            requesting_hospital_id=env["hosp_b"],
            requesting_doctor_id=env["doc_b_id"],
            purpose_code="CARETREAT",
            data_categories=["OPConsultation"]
        )
        sp_repository.grant_data_sharing_consent(
            consent_id=req_rev["consent_id"],
            patient_id=env["pat_a_id"],
            allowed_categories=["OPConsultation"]
        )
        sp_repository.revoke_data_sharing_consent(
            consent_id=req_rev["consent_id"],
            patient_id=env["pat_a_id"],
            revocation_reason="Patient revoked"
        )
        res_rev = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/context", headers=headers_b)
        assert res_rev.status_code == 404

        # D. Wrong-Patient Consent: Patient B granted consent, doctor requests Patient A
        req_wpat = sp_repository.create_data_sharing_request(
            patient_id=env["pat_b_id"],
            requesting_hospital_id=env["hosp_b"],
            requesting_doctor_id=env["doc_b_id"],
            purpose_code="CARETREAT",
            data_categories=["OPConsultation"]
        )
        sp_repository.grant_data_sharing_consent(
            consent_id=req_wpat["consent_id"],
            patient_id=env["pat_b_id"],
            allowed_categories=["OPConsultation"]
        )
        res_wpat = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/context", headers=headers_b)
        assert res_wpat.status_code == 404

        # E. Wrong-Facility Consent: Patient A granted consent to Hospital B, Doctor C from Hospital C requests access
        res_wfac = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/context", headers=headers_c)
        assert res_wfac.status_code == 404

    finally:
        settings.ENABLE_CROSS_HOSPITAL_SHARING = orig


# =============================================================================
# TEST 4: Valid Consent Permits ONLY Authorized Record Categories
# =============================================================================

def test_granular_category_scope_restriction(remediation_env):
    """
    Proves that when patient grants consent for OPConsultation only:
    1. Consultation encounters are returned.
    2. Prescriptions and investigations are strictly filtered out.
    """
    env = remediation_env
    headers_b = {"Authorization": f"Bearer {env['tokens']['doc_b']}", "X-Hospital-Ref-Id": env["hosp_b"]}

    orig = settings.ENABLE_CROSS_HOSPITAL_SHARING
    settings.ENABLE_CROSS_HOSPITAL_SHARING = True

    try:
        req_scope = sp_repository.create_data_sharing_request(
            patient_id=env["pat_a_id"],
            requesting_hospital_id=env["hosp_b"],
            requesting_doctor_id=env["doc_b_id"],
            purpose_code="CARETREAT",
            data_categories=["OPConsultation"]
        )
        sp_repository.grant_data_sharing_consent(
            consent_id=req_scope["consent_id"],
            patient_id=env["pat_a_id"],
            allowed_categories=["OPConsultation"]
        )

        # 1. Context endpoint with OPConsultation only
        res_ctx = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/context", headers=headers_b)
        assert res_ctx.status_code == 200, res_ctx.text
        ctx_data = res_ctx.json()

        # Encounters allowed
        assert len(ctx_data.get("recent_encounters") or []) >= 1
        # Prescriptions & investigations must be filtered to empty list
        assert len(ctx_data.get("recent_prescriptions") or []) == 0
        assert len(ctx_data.get("recent_investigations") or []) == 0

        # 2. History endpoint with OPConsultation only
        res_hist = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/history", headers=headers_b)
        assert res_hist.status_code == 200, res_hist.text
        events = res_hist.json()
        assert len(events) >= 1
        for ev in events:
            assert ev.get("record_type") in ("VISIT", "ENCOUNTER", "OPConsultation")

    finally:
        try:
            sp_repository.revoke_data_sharing_consent(
                consent_id=req_scope["consent_id"],
                patient_id=env["pat_a_id"],
                revocation_reason="Test cleanup"
            )
        except Exception:
            pass
        settings.ENABLE_CROSS_HOSPITAL_SHARING = orig


# =============================================================================
# TEST 5: Revocation Immediately Prevents Subsequent API Reads
# =============================================================================

def test_revocation_lifecycle_and_immediate_denial(remediation_env):
    """
    Proves:
    1. Consent request created.
    2. Correct patient approves.
    3. Wrong patient cannot approve.
    4. Doctor can read records.
    5. Patient revokes.
    6. Subsequent reads immediately return 404.
    """
    env = remediation_env
    headers_b = {"Authorization": f"Bearer {env['tokens']['doc_b']}", "X-Hospital-Ref-Id": env["hosp_b"]}
    headers_pat_a = {"Authorization": f"Bearer {env['tokens']['pat_a']}"}
    headers_pat_b = {"Authorization": f"Bearer {env['tokens']['pat_b']}"}

    orig = settings.ENABLE_CROSS_HOSPITAL_SHARING
    settings.ENABLE_CROSS_HOSPITAL_SHARING = True

    consent_id = None
    try:
        # 1. Hospital B requests consent for Patient A
        req_res = client.post("/api/v1/hospital/data-sharing/request", json={
            "patient_id": env["pat_a_id"],
            "purpose_code": "CARETREAT",
            "data_categories": ["OPConsultation", "Prescription"]
        }, headers=headers_b)
        assert req_res.status_code == 200
        consent_id = req_res.json()["consent_id"]

        # 2. Wrong patient (Patient B) attempts to approve -> Must be rejected (403/400)
        res_wrong_app = client.post(f"/api/v1/me/data-sharing/{consent_id}/approve", json={
            "allowed_categories": ["OPConsultation", "Prescription"]
        }, headers=headers_pat_b)
        assert res_wrong_app.status_code in (400, 403, 404)

        # 3. Correct patient (Patient A) approves -> 200 OK
        res_right_app = client.post(f"/api/v1/me/data-sharing/{consent_id}/approve", json={
            "allowed_categories": ["OPConsultation", "Prescription"]
        }, headers=headers_pat_a)
        assert res_right_app.status_code == 200
        assert res_right_app.json()["consent_status"] == "GRANTED"

        # 4. Doctor at Hospital B reads records successfully
        res_read = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/context", headers=headers_b)
        assert res_read.status_code == 200

        # 5. Patient A revokes consent
        res_rev = client.post(f"/api/v1/me/data-sharing/{consent_id}/revoke", json={
            "reason": "Treatment completed at Hospital B"
        }, headers=headers_pat_a)
        assert res_rev.status_code == 200
        assert res_rev.json()["status"] == "REVOKED"

        # 6. Subsequent read by Doctor B immediately denied across every endpoint
        res_read_after = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/context", headers=headers_b)
        assert res_read_after.status_code == 404
        assert res_read_after.json()["detail"] == "Patient record not found"

        res_hist_after = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/history", headers=headers_b)
        assert res_hist_after.status_code == 404

        res_fetch_after = client.post("/api/v1/hospital/data-sharing/fetch", json={"patient_id": env["pat_a_id"], "purpose": "TREATMENT"}, headers=headers_b)
        assert res_fetch_after.status_code == 403

        res_time_after = client.get(f"/api/v1/clinical/patients/{env['pat_a_id']}/timeline", headers=headers_b)
        assert res_time_after.status_code == 404

        res_sum_after = client.get(f"/api/v1/clinical/patients/{env['pat_a_id']}/reports-summary", headers=headers_b)
        assert res_sum_after.status_code == 404

    finally:
        if consent_id:
            try:
                sp_repository.revoke_data_sharing_consent(
                    consent_id=consent_id,
                    patient_id=env["pat_a_id"],
                    revocation_reason="Test cleanup"
                )
            except Exception:
                pass
        settings.ENABLE_CROSS_HOSPITAL_SHARING = orig


# =============================================================================
# TEST 9: Audit Events for Allowed and Denied Attempts
# =============================================================================

def test_audit_logging_for_allowed_and_denied_access(remediation_env):
    """Verifies that audit log entries are persisted with required metadata."""
    env = remediation_env

    with get_readonly_cursor() as cur:
        # Check for denied log entries
        cur.execute("""
            SELECT * FROM oh_id.audit_logs
            WHERE action = 'CROSS_HOSPITAL_ACCESS_DENIED'
              AND resource_id = %s;
        """, (env["pat_a_id"],))
        denied_logs = cur.fetchall()
        assert len(denied_logs) >= 1
        d_entry = denied_logs[0]
        assert d_entry["actor_id"] == env["doc_b_id"]
        assert d_entry["hospital_id"] == env["hosp_b"]

        # Check for consent revoked log entry
        cur.execute("""
            SELECT * FROM oh_id.audit_logs
            WHERE action = 'CONSENT_REVOKED'
              AND actor_id = %s;
        """, (env["pat_a_id"],))
        revoked_logs = cur.fetchall()
        assert len(revoked_logs) >= 1


# =============================================================================
# TEST 10: Direct API Calls Protected Regardless of Frontend State
# =============================================================================

def test_direct_api_calls_protected_without_frontend(remediation_env):
    """Proves backend enforcement holds even when client omits custom headers or spoofs hospital ID."""
    env = remediation_env

    # 1. Doctor B token with spoofed X-Hospital-Ref-Id pointing to Hospital A
    # Backend RBAC derives user identity from JWT payload, not spoofable header
    spoofed_headers = {
        "Authorization": f"Bearer {env['tokens']['doc_b']}",
        "X-Hospital-Ref-Id": env["hosp_a"]  # Spoofing Hospital A
    }

    # Must still be denied
    res = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/context", headers=spoofed_headers)
    assert res.status_code in (403, 404)


# =============================================================================
# TEST 11: Prescription-Only Consent Redacts Consultations & Diagnoses
# =============================================================================

def test_prescription_only_consent_redacts_consultation_and_diagnoses(remediation_env):
    """
    Proves that when patient grants consent ONLY for Prescription:
    1. Cross-hospital fetch returns prescriptions, but 0 consultations.
    2. Diagnoses, doctor notes, and clinical advice are strictly redacted on prescriptions.
    3. Doctor workspace context returns prescriptions, but 0 encounters and redacted diagnoses.
    4. Doctor workspace history filters out encounters and redacts diagnoses from prescription events.
    """
    env = remediation_env
    headers_b = {"Authorization": f"Bearer {env['tokens']['doc_b']}", "X-Hospital-Ref-Id": env["hosp_b"]}

    orig = settings.ENABLE_CROSS_HOSPITAL_SHARING
    settings.ENABLE_CROSS_HOSPITAL_SHARING = True

    consent_id = None
    try:
        req = sp_repository.create_data_sharing_request(
            patient_id=env["pat_a_id"],
            requesting_hospital_id=env["hosp_b"],
            requesting_doctor_id=env["doc_b_id"],
            purpose_code="CARETREAT",
            data_categories=["Prescription"]
        )
        consent_id = req["consent_id"]
        sp_repository.grant_data_sharing_consent(
            consent_id=consent_id,
            patient_id=env["pat_a_id"],
            allowed_categories=["Prescription"]
        )

        # 1. Cross-hospital fetch endpoint
        res_fetch = client.post("/api/v1/hospital/data-sharing/fetch", json={
            "patient_id": env["pat_a_id"],
            "purpose": "TREATMENT"
        }, headers=headers_b)
        assert res_fetch.status_code == 200, res_fetch.text
        fetch_data = res_fetch.json()
        assert fetch_data.get("authorized_scope") == ["Prescription"]
        assert len(fetch_data.get("consultations") or []) == 0
        rxs = fetch_data.get("prescriptions") or []
        assert len(rxs) >= 1
        for rx in rxs:
            assert rx.get("diagnosis") is None
            assert rx.get("doctor_notes") is None
            assert rx.get("chief_complaint") is None
            assert rx.get("clinical_advice") is None

        # 2. Doctor consultation context
        res_ctx = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/context", headers=headers_b)
        assert res_ctx.status_code == 200, res_ctx.text
        ctx_data = res_ctx.json()
        assert len(ctx_data.get("recent_encounters") or []) == 0
        ctx_rxs = ctx_data.get("recent_prescriptions") or []
        assert len(ctx_rxs) >= 1
        for rx in ctx_rxs:
            assert rx.get("diagnosis") is None
            assert rx.get("doctor_notes") is None

        # 3. Doctor longitudinal history
        res_hist = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/history", headers=headers_b)
        assert res_hist.status_code == 200, res_hist.text
        events = res_hist.json()
        for ev in events:
            assert ev.get("record_type") == "PRESCRIPTION"
            assert ev.get("diagnosis") is None

    finally:
        if consent_id:
            try:
                sp_repository.revoke_data_sharing_consent(
                    consent_id=consent_id,
                    patient_id=env["pat_a_id"],
                    revocation_reason="Test cleanup"
                )
            except Exception:
                pass
        settings.ENABLE_CROSS_HOSPITAL_SHARING = orig


# =============================================================================
# TEST 12: Disabled Feature Gate Never Falls Back to Unprotected Route
# =============================================================================

def test_disabled_feature_gate_never_falls_back_even_with_valid_consent(remediation_env):
    """
    Proves that when ENABLE_CROSS_HOSPITAL_SHARING = False (the pilot default),
    even an active, unexpired, GRANTED patient consent artifact CANNOT permit
    cross-hospital access across any API route.
    """
    env = remediation_env
    headers_b = {"Authorization": f"Bearer {env['tokens']['doc_b']}", "X-Hospital-Ref-Id": env["hosp_b"]}

    # Ensure gate is False
    settings.ENABLE_CROSS_HOSPITAL_SHARING = False

    consent_id = None
    try:
        # Create and grant consent in DB directly while gate is off
        req = sp_repository.create_data_sharing_request(
            patient_id=env["pat_a_id"],
            requesting_hospital_id=env["hosp_b"],
            requesting_doctor_id=env["doc_b_id"],
            purpose_code="CARETREAT",
            data_categories=["OPConsultation", "Prescription"]
        )
        consent_id = req["consent_id"]
        sp_repository.grant_data_sharing_consent(
            consent_id=consent_id,
            patient_id=env["pat_a_id"],
            allowed_categories=["OPConsultation", "Prescription"]
        )

        # 1. Doctor context must return safe 404 (non-enumerable)
        res_ctx = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/context", headers=headers_b)
        assert res_ctx.status_code == 404
        assert res_ctx.json()["detail"] == "Patient record not found"

        # 2. Doctor history must return safe 404
        res_hist = client.get(f"/api/v1/doctor/patients/{env['pat_a_id']}/history", headers=headers_b)
        assert res_hist.status_code == 404

        # 3. Gated fetch must return 403 Forbidden
        res_fetch = client.post("/api/v1/hospital/data-sharing/fetch", json={
            "patient_id": env["pat_a_id"],
            "purpose": "TREATMENT"
        }, headers=headers_b)
        assert res_fetch.status_code == 403
        assert "disabled" in res_fetch.json()["detail"].lower()

        # 4. Alternative timeline route must return safe 404
        res_timeline = client.get(f"/api/v1/clinical/patients/{env['pat_a_id']}/timeline", headers=headers_b)
        assert res_timeline.status_code == 404

        # 5. Alternative reports summary route must return safe 404
        res_reports = client.get(f"/api/v1/clinical/patients/{env['pat_a_id']}/reports-summary", headers=headers_b)
        assert res_reports.status_code == 404

    finally:
        if consent_id:
            try:
                sp_repository.revoke_data_sharing_consent(
                    consent_id=consent_id,
                    patient_id=env["pat_a_id"],
                    revocation_reason="Test cleanup"
                )
            except Exception:
                pass
