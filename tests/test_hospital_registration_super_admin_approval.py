import uuid
import pytest
from starlette.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token

client = TestClient(app)

def get_auth_token(username: str, password: str = "admin123") -> str:
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def super_admin_token():
    return get_auth_token("admin", "admin123")


@pytest.fixture(scope="module")
def doctor_token():
    return get_auth_token("dr.senthil", "doctor123")


@pytest.fixture(scope="module")
def receptionist_token():
    return get_auth_token("receptionist", "rec123")


class TestHospitalRegistrationAndSuperAdminApproval:
    """
    Rigorously validates the Hospital & Clinic Registration and Super Admin Approval Workflow.
    Verifies public onboarding, lifecycle states (SUBMITTED -> UNDER_REVIEW -> APPROVED / REJECTED / SUSPENDED),
    server-side RBAC enforcement, dynamic session revocation, and staff authorization.
    """

    def test_01_public_registration_defaults_to_submitted(self):
        """1. New facility application defaults to SUBMITTED and generates an application reference."""
        unique_suffix = uuid.uuid4().hex[:6]
        payload = {
            "name": f"Apex Care Specialty Hospital {unique_suffix}",
            "facility_type": "HOSPITAL",
            "legal_name": f"Apex Care Healthcare Pvt Ltd {unique_suffix}",
            "ownership_type": "PRIVATE",
            "registration_number": f"REG-TN-APEX-{unique_suffix.upper()}",
            "registration_authority": "Directorate of Medical Services, Tamil Nadu",
            "address": "45 GST Road, Guindy",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "country": "India",
            "pin_code": "600032",
            "phone": "9840123999",
            "email": f"contact@{unique_suffix}.apexcare.org",
            "rep_name": "Dr. Ramesh Varma",
            "rep_designation": "Medical Superintendent",
            "rep_email": f"ramesh.varma@{unique_suffix}.apexcare.org",
            "rep_phone": "9840123999",
            "supporting_documents": [
                {
                    "title": "Clinical Establishment License",
                    "document_type": "REGISTRATION_LICENSE",
                    "file_name": "license_cert.pdf",
                    "file_url": "https://documents.onehealth.in/uploads/license_cert.pdf"
                }
            ]
        }

        res = client.post("/api/v1/hospitals/register", json=payload)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["status"] == "success"
        app_data = data["data"]
        assert "application_ref" in app_data
        assert app_data["application_ref"].startswith("APP-")
        assert app_data["lifecycle_status"] == "SUBMITTED"
        assert app_data["is_active"] is False

        # Store for subsequent test steps
        TestHospitalRegistrationAndSuperAdminApproval.app_ref = app_data["application_ref"]
        TestHospitalRegistrationAndSuperAdminApproval.hosp_id = app_data["hospital_id"]
        TestHospitalRegistrationAndSuperAdminApproval.reg_number = payload["registration_number"]

    def test_02_public_status_tracking(self):
        """Applicant can track status using their application reference."""
        app_ref = TestHospitalRegistrationAndSuperAdminApproval.app_ref
        res = client.get(f"/api/v1/hospitals/applications/{app_ref}")
        assert res.status_code == 200, res.text
        data = res.json()["data"]
        assert data["application_ref"] == app_ref
        assert data["lifecycle_status"] == "SUBMITTED"
        assert data["is_active"] is False

    def test_03_client_cannot_self_assign_approval_status(self):
        """3. Changing application status through client request is rejected / stripped."""
        app_ref = TestHospitalRegistrationAndSuperAdminApproval.app_ref
        tamper_payload = {
            "address": "45 GST Road, Suite 200",
            "phone": "9840123888",
            "lifecycle_status": "APPROVED",
            "status": "ACTIVE",
            "is_active": True,
            "role": "SUPER_ADMIN"
        }
        res = client.post(f"/api/v1/hospitals/applications/{app_ref}/update", json=tamper_payload)
        assert res.status_code == 200, res.text

        # Verify application status remains SUBMITTED (not tampered to APPROVED)
        verify_res = client.get(f"/api/v1/hospitals/applications/{app_ref}")
        data = verify_res.json()["data"]
        assert data["lifecycle_status"] == "SUBMITTED"
        assert data["is_active"] is False

    def test_04_unapproved_hospital_blocked_from_protected_apis(self):
        """2 & 4. Unapproved hospital cannot access protected hospital or clinical functionality."""
        hosp_id = TestHospitalRegistrationAndSuperAdminApproval.hosp_id

        # Mint synthetic token with unapproved hospital context
        pending_hosp_token = create_access_token({
            "sub": "pending_admin",
            "uid": "usr-pending-hosp-admin",
            "role": "HOSPITAL_ADMIN",
            "usertype_ref_id": "role-hospital-admin",
            "hospital_id": hosp_id,
            "hospital_ref_id": hosp_id,
            "permissions": ["hospital.read", "dashboard.view"]
        })

        # Protected hospital overview endpoint
        res = client.get(
            f"/api/v1/hospital/overview?hospital_id={hosp_id}",
            headers={"Authorization": f"Bearer {pending_hosp_token}"}
        )
        assert res.status_code == 403, res.text
        assert "pending Super Admin review" in res.json()["detail"]

        # Protected clinical prescription creation
        rx_res = client.post(
            "/api/v1/prescriptions",
            json={"patient_id": "p-101", "diagnosis": "Hypertension", "items": []},
            headers={"Authorization": f"Bearer {pending_hosp_token}"}
        )
        assert rx_res.status_code == 403
        assert "pending Super Admin review" in rx_res.json()["detail"]

    def test_05_unauthorized_users_cannot_access_approval_dashboard(self, doctor_token, receptionist_token):
        """5. Non-superadmin users cannot access approval dashboard endpoints."""
        # Unauthenticated request
        anon_res = client.get("/api/v1/super-admin/applications")
        assert anon_res.status_code in (401, 403)

        # Doctor request
        doc_res = client.get(
            "/api/v1/super-admin/applications",
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        assert doc_res.status_code == 403

        # Receptionist request
        rec_res = client.get(
            "/api/v1/super-admin/applications",
            headers={"Authorization": f"Bearer {receptionist_token}"}
        )
        assert rec_res.status_code == 403

    def test_06_super_admin_can_review_and_request_info(self, super_admin_token):
        """Super Admin transitions application to UNDER_REVIEW and NEEDS_INFORMATION."""
        hosp_id = TestHospitalRegistrationAndSuperAdminApproval.hosp_id
        app_ref = TestHospitalRegistrationAndSuperAdminApproval.app_ref

        # 1. Start review
        rev_res = client.post(
            f"/api/v1/super-admin/applications/{hosp_id}/review",
            json={"notes": "Verification of state DMS clinical license initiated."},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert rev_res.status_code == 200, rev_res.text
        assert rev_res.json()["data"]["lifecycle_status"] == "UNDER_REVIEW"

        # 2. Request additional info
        info_res = client.post(
            f"/api/v1/super-admin/applications/{hosp_id}/request-info",
            json={"notes": "Please provide updated Fire NOC certificate and Biomedical Waste agreement."},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert info_res.status_code == 200, info_res.text
        assert info_res.json()["data"]["lifecycle_status"] == "NEEDS_INFORMATION"

        # Public tracking reflects NEEDS_INFORMATION
        track_res = client.get(f"/api/v1/hospitals/applications/{app_ref}")
        assert track_res.json()["data"]["lifecycle_status"] == "NEEDS_INFORMATION"

    def test_07_super_admin_approves_facility(self, super_admin_token):
        """4. Only Super Admin can approve application, activating the hospital."""
        hosp_id = TestHospitalRegistrationAndSuperAdminApproval.hosp_id
        app_ref = TestHospitalRegistrationAndSuperAdminApproval.app_ref

        approve_res = client.post(
            f"/api/v1/super-admin/applications/{hosp_id}/approve",
            json={"decision_notes": "Statutory license verified with state DHS portal. Approved for live operations."},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert approve_res.status_code == 200, approve_res.text
        data = approve_res.json()["data"]
        assert data["lifecycle_status"] == "APPROVED"
        assert data["is_active"] is True

        # Public tracking reflects APPROVED
        track_res = client.get(f"/api/v1/hospitals/applications/{app_ref}")
        assert track_res.json()["data"]["lifecycle_status"] == "APPROVED"
        assert track_res.json()["data"]["is_active"] is True

    def test_08_staff_authorization_distinct_from_organization_approval(self, super_admin_token):
        """5 & 7. Clinical staff must be verified and authorized distinct from organization approval."""
        hosp_id = TestHospitalRegistrationAndSuperAdminApproval.hosp_id

        # Mint synthetic token for unverified doctor attempting to access approved hospital
        unverified_doc_token = create_access_token({
            "sub": "unverified_doc",
            "uid": f"usr-unverif-{uuid.uuid4().hex[:6]}",
            "role": "DOCTOR",
            "usertype_ref_id": "role-doctor",
            "hospital_id": hosp_id,
            "hospital_ref_id": hosp_id,
            "permissions": ["clinical.read", "consultation.create", "patient.read"]
        })

        # Request should be rejected because staff member has not been authorized for this hospital
        res = client.get(
            "/api/v1/doctor/patients/p-101/context",
            headers={"Authorization": f"Bearer {unverified_doc_token}"}
        )
        assert res.status_code == 403, res.text
        assert "Clinical staff member is not authorized" in res.json()["detail"] or "Clinical staff credentials" in res.json()["detail"]

    def test_09_super_admin_suspends_facility_and_revokes_active_sessions(self, super_admin_token):
        """9 & 10. Suspended organization and existing tokens lose access immediately."""
        hosp_id = TestHospitalRegistrationAndSuperAdminApproval.hosp_id

        # Mint token while hospital is approved
        pre_suspension_token = create_access_token({
            "sub": "hospital_admin_user",
            "uid": f"usr-admin-{uuid.uuid4().hex[:6]}",
            "role": "HOSPITAL_ADMIN",
            "usertype_ref_id": "role-hospital-admin",
            "hospital_id": hosp_id,
            "hospital_ref_id": hosp_id,
            "permissions": ["hospital.read", "dashboard.view"]
        })

        # Suspend facility
        suspend_res = client.post(
            f"/api/v1/super-admin/hospitals/{hosp_id}/status",
            json={
                "new_status": "SUSPENDED",
                "reason": "Payment default and annual audit non-compliance.",
                "ticket_ref": "TKT-SUSPEND-2026-001"
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert suspend_res.status_code == 200, suspend_res.text
        assert suspend_res.json()["data"]["new_status"] == "SUSPENDED"

        # Even with pre-existing unexpired token, subsequent access is immediately rejected
        blocked_res = client.get(
            f"/api/v1/hospital/overview?hospital_id={hosp_id}",
            headers={"Authorization": f"Bearer {pre_suspension_token}"}
        )
        assert blocked_res.status_code == 403, blocked_res.text
        assert "suspended by Super Admin" in blocked_res.json()["detail"]

    def test_10_prevent_duplicate_registration_numbers(self):
        """11. Duplicate organization applications with same registration number are rejected."""
        unique_suffix = uuid.uuid4().hex[:6]
        duplicate_payload = {
            "name": f"Duplicate Hospital {unique_suffix}",
            "facility_type": "HOSPITAL",
            "registration_number": TestHospitalRegistrationAndSuperAdminApproval.reg_number,
            "address": "12 Mount Road",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "country": "India",
            "pin_code": "600002",
            "phone": "9840123777",
            "email": f"contact@{unique_suffix}.duphosp.org",
            "rep_name": "Dr. Duplicate Varma",
            "rep_email": f"rep@{unique_suffix}.duphosp.org",
            "rep_phone": "9840123777"
        }

        dup_res = client.post("/api/v1/hospitals/register", json=duplicate_payload)
        assert dup_res.status_code == 400, dup_res.text
        assert "already exists" in dup_res.json()["detail"] or "already registered" in dup_res.json()["detail"]
