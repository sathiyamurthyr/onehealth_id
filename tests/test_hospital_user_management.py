"""
Unit & Integration Tests: Hospital Admin User Management, Dynamic Roles, RBAC, Security & Access Review
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

@pytest.fixture(scope="module")
def hosp_admin_headers():
    res = client.post("/api/v1/auth/login", json={"username": "hospadmin", "password": "admin123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": "hosp-kedar"
    }

def test_list_hospital_users_with_filters(hosp_admin_headers):
    # 1. List all users
    res = client.get("/api/v1/hospital/users?hospital_id=hosp-kedar", headers=hosp_admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 5
    
    # 2. Filter by DOCTOR
    res_doc = client.get("/api/v1/hospital/users?hospital_id=hosp-kedar&role=DOCTOR", headers=hosp_admin_headers)
    assert res_doc.status_code == 200
    for u in res_doc.json()["items"]:
        assert u["role_code"] == "DOCTOR"

    # 3. Filter by SUSPENDED
    res_susp = client.get("/api/v1/hospital/users?hospital_id=hosp-kedar&status=SUSPENDED", headers=hosp_admin_headers)
    assert res_susp.status_code == 200
    for u in res_susp.json()["items"]:
        assert u["employment_status"] == "SUSPENDED"

def test_create_doctor_user_with_dynamic_credentials(hosp_admin_headers):
    payload = {
        "first_name": "Karthikeyan",
        "middle_name": "M",
        "last_name": "S",
        "email": "dr.karthik.s@kedarhospital.in",
        "mobile": "+91 98401 55667",
        "gender": "Male",
        "dob": "1985-06-15",
        "employee_id": "EMP-DOC-901",
        "employment_type": "FULL_TIME",
        "designation": "Consultant Neurologist",
        "role_code": "DOCTOR",
        "department_id": "dept-k-01",
        "branch_id": "br-kedar-01",
        "credential_number": "TN-MCI-99881",
        "credential_authority": "Tamil Nadu Medical Council",
        "credential_expiry_date": "2028-12-31",
        "role_metadata": {
            "nmr_id": "NMR-TN-2010-09881",
            "specialty": "Neurology",
            "qualification": "MBBS, MD, DM (Neurology)",
            "opd_counter_id": "ctr-k-01",
            "consultation_room": "Room 205, Block B",
            "consultation_fee": 700.0
        },
        "hospital_id": "hosp-kedar"
    }
    res = client.post("/api/v1/hospital/users", json=payload, headers=hosp_admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Karthikeyan M S"
    assert data["role_code"] == "DOCTOR"
    assert data["credential_number"] == "TN-MCI-99881"
    assert data["verification_status"] in ("VERIFIED", "PENDING")
    
    # Verify user detail endpoint
    user_id = data["user_id"]
    detail = client.get(f"/api/v1/hospital/users/{user_id}?hospital_id=hosp-kedar", headers=hosp_admin_headers)
    assert detail.status_code == 200
    assert detail.json()["email"] == "dr.karthik.s@kedarhospital.in"

def test_create_nurse_and_trainee(hosp_admin_headers):
    # Nurse
    nurse_payload = {
        "first_name": "Anitha",
        "last_name": "Venkatesh",
        "email": "anitha.nurse@kedarhospital.in",
        "mobile": "+91 98402 77889",
        "gender": "Female",
        "employee_id": "EMP-NUR-902",
        "designation": "Staff Nurse (ICU)",
        "role_code": "NURSE",
        "department_id": "dept-k-01",
        "credential_number": "TNNMC-RN-99441",
        "credential_authority": "Tamil Nadu Nursing Council",
        "role_metadata": {
            "qualification": "B.Sc (Nursing)",
            "ward": "ICU Bed 1-6",
            "shift": "NIGHT"
        },
        "hospital_id": "hosp-kedar"
    }
    res_nur = client.post("/api/v1/hospital/users", json=nurse_payload, headers=hosp_admin_headers)
    assert res_nur.status_code == 200
    assert res_nur.json()["role_code"] == "NURSE"

    # Trainee
    trainee_payload = {
        "first_name": "Dinesh",
        "last_name": "K",
        "email": "dinesh.intern@kedarhospital.in",
        "mobile": "+91 98403 88990",
        "employee_id": "TRN-INT-903",
        "designation": "CRRI Medical Intern",
        "role_code": "TRAINEE",
        "department_id": "dept-k-01",
        "role_metadata": {
            "training_type": "INTERN_CRRI",
            "institution": "Stanley Medical College",
            "qualification": "MBBS (Intern)",
            "supervisor_name": "Dr. Arun Kumar"
        },
        "hospital_id": "hosp-kedar"
    }
    res_trn = client.post("/api/v1/hospital/users", json=trainee_payload, headers=hosp_admin_headers)
    assert res_trn.status_code == 200
    assert res_trn.json()["role_code"] == "TRAINEE"

def test_super_admin_privilege_escalation_blocked(hosp_admin_headers):
    payload = {
        "first_name": "Hacker",
        "last_name": "Admin",
        "email": "hacker.admin@kedarhospital.in",
        "mobile": "+91 98409 99999",
        "designation": "Platform Super Admin",
        "role_code": "SUPER_ADMIN",
        "hospital_id": "hosp-kedar"
    }
    res = client.post("/api/v1/hospital/users", json=payload, headers=hosp_admin_headers)
    assert res.status_code == 403
    assert "Super Admin" in res.json()["detail"]

def test_update_user_and_audit_event_generation(hosp_admin_headers):
    user_id = "u-doc-101"
    update_payload = {
        "designation": "Director of Cardiology & Electrophysiology",
        "custom_permissions": ["consultation.write", "prescription.sign", "referral.manage", "cardiac.lab.approve"]
    }
    res = client.put(f"/api/v1/hospital/users/{user_id}?hospital_id=hosp-kedar", json=update_payload, headers=hosp_admin_headers)
    assert res.status_code == 200
    assert res.json()["designation"] == "Director of Cardiology & Electrophysiology"

    # Check that audit log was created
    audit_res = client.get(f"/api/v1/hospital/users/audit?target_user_id={user_id}&hospital_id=hosp-kedar", headers=hosp_admin_headers)
    assert audit_res.status_code == 200
    audits = audit_res.json()
    assert len(audits) >= 1
    assert any(a["action_type"] in ("PERMISSIONS_UPDATED", "ROLE_CHANGED", "USER_UPDATED") for a in audits)

def test_non_destructive_status_transitions(hosp_admin_headers):
    user_id = "u-doc-102"
    
    # 1. Suspend account
    res_susp = client.post(
        f"/api/v1/hospital/users/{user_id}/status?hospital_id=hosp-kedar",
        json={"status": "SUSPENDED", "reason": "Annual Credential Audit Pending"},
        headers=hosp_admin_headers
    )
    assert res_susp.status_code == 200
    assert res_susp.json()["employment_status"] == "SUSPENDED"
    assert res_susp.json()["login_enabled"] is False

    # 2. Reactivate account
    res_act = client.post(
        f"/api/v1/hospital/users/{user_id}/status?hospital_id=hosp-kedar",
        json={"status": "ACTIVE", "reason": "Credentials re-verified and cleared"},
        headers=hosp_admin_headers
    )
    assert res_act.status_code == 200
    assert res_act.json()["employment_status"] == "ACTIVE"
    assert res_act.json()["login_enabled"] is True

def test_security_management_actions(hosp_admin_headers):
    user_id = "u-nur-201"
    
    # 1. Toggle Login
    res_toggle = client.post(
        f"/api/v1/hospital/users/{user_id}/security?hospital_id=hosp-kedar",
        json={"action": "TOGGLE_LOGIN"},
        headers=hosp_admin_headers
    )
    assert res_toggle.status_code == 200
    assert res_toggle.json()["status"] == "SUCCESS"

    # 2. Unlock Account
    res_unlock = client.post(
        f"/api/v1/hospital/users/{user_id}/security?hospital_id=hosp-kedar",
        json={"action": "UNLOCK"},
        headers=hosp_admin_headers
    )
    assert res_unlock.status_code == 200
    assert res_unlock.json()["details"]["failed_login_attempts"] == 0

    # 3. Trigger Password Reset
    res_reset = client.post(
        f"/api/v1/hospital/users/{user_id}/security?hospital_id=hosp-kedar",
        json={"action": "RESET_PASSWORD"},
        headers=hosp_admin_headers
    )
    assert res_reset.status_code == 200
    assert res_reset.json()["details"]["password_reset_dispatched"] is True

    # 4. Revoke Sessions
    res_revoke = client.post(
        f"/api/v1/hospital/users/{user_id}/security?hospital_id=hosp-kedar",
        json={"action": "REVOKE_SESSIONS"},
        headers=hosp_admin_headers
    )
    assert res_revoke.status_code == 200
    assert res_revoke.json()["details"]["active_sessions_revoked"] is True

def test_access_review_summary(hosp_admin_headers):
    res = client.get("/api/v1/hospital/users/access-review?hospital_id=hosp-kedar", headers=hosp_admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert "credential_alerts" in data
    assert "inactive_accounts" in data
    assert "locked_accounts" in data
    assert "pending_invitations" in data
    
    metrics = data["metrics"]
    assert metrics["total_staff_count"] >= 5
    assert len(data["credential_alerts"]) >= 1

def test_roles_catalog(hosp_admin_headers):
    res = client.get("/api/v1/hospital/users/roles-catalog?hospital_id=hosp-kedar", headers=hosp_admin_headers)
    assert res.status_code == 200
    roles = res.json()
    assert len(roles) >= 10
    role_codes = [r["code"] for r in roles]
    assert "DOCTOR" in role_codes
    assert "NURSE" in role_codes
    assert "RECEPTIONIST" in role_codes
    assert "TRAINEE" in role_codes
    assert "LAB_TECHNICIAN" in role_codes
    assert "PHARMACIST" in role_codes

def test_pending_invitation_lifecycle(hosp_admin_headers):
    # Resend invitation
    res_resend = client.post(
        "/api/v1/hospital/users/invitations/inv-doc-anand/resend?hospital_id=hosp-kedar",
        headers=hosp_admin_headers
    )
    assert res_resend.status_code == 200
    assert res_resend.json()["resend_count"] >= 1

    # Cancel invitation
    res_cancel = client.post(
        "/api/v1/hospital/users/invitations/inv-nur-rekha/cancel?hospital_id=hosp-kedar",
        headers=hosp_admin_headers
    )
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "CANCELLED"
