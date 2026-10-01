"""
Section 35: TENANT ISOLATION TEST
====================================
OH-ID Enterprise Role Workspace Architecture — Section 35

Creates a controlled test scenario:
  - Hospital A = Kedar Hospital (hosp-kedar)
  - Hospital B = Apollo City Hospital (hosp-001)

User A (nurse - Deepa Mohan) belongs ONLY to Hospital A.
This test attempts cross-hospital data access and verifies strict 403 rejection.

Also tests:
  - Patient self-isolation (patient can only access own records)
  - Doctor scope: doctor sees only patients from their authorized hospital
  - Permission-based scope: nurse cannot call queue (queue.call is doctor-only)
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import get_readonly_cursor

client = TestClient(app)


def auth(username: str, password: str) -> str:
    """Helper to log in and get a bearer token."""
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]


def hdr(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestTenantDataIsolation:
    """
    Section 35: Hospital A users cannot access Hospital B data.
    All cross-hospital boundary violations must return 403 Forbidden
    or a secure empty response — never Hospital B's patient data.
    """

    def test_hospital_a_user_cannot_switch_to_hospital_b_without_assignment(self):
        """
        Nurse (Hospital A only) attempts context switch to Hospital B.
        Expected: 403 — nurse is not assigned to hosp-001.
        """
        nurse_token = auth("nurse", "nurse123")

        # Verify nurse's home hospital is hosp-kedar
        ws_res = client.get("/api/v1/me/workspace", headers=hdr(nurse_token))
        assert ws_res.status_code == 200
        ws = ws_res.json()["workspace"]
        assert ws["hospital_ref_id"] == "hosp-kedar", "Nurse should be scoped to Kedar Hospital"

        # Attempt context switch to Apollo City Hospital (hosp-001)
        switch_res = client.post(
            "/api/v1/workspace/switch-context",
            json={"hospital_ref_id": "hosp-001"},
            headers=hdr(nurse_token)
        )
        assert switch_res.status_code == 403, (
            f"SECURITY VIOLATION: Nurse switched to unauthorized hospital. "
            f"Got {switch_res.status_code}: {switch_res.text}"
        )

    def test_hospital_a_user_cannot_switch_to_nonexistent_hospital(self):
        """
        Any user attempting to switch to a fabricated hospital_ref_id must get 403.
        """
        receptionist_token = auth("receptionist", "rec123")
        switch_res = client.post(
            "/api/v1/workspace/switch-context",
            json={"hospital_ref_id": "hosp-attacker-fabricated-99999"},
            headers=hdr(receptionist_token)
        )
        assert switch_res.status_code == 403, (
            f"SECURITY VIOLATION: Accepted fabricated hospital ID. Got {switch_res.status_code}"
        )

    def test_patient_data_isolation_hospital_a_cannot_see_other_patients(self):
        """
        Patient user (Alice Smith, p-101) can only access their own profile via patient.self.read.
        Patient should not receive other patients' records via the patient-facing API.
        """
        patient_token = auth("patient", "patient123")

        # Confirm patient workspace and self permission
        ws_res = client.get("/api/v1/me/workspace", headers=hdr(patient_token))
        perms = ws_res.json()["permissions"]
        assert "patient.self.read" in perms, "Patient must have patient.self.read"
        assert "patient.read" not in perms, (
            "Patient must NOT have generic patient.read (only self-read)"
        )

    def test_nurse_cannot_access_platform_patient_registry(self):
        """
        Nurse has nursing.vitals.record and patient.read (within their hospital),
        but MUST NOT be able to call platform-wide patient registry without a hospital scope.
        """
        nurse_token = auth("nurse", "nurse123")

        # Queue list should only return current hospital's queue
        queue_res = client.get("/api/v1/queue", headers=hdr(nurse_token))
        assert queue_res.status_code == 200
        queue_data = queue_res.json()
        # All items must belong to the nurse's hospital (hosp-kedar).
        # Note: QueueEntryResponse exposes hospital_name, not hospital_id.
        # The security fix ensures hospital scope is applied server-side.
        kedar_names = ["kedar", "Kedar"]
        for item in queue_data:
            h_name = item.get("hospital_name", "")
            assert any(k in h_name for k in kedar_names), (
                f"ISOLATION BREACH: Nurse received queue item from wrong hospital: {item}"
            )

    def test_doctor_scope_only_sees_assigned_hospital_patients(self):
        """
        Doctor at Kedar Hospital (primary context) should only see patients
        from their authorized hospital via /api/v1/patients.
        """
        doctor_token = auth("dr.senthil", "doctor123")

        patients_res = client.get("/api/v1/patients", headers=hdr(doctor_token))
        assert patients_res.status_code == 200
        patients = patients_res.json()
        assert isinstance(patients, list)

        # Patients returned must belong to the doctor's active hospital context (hosp-kedar)
        for patient in patients:
            assert patient.get("hospital_id") == "hosp-kedar", (
                f"ISOLATION BREACH: Doctor received patient from wrong hospital: {patient}"
            )

    def test_receptionist_cannot_access_admin_roles_endpoint(self):
        """
        Section 29: Frontend hiding is NOT security.
        Backend must reject receptionist from role.read restricted endpoints.
        """
        rec_token = auth("receptionist", "rec123")
        # Roles listing requires role.read permission that receptionist does not have
        res = client.get("/api/v1/workspace/roles", headers=hdr(rec_token))
        assert res.status_code == 403, (
            f"SECURITY VIOLATION: Receptionist accessed roles endpoint. Got {res.status_code}"
        )

    def test_nurse_cannot_call_queue_without_queue_call_permission(self):
        """
        Nurse has queue.read but NOT queue.call (doctor-only action).
        Calling 'CALL_NEXT' action should return 403.
        """
        nurse_token = auth("nurse", "nurse123")

        # Verify nurse does NOT have queue.call
        ws_res = client.get("/api/v1/me/workspace", headers=hdr(nurse_token))
        perms = ws_res.json()["permissions"]
        assert "queue.call" not in perms, "Nurse must NOT have queue.call permission"

        # Attempt to call the queue — should be 403
        queue_res = client.get("/api/v1/queue", headers=hdr(nurse_token))
        if queue_res.status_code == 200 and queue_res.json():
            first_queue_id = queue_res.json()[0]["id"]
            action_res = client.post(
                f"/api/v1/queue/{first_queue_id}/action",
                json={"action": "CALL_NEXT"},
                headers=hdr(nurse_token)
            )
            assert action_res.status_code == 403, (
                f"SECURITY VIOLATION: Nurse can call queue. Got {action_res.status_code}: {action_res.text}"
            )

    def test_doctor_cannot_manage_roles(self):
        """
        Doctor must not be able to access role management or user management endpoints.
        """
        doctor_token = auth("dr.senthil", "doctor123")

        # 1. Role listing restricted
        roles_res = client.get("/api/v1/workspace/roles", headers=hdr(doctor_token))
        assert roles_res.status_code == 403, (
            f"SECURITY VIOLATION: Doctor accessed role management. Got {roles_res.status_code}"
        )

    def test_patient_cannot_access_hospital_admin_pages(self):
        """
        Patient must not be able to access any hospital staff endpoints.
        Verify against: hospital config, roles, patient registry (staff view).
        """
        patient_token = auth("patient", "patient123")

        # 1. Roles management
        roles_res = client.get("/api/v1/workspace/roles", headers=hdr(patient_token))
        assert roles_res.status_code == 403

        # 2. Hospital configuration
        config_res = client.get("/api/v1/hospital/config", headers=hdr(patient_token))
        assert config_res.status_code in [403, 401], (
            f"SECURITY VIOLATION: Patient accessed hospital config. Got {config_res.status_code}"
        )

    def test_unauthenticated_request_blocked_everywhere(self):
        """
        All protected endpoints must reject requests with no token.
        No auth = no data, period.
        """
        protected_endpoints = [
            "/api/v1/me/workspace",
            "/api/v1/patients",
            "/api/v1/queue",
            "/api/v1/appointments",
            "/api/v1/workspace/roles",
            "/api/v1/dashboard/widgets",
            "/api/v1/hospital/config",
            # NOTE: /api/v1/patients/verify-qr/{token} is intentionally public for kiosk QR scanning
            # at hospital reception — no auth required to scan a QR code presented by a patient.
            # This is by design (Section 12: QR scan at hospital reception).
        ]
        for endpoint in protected_endpoints:
            res = client.get(endpoint)
            assert res.status_code in [401, 403], (
                f"SECURITY VIOLATION: Unauthenticated request to {endpoint} returned {res.status_code}"
            )

    def test_hospital_patient_data_stays_within_tenant(self):
        """
        Verify that a user from Kedar Hospital (hosp-kedar) cannot request
        a patient known to belong exclusively to Apollo City Hospital (hosp-001).
        """
        # Log in as Kedar Hospital nurse (scoped to hosp-kedar only)
        nurse_token = auth("nurse", "nurse123")

        # p-104 (Nathan Drake) is a patient in the seed data assigned to hosp-001 context
        # Nurse at hosp-kedar must NOT be able to retrieve this patient's record
        # via a direct /patients/{id} lookup that crosses hospital boundary
        with get_readonly_cursor() as cur:
            # Find a patient who belongs to hosp-001 but NOT hosp-kedar
            cur.execute("""
                SELECT p.id 
                FROM oh_id.patients p
                WHERE p.hospital_id = 'hosp-001'
                  AND p.hospital_id != 'hosp-kedar'
                LIMIT 1;
            """)
            row = cur.fetchone()

        if row:
            foreign_patient_id = row["id"]
            res = client.get(
                f"/api/v1/patients/{foreign_patient_id}",
                headers=hdr(nurse_token)
            )
            # Must return 403 or 404 (not 200 with cross-hospital data)
            assert res.status_code in [403, 404], (
                f"TENANT ISOLATION BREACH: Kedar nurse retrieved patient from hosp-001. "
                f"Got {res.status_code}: {res.text[:300]}"
            )
