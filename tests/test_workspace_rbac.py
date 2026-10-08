import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def get_auth_token(username: str, password: str = "doctor123") -> str:
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]

class TestRoleWorkspaceArchitecture:
    """
    Rigorously validates Section 1 through 36 of OH-ID Enterprise Role Workspace Architecture.
    Tests every role separately, verifies database-driven workspace resolution, dynamic navigation,
    permitted dashboard widgets, context switching, and resource scope enforcement.
    """

    def test_super_admin_workspace_resolution(self):
        token = get_auth_token("admin", "admin123")
        res = client.get("/api/v1/me/workspace", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["workspace"]["workspace_type"] == "SUPER_ADMIN"
        assert data["workspace"]["default_route"] in ["/admin", "/super-admin"]
        assert data["workspace"]["role_code"] in ["SUPER_ADMIN", "role-super-admin"]
        
        # Verify navigation contains platform administration only
        nav_hrefs = [item["href"] for item in data["navigation"]]
        assert any(r in nav_hrefs for r in ["/admin", "/super-admin"])
        assert any(r in nav_hrefs for r in ["/admin/hospitals", "/super-admin/hospitals", "/super-admin"])

        # Verify Super Admin does NOT have clinical notes creation permission
        assert "consultation.create" not in data["permissions"]
        assert "system.manage" in data["permissions"]
        assert "audit.read" in data["permissions"]

    def test_hospital_admin_workspace_resolution(self):
        token = get_auth_token("hospadmin", "admin123")
        res = client.get("/api/v1/me/workspace", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["workspace"]["workspace_type"] == "HOSPITAL_ADMIN"
        assert data["workspace"]["default_route"] == "/hospital"
        
        nav_hrefs = [item["href"] for item in data["navigation"]]
        assert "/hospital" in nav_hrefs
        assert any(r in nav_hrefs for r in ["/patients", "/hospital/users", "/hospital/staff"])

        # Cannot access platform-wide system manage unless permitted
        assert "system.manage" not in data["permissions"]
        assert "hospital.read" in data["permissions"]

    def test_doctor_workspace_resolution(self):
        token = get_auth_token("dr.senthil", "doctor123")
        res = client.get("/api/v1/me/workspace", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["workspace"]["workspace_type"] == "DOCTOR"
        assert data["workspace"]["default_route"] == "/doctor"
        
        nav_hrefs = [item["href"] for item in data["navigation"]]
        assert "/doctor" in nav_hrefs
        assert "/doctor/queue" in nav_hrefs
        assert "/appointments" in nav_hrefs
        assert "/doctor/patients" in nav_hrefs

        # Doctor must not have administrative permissions
        assert "user.create" not in data["permissions"]
        assert "role.delete" not in data["permissions"]
        assert "system.manage" not in data["permissions"]
        assert "consultation.create" in data["permissions"]
        assert "queue.call" in data["permissions"]

    def test_nurse_workspace_resolution(self):
        token = get_auth_token("nurse", "nurse123")
        res = client.get("/api/v1/me/workspace", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["workspace"]["workspace_type"] == "NURSE"
        assert data["workspace"]["default_route"] == "/nurse"
        
        nav_hrefs = [item["href"] for item in data["navigation"]]
        assert "/nurse" in nav_hrefs
        assert "/nurse/vitals" in nav_hrefs
        assert "/nurse/patients" in nav_hrefs
        assert "/queue" in nav_hrefs

        # Nurse has triage vitals permission but not doctor diagnostic encounter creation
        assert "nursing.vitals.record" in data["permissions"]
        assert "consultation.create" not in data["permissions"]
        assert "system.manage" not in data["permissions"]

    def test_employee_receptionist_workspace_resolution(self):
        token = get_auth_token("receptionist", "rec123")
        res = client.get("/api/v1/me/workspace", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["workspace"]["workspace_type"] == "EMPLOYEE"
        assert data["workspace"]["default_route"] == "/employee"
        
        nav_hrefs = [item["href"] for item in data["navigation"]]
        assert "/employee" in nav_hrefs
        assert "/patients" in nav_hrefs
        assert "/patients/new" in nav_hrefs
        assert "/appointments" in nav_hrefs
        assert "/queue" in nav_hrefs

        assert "patient.create" in data["permissions"]
        assert "appointment.checkin" in data["permissions"]
        assert "consultation.create" not in data["permissions"]

    def test_patient_citizen_workspace_resolution(self):
        token = get_auth_token("patient", "patient123")
        res = client.get("/api/v1/me/workspace", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["workspace"]["workspace_type"] == "PATIENT"
        assert data["workspace"]["default_route"] == "/patient"
        
        nav_hrefs = [item["href"] for item in data["navigation"]]
        assert "/patient" in nav_hrefs
        assert any(r in nav_hrefs for r in ["/patient/id-card", "/patient/onehealth-id", "/patient/qr"])
        assert "/patient/appointments" in nav_hrefs
        assert any(r in nav_hrefs for r in ["/patient/records", "/patient/documents", "/patient/timeline", "/patient/prescriptions"])

        # Patient must NEVER have staff or admin permissions
        assert "patient.create" not in data["permissions"]
        assert "consultation.create" not in data["permissions"]
        assert "user.read" not in data["permissions"]
        assert "system.manage" not in data["permissions"]
        assert "patient.self.read" in data["permissions"]

    def test_multi_hospital_context_switching(self):
        # Dr. Senthil is assigned to Kedar Hospital (primary) and Apollo City Hospital
        token = get_auth_token("dr.senthil", "doctor123")
        res = client.get("/api/v1/me/workspace", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        
        # Verify available hospitals
        hosp_ids = [h["hospital_ref_id"] for h in data["available_hospitals"]]
        assert "hosp-kedar" in hosp_ids
        assert "hosp-001" in hosp_ids

        # Perform controlled context switch to Apollo City Hospital
        switch_res = client.post(
            "/api/v1/workspace/switch-context",
            json={"hospital_ref_id": "hosp-001"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert switch_res.status_code == 200
        switch_data = switch_res.json()
        new_token = switch_data["access_token"]
        assert switch_data["workspace"]["workspace"]["hospital_ref_id"] == "hosp-001"
        assert "Apollo" in switch_data["workspace"]["workspace"]["hospital_name"]

        # Verify negative test: Switch to unauthorized hospital
        unauth_res = client.post(
            "/api/v1/workspace/switch-context",
            json={"hospital_ref_id": "hosp-unauthorized-999"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert unauth_res.status_code == 403

    def test_dynamic_dashboard_widgets(self):
        # 1. Super Admin Widgets
        admin_token = get_auth_token("admin", "admin123")
        admin_w = client.get("/api/v1/dashboard/widgets", headers={"Authorization": f"Bearer {admin_token}"}).json()["data"]
        assert "system_health" in admin_w
        assert "organizations_summary" in admin_w
        assert "hospitals_summary" in admin_w

        # 2. Doctor Widgets
        doc_token = get_auth_token("dr.senthil", "doctor123")
        doc_w = client.get("/api/v1/dashboard/widgets", headers={"Authorization": f"Bearer {doc_token}"}).json()["data"]
        assert "doctor_schedule" in doc_w
        assert "waiting_queue" in doc_w
        assert "system_health" not in doc_w  # Doctor cannot see platform health

        # 3. Nurse Widgets
        nurse_token = get_auth_token("nurse", "nurse123")
        nurse_w = client.get("/api/v1/dashboard/widgets", headers={"Authorization": f"Bearer {nurse_token}"}).json()["data"]
        assert "waiting_triage" in nurse_w
        assert "vitals_recorded" in nurse_w
        assert "doctor_schedule" not in nurse_w

        # 4. Patient Widgets
        pat_token = get_auth_token("patient", "patient123")
        pat_w = client.get("/api/v1/dashboard/widgets", headers={"Authorization": f"Bearer {pat_token}"}).json()["data"]
        assert "my_onehealth_card" in pat_w
        assert "my_upcoming_appointments" in pat_w
        assert "system_health" not in pat_w

    def test_rbac_security_boundaries(self):
        # 1. Receptionist cannot access roles administration
        rec_token = get_auth_token("receptionist", "rec123")
        res = client.get("/api/v1/workspace/roles", headers={"Authorization": f"Bearer {rec_token}"})
        assert res.status_code == 403

        # 2. Super Admin can access roles administration
        admin_token = get_auth_token("admin", "admin123")
        res_admin = client.get("/api/v1/workspace/roles", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_admin.status_code == 200
        roles_list = res_admin.json()["data"]
        role_codes = [r["code"] for r in roles_list]
        assert "SUPER_ADMIN" in role_codes
        assert "DOCTOR" in role_codes
        assert "NURSE" in role_codes
        assert "PATIENT" in role_codes
