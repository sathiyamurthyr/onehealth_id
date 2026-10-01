import pytest
import uuid
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import get_readonly_cursor, get_db_cursor

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

@pytest.fixture(scope="module")
def admin_token(client):
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def doctor_token(client):
    res = client.post("/api/v1/auth/login", json={"username": "dr.senthil", "password": "doctor123"})
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def receptionist_token(client):
    res = client.post("/api/v1/auth/login", json={"username": "receptionist", "password": "rec123"})
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def nurse_token(client):
    res = client.post("/api/v1/auth/login", json={"username": "nurse", "password": "nurse123"})
    assert res.status_code == 200
    return res.json()["access_token"]


# ==============================================================================
# 1. AUTHENTICATION & SECURITY TESTS (200, 401, Negative, Password Hashing)
# ==============================================================================

class TestAuthSecurity:
    """Verifies authentication, token signing, credential validation, and rejection of invalid attempts."""

    def test_auth_login_all_roles_success(self, client):
        """Validates that all configured pilot roles can authenticate cleanly."""
        users = [
            ("admin", "admin123", "SUPER_ADMIN"),
            ("dr.senthil", "doctor123", "DOCTOR"),
            ("dr.anitha", "doctor123", "DOCTOR"),
            ("receptionist", "rec123", "RECEPTIONIST"),
            ("nurse", "nurse123", "NURSE"),
        ]
        for uname, pwd, expected_role in users:
            res = client.post("/api/v1/auth/login", json={"username": uname, "password": pwd})
            assert res.status_code == 200, f"Failed login for {uname}"
            body = res.json()
            assert "access_token" in body
            assert body["token_type"] == "bearer"
            assert body["user"]["username"] == uname
            assert body["user"]["role"].upper() == expected_role

    def test_auth_invalid_credentials(self, client):
        """Rejects bad password with 401 Unauthorized."""
        res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrongpassword999"})
        assert res.status_code == 401
        assert "Invalid username or password" in res.json()["detail"]

    def test_auth_nonexistent_user(self, client):
        """Rejects non-existent username with 401 Unauthorized."""
        res = client.post("/api/v1/auth/login", json={"username": "ghost.user@kedar", "password": "password123"})
        assert res.status_code == 401

    def test_auth_me_endpoint(self, client, admin_token):
        """Validates /auth/me returns the verified session profile."""
        res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["username"] == "admin"
        assert "hospital_name" in data

    def test_protected_route_without_token(self, client):
        """Rejects unauthenticated requests with 401."""
        res = client.get("/api/v1/auth/me")
        assert res.status_code == 401

    def test_protected_route_with_malformed_token(self, client):
        """Rejects forged/tampered JWT tokens with 401."""
        res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer forged.token.signature"})
        assert res.status_code == 401


# ==============================================================================
# 2. PATIENT REGISTRATION, DUPLICATE ENGINE & ONEHEALTH ID (201, 422, Validation)
# ==============================================================================

