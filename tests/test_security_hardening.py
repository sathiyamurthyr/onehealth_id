"""
=============================================================================
OH-ID Production Security Hardening & Penetration Verification Test Suite
=============================================================================
Validates:
1. Secret and credential isolation
2. Password bcrypt hashing & non-plaintext storage
3. Unauthenticated request rejection (401 Unauthorized)
4. Role-based Access Control (RBAC) & privilege escalation blocking (403 Forbidden)
5. Insecure Direct Object Reference (IDOR) & Tenant isolation
6. Sliding-window rate limiting & abuse prevention (429 Too Many Requests)
7. Security headers enforcement (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
8. CORS restriction (blocks untrusted origins)
9. Error & debug information masking (no raw SQL/stack traces)
10. Sensitive PII masking on unauthenticated QR verification
=============================================================================
"""

import pytest
import bcrypt
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import verify_password, get_password_hash
from backend.app.core.rate_limit import SlidingWindowRateLimiter
from backend.app.database.session import get_readonly_cursor

client = TestClient(app)

@pytest.fixture(scope="module")
def admin_token():
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def doctor_token():
    res = client.post("/api/v1/auth/login", json={"username": "dr.senthil", "password": "doctor123"})
    assert res.status_code == 200, f"Doctor login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def receptionist_token():
    res = client.post("/api/v1/auth/login", json={"username": "receptionist", "password": "rec123"})
    assert res.status_code == 200, f"Receptionist login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def patient_token():
    res = client.post("/api/v1/auth/login", json={"username": "9840199999", "password": "password123"})
    assert res.status_code == 200, f"Patient login failed: {res.text}"
    return res.json()["access_token"]


# =============================================================================
# PHASE 4 & 14: AUTHENTICATION & PASSWORD STORAGE SECURITY
# =============================================================================

def test_password_hashing_bcrypt_enforcement():
    """Verify that verify_password only works with salted bcrypt hashes, rejecting plaintext."""
    pwd = "EnterprisePassword2026!"
    hashed = get_password_hash(pwd)
    
    assert hashed.startswith("$2b$12$"), "Hash must be bcrypt with work factor 12"
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False
    
    # Insecure plaintext fallback must be disabled
    assert verify_password(pwd, pwd) is False, "Direct plaintext match must be rejected"

def test_database_users_passwords_are_all_bcrypt_hashed():
    """Audit the database users table to ensure zero plaintext passwords exist in production."""
    with get_readonly_cursor() as cur:
        cur.execute("SELECT username, password_hash FROM oh_id.users;")
        rows = cur.fetchall()
        assert len(rows) > 0, "Users table must not be empty"
        for user in rows:
            p_hash = user["password_hash"]
            assert p_hash.startswith(("$2b$", "$2a$")), (
                f"User '{user['username']}' has insecure non-bcrypt password hash in database: {p_hash[:10]}..."
            )


# =============================================================================
# PHASE 5 & 6: AUTHORIZATION, RBAC & PRIVILEGE ESCALATION BLOCKING
# =============================================================================

def test_unauthenticated_requests_strictly_rejected():
    """Verify unauthenticated calls to protected operational APIs are rejected with 401."""
    protected_endpoints = [
        ("GET", "/api/v1/admin/audit-logs"),
        ("GET", "/api/v1/admin/departments"),
        ("GET", "/api/v1/billing/invoices"),
        ("POST", "/api/v1/clinical/consultations"),
        ("GET", "/api/v1/appointments"),
        ("POST", "/api/v1/appointments"),
        ("GET", "/api/v1/patients"),
        ("POST", "/api/v1/doctors")
    ]
    for method, path in protected_endpoints:
        if method == "GET":
            res = client.get(path)
        else:
            res = client.post(path, json={})
        assert res.status_code == 401, f"Expected 401 for unauthenticated {method} {path}, got {res.status_code}"

def test_patient_cannot_access_administrative_apis(patient_token):
    """Vertical Privilege Escalation: Verify patient cannot query administrative audit logs or departments."""
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    res = client.get("/api/v1/admin/audit-logs", headers=headers)
    assert res.status_code == 403, f"Expected 403 for patient on audit-logs, got {res.status_code}"
    
    res = client.get("/api/v1/admin/departments", headers=headers)
    assert res.status_code == 403, f"Expected 403 for patient on admin departments, got {res.status_code}"

def test_receptionist_cannot_manage_clinical_consultations(receptionist_token):
    """Role Boundary: Receptionist cannot create doctor clinical consultations."""
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    payload = {
        "appointment_id": "appt-001",
        "patient_id": "P-1001",
        "doctor_id": "doc-001",
        "diagnosis": "Unchecked medical condition",
        "symptoms": "Fever",
        "prescription": []
    }
    res = client.post("/api/v1/clinical/consultations", json=payload, headers=headers)
    assert res.status_code == 403, f"Expected 403 for receptionist creating consultation, got {res.status_code}"

def test_doctor_cannot_create_or_delete_staff(doctor_token):
    """Role Boundary: Doctor cannot provision new doctor profiles."""
    headers = {"Authorization": f"Bearer {doctor_token}"}
    payload = {
        "id": "doc-rogue",
        "name": "Dr. Rogue",
        "specialty": "Cardiology",
        "hospital_id": "hosp-kedar"
    }
    res = client.post("/api/v1/doctors", json=payload, headers=headers)
    assert res.status_code == 403, f"Expected 403 for doctor provisioning staff, got {res.status_code}"


