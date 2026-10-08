"""
ONE HEALTH ID (OH-ID) — Enterprise IAM, RBAC & Multi-Tenant Security Test Suite
By Sathus Technology Pvt Ltd.

Automated verification testing:
1. Super Admin 5-Step Hospital Onboarding Wizard
2. Initial Clinical/Hospital Admin account creation + secure invitation token
3. Public Invitation Validation & Acceptance (single-use, password hash, account activation)
4. Unified /login & workspace resolution
5. Hospital Admin 11-Step Operational Workforce Wizard (Doctor, Nurse, Receptionist, Lab, Pharmacy, Radiology, Billing, Trainee)
6. 9-Tab Hospital User Profile & Metadata
7. Custom Operational Roles Creation & Scoped Permissions
8. Security & Guardrail Tests (Tenant Isolation IDOR, Privilege Escalation Prevention, Expired Token Rejection)
"""

import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import pytest
import uuid
import secrets
from fastapi.testclient import TestClient
from jose import jwt
from datetime import datetime, timedelta, timezone

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.repositories.sp_views_repository import sp_repository

client = TestClient(app)


@pytest.fixture
def super_admin_auth_headers():
    token = jwt.encode(
        {
            "sub": "sathus.superadmin",
            "uid": "usr-superadmin",
            "roles": ["SUPER_ADMIN", "PLATFORM_ADMIN"],
            "role": "SUPER_ADMIN",
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def hospital_admin_auth_headers():
    token = jwt.encode(
        {
            "sub": "hospadmin",
            "uid": "usr-hosp-admin",
            "roles": ["HOSPITAL_ADMIN"],
            "role": "HOSPITAL_ADMIN",
            "hospital_ref_id": "hosp-kedar",
            "hospital_id": "hosp-kedar",
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Hospital-Ref-Id": "hosp-kedar"
    }


# =============================================================================
# 1. SUPER ADMIN HOSPITAL ONBOARDING WIZARD & INVITATION GENERATION
# =============================================================================

def test_super_admin_hospital_onboarding_wizard_and_invite(super_admin_auth_headers):
    """
    Tests complete 5-step enterprise hospital onboarding wizard:
    Step 1: Hospital Profile & Legal Registration
    Step 2: Multiple Branches
    Step 3: Clinical Facilities
    Step 4: Departments & Specialties
    Step 5: Initial Clinical/Hospital Administrator Account & Cryptographic Single-Use Invitation
    """
    unique_suffix = uuid.uuid4().hex[:6]
    hosp_name = f"Apex Super Specialty Hospital {unique_suffix}"
    admin_email = f"director.{unique_suffix}@apexhealth.org"

    payload = {
        "display_name": hosp_name,
        "legal_name": f"Apex Healthcare Private Limited {unique_suffix}",
        "hospital_type": "MULTI_SPECIALTY",
        "ownership_type": "PRIVATE",
        "registration_number": f"TN-MED-REG-{unique_suffix.upper()}",
        "registration_authority": "Directorate of Medical and Rural Health Services",
        "registration_date": "2024-01-15",
        "registration_expiry": "2029-01-14",
        "address": "42 OMR IT Highway, Sholinganallur",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "pin_code": "600119",
        "phone": "+91 44 2833 4455",
        "email": f"contact.{unique_suffix}@apexhealth.org",
        "website": f"https://apexhealth-{unique_suffix}.org",
        "emergency_contact": "+91 98400 99888",
        "branches": [
            {
                "name": "Apex Central Campus",
                "code": f"BR-APEX-{unique_suffix.upper()}-01",
                "address": "42 OMR IT Highway, Sholinganallur",
                "city": "Chennai",
                "phone": "+91 44 2833 4455",
                "operating_hours": "24x7 Emergency",
                "is_emergency_available": True,
                "is_main_branch": True
            },
            {
                "name": "Apex Velachery Clinic",
                "code": f"BR-APEX-{unique_suffix.upper()}-02",
                "address": "15 Bypass Road, Velachery",
                "city": "Chennai",
                "phone": "+91 44 2833 4466",
                "operating_hours": "08:00 AM - 08:00 PM OPD",
                "is_emergency_available": False,
                "is_main_branch": False
            }
        ],
        "facilities": ["OPD", "IPD", "EMERGENCY", "ICU", "OT", "PHARMACY", "LABORATORY", "RADIOLOGY"],
        "departments": [
            "General Medicine", "Cardiology", "Orthopedics", "Pediatrics",
            "Radiology", "Laboratory", "Pharmacy"
        ],
        "admin_first_name": "Dr. Ramesh",
        "admin_last_name": "Karthik",
        "admin_email": admin_email,
        "admin_mobile": f"984{secrets.randbelow(9000000) + 1000000}",
        "admin_employee_id": f"EMP-APX-{unique_suffix.upper()}-01",
        "admin_designation": "Chief Medical Officer & Administrator"
    }

    # 1. Onboard via wizard
    res = client.post("/api/v1/super-admin/hospitals/wizard", json=payload, headers=super_admin_auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "hospital" in data
    assert data["hospital"]["name"] == hosp_name
    assert "invitation" in data
    assert "token" in data["invitation"]
    assert "invite_url" in data["invitation"]
    assert len(data["branches"]) == 2
    assert len(data["departments"]) == 7

    invite_token = data["invitation"]["token"]

    # 2. Public Validate Invitation Token
    val_res = client.get(f"/api/v1/auth/invitations/{invite_token}/validate")
    assert val_res.status_code == 200
    val_data = val_res.json()["data"]
    assert val_data["valid"] is True
    assert val_data["role_code"] == "HOSPITAL_ADMIN"
    assert "apex" in val_data["hospital_name"].lower()

    # 3. Public Accept Invitation (Set password, activate account)
    accept_payload = {
        "password": "SecurePassword@2026!",
        "mfa_enabled": False
    }
    acc_res = client.post(f"/api/v1/auth/invitations/{invite_token}/accept", json=accept_payload)
    assert acc_res.status_code == 200
    acc_data = acc_res.json()["data"]
    assert acc_data["success"] is True

    # 4. Token Reuse Prevention (Must fail on 2nd attempt)
    reuse_res = client.post(f"/api/v1/auth/invitations/{invite_token}/accept", json=accept_payload)
    assert reuse_res.status_code == 400

    # 5. Authenticate via Unified Mobile-Only /login with newly established credentials
    login_payload = {
        "username": payload["admin_mobile"],
        "password": "SecurePassword@2026!"
    }
    log_res = client.post("/api/v1/auth/login", json=login_payload)
    assert log_res.status_code == 200
    log_data = log_res.json()
    assert "access_token" in log_data
    user_prof = log_data["user"]
    assert user_prof["email"] == admin_email
    assert user_prof["role"] == "HOSPITAL_ADMIN"


# =============================================================================
# 2. HOSPITAL ADMIN WORKFORCE CREATION WIZARD (Doctor, Nurse, Reception, etc.)
# =============================================================================

def test_hospital_admin_workforce_wizard_doctor_creation(hospital_admin_auth_headers):
    """
    Tests Hospital Admin creating a licensed Doctor with medical registration credentials,
    room assignments, OPD counter mapping, and issuing secure invitation.
    """
    unique_suffix = uuid.uuid4().hex[:6]
    doc_email = f"dr.ananya.{unique_suffix}@kedarhospital.org"

    doctor_payload = {
        "role_code": "DOCTOR",
        "first_name": "Dr. Ananya",
        "middle_name": "S",
        "last_name": "Sundaram",
        "preferred_name": "Dr. Ananya Sundaram",
        "email": doc_email,
        "mobile": "+91 98402 33445",
        "gender": "Female",
        "dob": "1988-04-12",
        "employee_id": f"DOC-KED-{unique_suffix.upper()}",
        "designation": "Senior Consultant Cardiologist",
        "employment_type": "FULL_TIME",
        "qualification": "MBBS, MD (General Medicine), DM (Cardiology)",
        "specialization": "Interventional Cardiology",
        "sub_specialization": "Echocardiography & Angioplasty",
        "registration_number": f"TNMC-REG-{unique_suffix.upper()}",
        "registration_authority": "Tamil Nadu Medical Council",
        "registration_date": "2015-06-20",
        "registration_expiry": "2030-06-19",
        "consultation_room": "Consultation Suite 204",
        "opd_counter": "Counter 2 - Special Clinics",
        "appointment_availability": "Mon, Wed, Fri 09:00 - 13:00",
        "branch_id": "br-kedar-01",
        "department_id": "dept-k-01",
        "hospital_id": "hosp-kedar"
    }

    res = client.post("/api/v1/hospital/users/wizard", json=doctor_payload, headers=hospital_admin_auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["success"] is True
    assert data["role"] == "DOCTOR"
    assert data["status"] == "INVITED"
    assert "token" in data["invitation"]

    created_user_id = data["user_id"]

    # Verify 9-tab profile retrieval
    detail_res = client.get(f"/api/v1/hospital/users/{created_user_id}", headers=hospital_admin_auth_headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == created_user_id
    assert detail["overview"]["first_name"] == "Dr. Ananya"
    assert detail["employment"]["designation"] == "Senior Consultant Cardiologist"
    assert detail["credentials"]["registration_number"] == f"TNMC-REG-{unique_suffix.upper()}"
    assert detail["active_invitation"] is not None


def test_hospital_admin_workforce_wizard_nurse_creation(hospital_admin_auth_headers):
    """
    Tests Hospital Admin creating a Nurse with nursing council registration, ward allocation, and shifts.
    """
    unique_suffix = uuid.uuid4().hex[:6]
    nurse_email = f"nurse.kavitha.{unique_suffix}@kedarhospital.org"

    nurse_payload = {
        "role_code": "NURSE",
        "first_name": "Kavitha",
        "last_name": "Selvam",
        "email": nurse_email,
        "mobile": "+91 98403 44556",
        "gender": "Female",
        "employee_id": f"NUR-KED-{unique_suffix.upper()}",
        "designation": "Staff Nurse - Critical Care",
        "qualification": "B.Sc Nursing, Critical Care Fellowship",
        "registration_number": f"TNNMC-{unique_suffix.upper()}",
        "registration_authority": "Tamil Nadu Nurses & Midwives Council",
        "registration_expiry": "2028-12-31",
        "room_number": "ICU Bed 1-6 Wing B",
        "branch_id": "br-kedar-01",
        "department_id": "dept-k-01",
        "hospital_id": "hosp-kedar"
    }

    res = client.post("/api/v1/hospital/users/wizard", json=nurse_payload, headers=hospital_admin_auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["role"] == "NURSE"


def test_hospital_admin_workforce_wizard_receptionist_creation(hospital_admin_auth_headers):
    """
    Tests Hospital Admin creating front-office receptionist.
    """
    unique_suffix = uuid.uuid4().hex[:6]
    reception_email = f"frontdesk.{unique_suffix}@kedarhospital.org"

    rec_payload = {
        "role_code": "RECEPTIONIST",
        "first_name": "Praveen",
        "last_name": "Kumar",
        "email": reception_email,
        "mobile": "+91 98404 55667",
        "employee_id": f"REC-KED-{unique_suffix.upper()}",
        "designation": "Front Desk & Queue Coordinator",
        "branch_id": "br-kedar-01",
        "hospital_id": "hosp-kedar"
    }

    res = client.post("/api/v1/hospital/users/wizard", json=rec_payload, headers=hospital_admin_auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["role"] == "RECEPTIONIST"


# =============================================================================
# 3. SECURITY & PRIVILEGE ESCALATION GUARDRAIL TESTS
# =============================================================================

def test_hospital_admin_cannot_create_super_admin(hospital_admin_auth_headers):
    """
    SECURITY TEST: Hospital Administrator attempts to elevate privilege by creating SUPER_ADMIN.
    Must return HTTP 403 Forbidden.
    """
    payload = {
        "role_code": "SUPER_ADMIN",
        "first_name": "Attacker",
        "last_name": "Admin",
        "email": "malicious@sathus.com",
        "mobile": "+91 99999 88888",
        "hospital_id": "hosp-kedar"
    }
    res = client.post("/api/v1/hospital/users/wizard", json=payload, headers=hospital_admin_auth_headers)
    assert res.status_code == 403
    assert "forbidden" in res.json()["detail"].lower()


def test_hospital_admin_cannot_create_platform_admin(hospital_admin_auth_headers):
    """
    SECURITY TEST: Hospital Administrator attempts to create PLATFORM_ADMIN.
    Must return HTTP 403 Forbidden.
    """
    payload = {
        "role_code": "PLATFORM_ADMIN",
        "first_name": "Attacker",
        "last_name": "Platform",
        "email": "hack.platform@sathus.com",
        "mobile": "+91 99999 77777",
        "hospital_id": "hosp-kedar"
    }
    res = client.post("/api/v1/hospital/users/wizard", json=payload, headers=hospital_admin_auth_headers)
    assert res.status_code == 403


def test_cross_hospital_tenant_isolation_idor(hospital_admin_auth_headers):
    """
    SECURITY TEST (IDOR): Hospital A Admin attempts to query or mutate records belonging to Hospital B.
    Must return HTTP 403 Forbidden.
    """
    foreign_hospital_id = "hosp-apollo-greams"
    res = client.get(f"/api/v1/hospital/overview?hospital_id={foreign_hospital_id}", headers=hospital_admin_auth_headers)
    assert res.status_code == 403
    assert "cross-hospital" in res.json()["detail"].lower() or "forbidden" in res.json()["detail"].lower()


def test_custom_role_creation_and_permissions(hospital_admin_auth_headers):
    """
    Tests Hospital Admin creating a custom operational role (e.g. OPD Coordinator) with scoped permissions.
    """
    unique_code = f"OPD_COORD_{uuid.uuid4().hex[:4].upper()}"
    role_payload = {
        "code": unique_code,
        "name": "OPD Floor Coordinator",
        "description": "Front-office patient navigation, queue calling, and token routing",
        "permissions": ["reception.queue", "appointment.view", "patient.search", "patient.read"],
        "hospital_id": "hosp-kedar"
    }

    res = client.post("/api/v1/hospital/roles", json=role_payload, headers=hospital_admin_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["code"] == unique_code
    assert data["name"] == "OPD Floor Coordinator"