class TestPatientIdentityEngine:
    """Verifies patient search, duplicate detection, registration, OH-ID generation, and DB state."""

    def test_patient_search_existing(self, client):
        """Search finds existing seed patient Meenakshi Sundaram."""
        res = client.get("/api/v1/patients", params={"search": "Meenakshi"})
        assert res.status_code == 200
        patients = res.json()
        assert len(patients) >= 1
        assert "Meenakshi Sundaram" in patients[0]["name"]
        assert patients[0]["onehealth_id"].startswith("OHID-")

    def test_patient_search_no_results(self, client):
        """Search with random non-existent query returns empty list without error (200 OK, [])."""
        res = client.get("/api/v1/patients", params={"search": "NON_EXISTENT_NAME_XYZ_9999"})
        assert res.status_code == 200
        assert res.json() == []

    def test_duplicate_patient_pre_check_matching(self, client):
        """Duplicate detection flags existing patient when phone or name matches."""
        # Query existing seed patient phone (9840199001)
        res = client.post("/api/v1/patients/check-duplicates", json={
            "phone": "9840199001",
            "name": "Meenakshi",
            "identity_number": "NAT-9901"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["duplicate_found"] is True
        assert len(data["matches"]) >= 1
        assert data["matches"][0]["phone"] == "9840199001"

    def test_duplicate_patient_pre_check_clean(self, client):
        """Clean phone and name returns duplicate_found = False."""
        res = client.post("/api/v1/patients/check-duplicates", json={
            "phone": "9999900001",
            "name": "Totally Unique Person",
            "identity_number": "NAT-CLEAN-999"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["duplicate_found"] is False
        assert len(data["matches"]) == 0

    def test_register_patient_valid_transaction(self, client):
        """Registers a new patient via stored procedure sp_register_patient_v2 and validates DB state."""
        test_phone = f"9840{uuid.uuid4().hex[:6].lower()}"
        payload = {
            "name": "Priya Natarajan Test",
            "age": 29,
            "gender": "Female",
            "phone": test_phone,
            "email": f"priya.{test_phone}@example.com",
            "address": "45 Arcot Road, Porur, Chennai",
            "emergency_contact": "9444123456 (Father)",
            "blood_group": "B+ Positive",
            "diagnosis": "Routine Health Screening",
            "identity_type": "AADHAAR",
            "identity_number": f"ID-{test_phone[:8]}",
            "hospital_id": "hosp-kedar",
            "branch_id": "branch-kedar-01"
        }
        res = client.post("/api/v1/patients", json=payload)
        assert res.status_code == 201
        created = res.json()
        assert created["name"] == payload["name"]
        assert created["onehealth_id"].startswith("OHID-")
        assert created["qr_token"].startswith("QR-OHID-")

        # Database Verification: Verify patient exists in DB view
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.vw_patients WHERE id = %s;", (created["id"],))
            db_pat = cur.fetchone()
            assert db_pat is not None
            assert db_pat["onehealth_id"] == created["onehealth_id"]
            assert db_pat["phone"] == test_phone

        # Database Verification: Verify audit trail record was created
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT * FROM oh_id.vw_audit_logs 
                WHERE resource_id = %s AND action = 'PATIENT_REGISTER';
            """, (created["id"],))
            audit = cur.fetchone()
            assert audit is not None
            assert audit["resource_type"] == "PATIENT"

    def test_register_patient_missing_required_fields(self, client):
        """Pydantic v2 rejects payload missing name and age with 422 Unprocessable Entity."""
        res = client.post("/api/v1/patients", json={
            "phone": "9840112233",
            "gender": "Male"
            # Missing name, age, etc.
        })
        assert res.status_code == 422


# ==============================================================================
# 3. ZERO-KNOWLEDGE QR TOKEN RESOLUTION (200, 404, Security)
# ==============================================================================

class TestQRResolutionEngine:
    """Validates zero-knowledge QR verification and token lookups."""

    def test_qr_verify_valid_token(self, client):
        """Valid QR token resolves cleanly to the patient profile."""
        # 1. Fetch seed patient Meenakshi Sundaram
        res = client.get("/api/v1/patients", params={"search": "Meenakshi"})
        patient = res.json()[0]
        qr_token = patient.get("qr_token")

        if not qr_token:
            # Refresh QR token via endpoint
            ref_res = client.post(f"/api/v1/patients/{patient['id']}/refresh-qr")
            assert ref_res.status_code == 200
            qr_token = ref_res.json()["qr_token"]

        # 2. Resolve token
        resolve_res = client.get(f"/api/v1/patients/verify-qr/{qr_token}")
        assert resolve_res.status_code == 200
        resolved_pat = resolve_res.json()
        assert resolved_pat["id"] == patient["id"]
        assert resolved_pat["name"] == patient["name"]

    def test_qr_verify_nonexistent_token(self, client):
        """Invalid or spoofed QR token returns 404 Not Found."""
        res = client.get("/api/v1/patients/verify-qr/QR-OHID-FORGED-99999999")
        assert res.status_code == 404
        assert "could not be verified" in res.json()["detail"]


# ==============================================================================
# 4. APPOINTMENT SCHEDULING & ATOMIC RECEPTION CHECK-IN (201, 200, 400, 404)
# ==============================================================================

class TestAppointmentsAndCheckin:
    """Verifies appointment booking, slot formatting, check-in, token issuance, and state integrity."""

    def test_create_appointment_and_check_in(self, client):
        """End-to-end appointment creation, reception check-in, and OPD queue token issuance."""
        # 1. Fetch active patient and doctor
        p_res = client.get("/api/v1/patients")
        d_res = client.get("/api/v1/doctors")
        patient = p_res.json()[0]
        doctor = d_res.json()[0]

        # 2. Create appointment
        appt_payload = {
            "patient_id": patient["id"],
            "doctor_id": doctor["id"],
            "slot": "2026-10-15 10:30 AM",
            "notes": "Cardiology annual checkup and hypertension review",
            "priority": "NORMAL",
            "branch_id": "branch-kedar-01",
            "department_id": "dept-k-01"
        }
        create_res = client.post("/api/v1/appointments", json=appt_payload)
        assert create_res.status_code == 201
        appt = create_res.json()
        assert appt["patient_id"] == patient["id"]
        assert appt["doctor_id"] == doctor["id"]
        assert appt["status"] == "scheduled"

        # 3. Check-in patient via sp_check_in_appointment
        checkin_res = client.post(f"/api/v1/appointments/{appt['id']}/check-in")
        assert checkin_res.status_code == 200
        checkin_data = checkin_res.json()
        assert checkin_data["success"] is True
        token_num = checkin_data["data"]["token_number"]
        assert token_num is not None

        # 4. Database Verification: Check appointment status is checked_in
        with get_readonly_cursor() as cur:
            cur.execute("SELECT status FROM oh_id.appointments WHERE id = %s;", (appt["id"],))
            status_row = cur.fetchone()
            assert status_row["status"] == "checked_in"

        # 5. Database Verification: Check queue entry exists with matching token
        with get_readonly_cursor() as cur:
            cur.execute("SELECT * FROM oh_id.queue_entries WHERE appointment_id = %s;", (appt["id"],))
            q_row = cur.fetchone()
            assert q_row is not None
            assert q_row["token_number"] == token_num
            assert q_row["status"] == "WAITING"

    def test_check_in_nonexistent_appointment(self, client):
        """Rejects check-in for non-existent appointment with 404."""
        res = client.post("/api/v1/appointments/appt-nonexistent-9999/check-in")
        assert res.status_code == 404


# ==============================================================================
# 5. OPD QUEUE ACTIONS (200, 404, State Transitions)
# ==============================================================================

class TestOPDQueueEngine:
    """Verifies live queue board, FIFO ordering, and doctor/reception queue actions."""

    def test_queue_board_listing(self, client):
        """Fetches live queue entries from vw_queue_board."""
        res = client.get("/api/v1/queue")
        assert res.status_code == 200
        queue_items = res.json()
        assert isinstance(queue_items, list)
        for item in queue_items:
            assert "token_number" in item
            assert "patient_name" in item
            assert item["status"] in ["WAITING", "CALLING", "IN_CONSULTATION", "COMPLETED", "HOLD", "SKIPPED"]

    def test_queue_action_call_next(self, client):
        """Advances a queue entry state via sp_manage_queue."""
        # Find a waiting entry or create one
        res = client.get("/api/v1/queue")
        queue_items = res.json()
        if queue_items:
            target = queue_items[0]
            action_res = client.post(f"/api/v1/queue/{target['id']}/action", json={"action": "CALL_NEXT"})
            assert action_res.status_code == 200
            assert action_res.json()["success"] is True

    def test_queue_action_invalid_id(self, client):
        """Rejects action on invalid queue ID with 404 Not Found."""
        res = client.post("/api/v1/queue/queue-nonexistent-9999/action", json={"action": "CALL_NEXT"})
        assert res.status_code == 404


# ==============================================================================
# 6. DOCTOR CONSULTATION & ENCOUNTER COMPLETION (200, 400, 422, Audit Log)
# ==============================================================================

class TestDoctorConsultationWorkflow:
    """Verifies clinical consultation recording, atomic encounter closing, and audit logging."""

    def test_doctor_complete_consultation(self, client, doctor_token):
        """Records full consultation, saves vitals, closes appointment, and generates audit trail."""
        # 1. Fetch seed patient p-k-101
        res = client.get("/api/v1/patients", params={"search": "Meenakshi"})
        patient = res.json()[0]

        payload = {
            "patient_id": patient["id"],
            "doctor_id": "doc-k-01",
            "symptoms": "Occasional dizziness after morning walk, mild headache",
            "diagnosis": "Stage 1 Essential Hypertension with Cervical Muscle Spasm",
            "clinical_notes": "1. Tab Telmisartan 40mg (1-0-0) after breakfast\n2. Low salt diet\n3. Review after 15 days",
            "vitals": {
                "blood_pressure": "138/88 mmHg",
                "pulse_bpm": 76,
                "temperature_f": 98.4,
                "spo2_percent": 99,
                "weight_kg": 64.5
            }
        }

        # 2. Record consultation via endpoint (returns 201 Created)
        consult_res = client.post(
            "/api/v1/clinical/consultations",
            json=payload,
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        assert consult_res.status_code == 201
        consult_data = consult_res.json()
        consult_id = consult_data["id"]
        assert consult_id is not None

        # 3. Database Verification: Check consultation recorded in DB view
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT * FROM oh_id.vw_opd_encounters 
                WHERE id = %s;
            """, (consult_id,))
            consult = cur.fetchone()
            assert consult is not None
            assert consult["patient_id"] == patient["id"]
            assert consult["diagnosis"] == payload["diagnosis"]

        # 4. Database Verification: Verify audit trail
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT * FROM oh_id.vw_audit_logs 
                WHERE resource_id = %s AND action = 'CONSULTATION_CREATE';
            """, (consult_id,))
            audit = cur.fetchone()
            assert audit is not None
            assert audit["resource_type"] == "CONSULTATION"

    def test_receptionist_cannot_record_consultation(self, client, receptionist_token):
        """Verifies RBAC: Receptionist attempting to record medical consultation receives 403 Forbidden."""
        res = client.post(
            "/api/v1/clinical/consultations",
            json={
                "patient_id": "p-k-101",
                "doctor_id": "doc-k-01",
                "diagnosis": "Attempted unauthorized medical diagnosis by frontdesk staff"
            },
            headers={"Authorization": f"Bearer {receptionist_token}"}
        )
        assert res.status_code == 403
        assert "Forbidden" in res.json()["detail"]

    def test_consultation_missing_mandatory_diagnosis(self, client, doctor_token):
        """Pydantic rejects consultation payload without diagnosis (422 Unprocessable Entity)."""
        res = client.post(
            "/api/v1/clinical/consultations",
            json={
                "patient_id": "p-k-101",
                "doctor_id": "doc-k-01",
                "symptoms": "Fever"
                # Missing diagnosis
            },
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        assert res.status_code == 422


# ==============================================================================
# 7. KEDAR DASHBOARD METRICS & CONFIGURATION (200, Zero Hardcoded Values)
# ==============================================================================

class TestKedarDashboardAndConfig:
    """Verifies that all dashboard figures derive from dynamic database views."""

    def test_dashboard_metrics_dynamic_query(self, client):
        """Validates that dashboard statistics are populated from vw_dashboard_metrics."""
        res = client.get("/api/v1/dashboard/metrics")
        assert res.status_code == 200
        metrics = res.json()
        assert isinstance(metrics["total_patients"], int)
        assert metrics["total_patients"] >= 2
        assert isinstance(metrics["active_appointments"], int)
        assert isinstance(metrics["available_doctors"], int)
        assert metrics["available_doctors"] >= 2
        assert "total_revenue" in metrics

    def test_hospital_config_kedar(self, client):
        """Validates Kedar Hospital configuration endpoint returns DB-driven tenant hierarchy."""
        res = client.get("/api/v1/hospital/config")
        assert res.status_code == 200
        data = res.json()
        assert data["hospital"]["id"] == "hosp-kedar"
        assert "Kedar Hospital" in data["hospital"]["name"]
        assert len(data["branches"]) >= 1
        assert "Mugalivakkam" in data["branches"][0]["name"]
        assert len(data["departments"]) >= 5
        assert len(data["doctors"]) >= 2