# =============================================================================
# PHASE 5: IDOR & TENANT ISOLATION
# =============================================================================

def test_patient_idor_cannot_access_other_patient_invoices(patient_token, admin_token):
    """IDOR Prevention: Patient A cannot query another patient's billing invoice."""
    # First get an invoice from the system as admin
    admin_hdr = {"Authorization": f"Bearer {admin_token}"}
    inv_res = client.get("/api/v1/billing/invoices", headers=admin_hdr)
    assert inv_res.status_code == 200
    invoices = inv_res.json()
    assert len(invoices) > 0, "Need at least one invoice in database"
    
    target_invoice = invoices[0]
    invoice_id = target_invoice["id"]
    invoice_patient_id = target_invoice["patient_id"]
    
    # Patient ramesh is P-1001. If the target invoice belongs to someone else, ramesh must be blocked
    patient_hdr = {"Authorization": f"Bearer {patient_token}"}
    p_inv_res = client.get(f"/api/v1/billing/invoices/{invoice_id}", headers=patient_hdr)
    
    # If the invoice does not belong to ramesh (P-1001), it MUST return 403 Forbidden
    if invoice_patient_id != "P-1001":
        assert p_inv_res.status_code == 403, (
            f"IDOR Vulnerability! Patient accessed invoice {invoice_id} of patient {invoice_patient_id}"
        )


# =============================================================================
# PHASE 10: CORS CONFIGURATION
# =============================================================================

def test_cors_rejects_untrusted_origins():
    """Verify unauthorized external origins do not receive CORS allow headers."""
    untrusted_origin = "https://evil-phishing-attacker.com"
    headers = {
        "Origin": untrusted_origin,
        "Access-Control-Request-Method": "POST"
    }
    res = client.options("/api/v1/auth/login", headers=headers)
    allow_origin = res.headers.get("access-control-allow-origin")
    assert allow_origin != untrusted_origin, f"Untrusted origin {untrusted_origin} was reflected in CORS header!"
    assert allow_origin != "*", "Wildcard '*' must never be returned for authenticated APIs"

def test_cors_permits_authorized_local_origin():
    """Verify authorized frontend origin is allowed."""
    trusted_origin = "http://localhost:3000"
    headers = {
        "Origin": trusted_origin,
        "Access-Control-Request-Method": "POST"
    }
    res = client.options("/api/v1/auth/login", headers=headers)
    assert res.headers.get("access-control-allow-origin") == trusted_origin


# =============================================================================
# PHASE 11: SECURITY HEADERS ENFORCEMENT
# =============================================================================

def test_security_headers_present_on_all_responses():
    """Verify critical defensive headers are present on API responses."""
    res = client.get("/health")
    assert res.status_code == 200
    
    headers = res.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert "Strict-Transport-Security" in headers
    assert "max-age=31536000" in headers["Strict-Transport-Security"]
    assert "Content-Security-Policy" in headers
    assert "default-src 'self'" in headers["Content-Security-Policy"]
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


# =============================================================================
# PHASE 12: ERROR & DEBUG INFORMATION MASKING
# =============================================================================

def test_error_responses_mask_internal_stack_traces_and_sql():
    """Verify application returns generic safe error messages without leaking database internals."""
    res = client.get("/api/v1/patients/nonexistent-id-xyz")
    assert res.status_code in (401, 404)
    detail = res.json().get("detail", "")
    assert "Traceback" not in detail
    assert "SELECT" not in detail
    assert "psycopg2" not in detail
    assert "password" not in detail.lower()


# =============================================================================
# PHASE 13: SLIDING-WINDOW RATE LIMITING
# =============================================================================

def test_sliding_window_rate_limiter_unit_behavior():
    """Directly test SlidingWindowRateLimiter to verify sliding window threshold and Retry-After calculation."""
    limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=2)
    test_key = "unit-test-ip"
    limiter.reset(test_key)
    
    # 3 allowed requests
    limiter.check(test_key)
    limiter.check(test_key)
    limiter.check(test_key)
    
    # 4th request must trigger HTTP 429
    with pytest.raises(Exception) as exc_info:
        limiter.check(test_key)
    
    assert exc_info.value.status_code == 429
    assert "Too many requests" in exc_info.value.detail
    assert "Retry-After" in exc_info.value.headers


# =============================================================================
# PHASE 7 & 8: PII PROTECTION ON PUBLIC APIS
# =============================================================================

def test_qr_verification_masks_pii_for_unauthenticated_requests(admin_token):
    """Verify QR verification masks patient demographics for anonymous kiosk scanners."""
    # Obtain a valid token from patient
    res = client.get("/api/v1/patients", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    patients = res.json()
    assert len(patients) > 0
    patient = patients[0]
    qr_token = patient.get("qr_token")
    if not qr_token:
        rot_res = client.post(f"/api/v1/patients/{patient['id']}/qr/rotate", headers={"Authorization": f"Bearer {admin_token}"})
        assert rot_res.status_code == 200
        qr_token = rot_res.json()["qr_token"]

    # Use clean client without authenticated cookies to simulate anonymous kiosk scanner
    anon_client = TestClient(app)
    verify_res = anon_client.get(f"/api/v1/patients/verify-qr/{qr_token}")
    assert verify_res.status_code == 200
    data = verify_res.json()
    
    assert data.get("address") == "[Protected demographic]"
    assert data.get("phone") is None or "*" in str(data.get("phone")), "Phone number must be None or masked"
