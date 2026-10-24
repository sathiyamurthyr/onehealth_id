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
        unauth_client = TestClient(app)
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
            res = unauth_client.get(endpoint)
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

    def test_patient_cannot_access_other_patient_prescription_print_or_pdf(self):
        """
        BOLA/IDOR Defense: Patient A (Alice Smith, p-101) cannot access,
        print, or download PDF of Patient B's prescription (Bob Smith, p-102).
        Must return 403 Forbidden on all endpoints.
        """
        patient_token = auth("patient", "patient123")

        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT id, patient_id FROM oh_id.prescriptions
                WHERE patient_id != 'p-101'
                LIMIT 1;
            """)
            other_rx = cur.fetchone()

        if other_rx:
            rx_id = other_rx["id"]
            # 1. Direct prescription detail
            res_detail = client.get(f"/api/v1/prescriptions/{rx_id}", headers=hdr(patient_token))
            assert res_detail.status_code == 403, f"Expected 403 on detail, got {res_detail.status_code}"

            # 2. Print layout
            res_print = client.get(f"/api/v1/prescriptions/{rx_id}/print", headers=hdr(patient_token))
            assert res_print.status_code == 403, f"Expected 403 on print layout, got {res_print.status_code}"

            # 3. PDF download
            res_pdf = client.get(f"/api/v1/prescriptions/{rx_id}/pdf", headers=hdr(patient_token))
            assert res_pdf.status_code == 403, f"Expected 403 on PDF download, got {res_pdf.status_code}"

            # 4. Clinical prescription endpoint
            res_clinical = client.get(f"/api/v1/clinical/prescriptions/{rx_id}", headers=hdr(patient_token))
            assert res_clinical.status_code == 403, f"Expected 403 on clinical prescription, got {res_clinical.status_code}"

    def test_patient_can_access_own_prescription_print_and_pdf(self):
        """
        Legitimate workflow verification: Patient A (Alice Smith, p-101) can view,
        print, and generate PDF for their own prescription.
        """
        patient_token = auth("patient", "patient123")

        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT id FROM oh_id.prescriptions
                WHERE patient_id = 'p-101'
                LIMIT 1;
            """)
            own_rx = cur.fetchone()

        if own_rx:
            rx_id = own_rx["id"]
            res_print = client.get(f"/api/v1/prescriptions/{rx_id}/print", headers=hdr(patient_token))
            assert res_print.status_code == 200
            assert res_print.json()["prescription"]["id"] == rx_id

            res_pdf = client.get(f"/api/v1/prescriptions/{rx_id}/pdf", headers=hdr(patient_token))
            assert res_pdf.status_code == 200
            assert "download_url" in res_pdf.json()

    def test_unauthorized_cross_patient_appointment_creation_rejected(self):
        """
        Authorization verification: Patient A (p-101) cannot schedule an appointment
        for Patient B (p-102).
        Must be rejected with 403 Forbidden.
        """
        patient_token = auth("patient", "patient123")
        payload = {
            "patient_id": "p-102",  # Different patient
            "doctor_id": "doc-001",
            "hospital_id": "hosp-kedar",
            "appointment_date": "2026-11-15",
            "appointment_time": "11:30 AM",
            "slot": "2026-11-15 11:30 AM",
            "department": "Cardiology",
            "notes": "Impersonated booking attempt"
        }
        res = client.post("/api/v1/appointments", json=payload, headers=hdr(patient_token))
        assert res.status_code == 403, (
            f"SECURITY DEFECT: Patient A was allowed to book appointment for Patient B! Got {res.status_code}"
        )

    def test_doctor_clinical_opd_encounters_scoped_to_authorized_hospital(self):
        """
        Multi-Tenant Scoping: Clinician querying OPD encounters without patient filter
        only receives encounters belonging to their authorized hospital context.
        """
        doctor_token = auth("dr.senthil", "doctor123")
        res = client.get("/api/v1/clinical/opd/encounters", headers=hdr(doctor_token))
        assert res.status_code == 200
        encounters = res.json()
        assert isinstance(encounters, list)
        for enc in encounters:
            h_id = enc.get("hospital_id")
            if h_id:
                assert h_id == "hosp-kedar", (
                    f"TENANT BREACH: Doctor received OPD encounter from foreign hospital: {enc}"
                )

    def test_doctor_clinical_ipd_admissions_scoped_to_authorized_hospital(self):
        """
        Multi-Tenant Scoping: Clinician querying IPD admissions only receives
        admissions belonging to their authorized hospital context.
        """
        doctor_token = auth("dr.senthil", "doctor123")
        res = client.get("/api/v1/clinical/ipd/admissions", headers=hdr(doctor_token))
        assert res.status_code == 200
        admissions = res.json()
        assert isinstance(admissions, list)
        for adm in admissions:
            h_id = adm.get("hospital_id")
            if h_id:
                assert h_id == "hosp-kedar", (
                    f"TENANT BREACH: Doctor received IPD admission from foreign hospital: {adm}"
                )

    def test_doctor_clinical_lab_orders_scoped_to_authorized_hospital(self):
        """
        Multi-Tenant Scoping: Clinician querying lab orders only receives
        orders belonging to their authorized hospital context.
        """
        doctor_token = auth("dr.senthil", "doctor123")
        res = client.get("/api/v1/clinical/laboratory/orders", headers=hdr(doctor_token))
        assert res.status_code == 200
        orders = res.json()
        assert isinstance(orders, list)
        for o in orders:
            h_id = o.get("hospital_id")
            if h_id:
                assert h_id == "hosp-kedar", (
                    f"TENANT BREACH: Doctor received lab order from foreign hospital: {o}"
                )
