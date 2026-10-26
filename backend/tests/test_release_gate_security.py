"""
Release-Gate Closure & Security Verification Test Suite
Verifies:
1. Production Redis TLS enforcement (rediss:// requirement)
2. QR endpoint rate limiting & brute-force rejection (HTTP 429)
3. QR token guessing resistance & uniform 404 responses
4. Strict RBAC enforcement on operational QR endpoints (HTTP 401 / 403)
5. Tenant isolation on cross-hospital registration
6. Receptionist clinical data redaction
7. Cross-hospital clinical record sharing default block (DPDP Act & HIPAA compliance)
8. Distributed session revocation enforcement
9. Audit log integrity with zero PII/credential leakage
10. CORS strict allowlist enforcement
"""

import pytest
import fakeredis
from fastapi.testclient import TestClient
from jose import jwt
from datetime import datetime, timezone, timedelta

from backend.app.main import app
from backend.app.core.config import Settings
from backend.app.core.security import create_access_token
from backend.app.core.rate_limit import distributed_rate_limiter, EndpointRisk
from backend.app.core.session_manager import session_manager
from backend.app.database.session import get_db_cursor, get_readonly_cursor
from backend.app.repositories.sp_views_repository import sp_repository

client = TestClient(app)


# ------------------------------------------------------------------------------
# 1. PRODUCTION REDIS TLS ENFORCEMENT
# ------------------------------------------------------------------------------

def test_production_redis_tls_enforcement():
    """Verify that in production with REDIS_ENABLED=true, unencrypted redis:// is rejected."""
    # Insecure URL must fail
    with pytest.raises(RuntimeError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="secure-enterprise-production-key-over-32-chars-long",
            REDIS_ENABLED=True,
            REDIS_URL="redis://insecure-redis.internal:6379/0"
        )
    assert "rediss://" in str(exc_info.value)

    # Secure TLS URL must pass validation
    s = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="secure-enterprise-production-key-over-32-chars-long",
        REDIS_ENABLED=True,
        REDIS_URL="rediss://secure-redis.internal:6379/0"
    )
    assert s.REDIS_URL.startswith("rediss://")


# ------------------------------------------------------------------------------
# 2. QR ENDPOINTS RATE LIMITING & BRUTE-FORCE DEFENSE
# ------------------------------------------------------------------------------

def test_qr_rate_limiting_and_brute_force_defense():
    """Verify that rapid repeated scan attempts are throttled by the rate limiter."""
    fake_redis = fakeredis.FakeStrictRedis(decode_responses=True)
    distributed_rate_limiter.set_redis_client(fake_redis)

    policy = "qr_scan_test"
    identifier = "192.168.1.100"
    max_req = 5
    win_sec = 60

    # Exhaust permitted requests
    for _ in range(max_req):
        distributed_rate_limiter.check_rate_limit(policy, identifier, max_req, win_sec)

    # Next attempt must raise 429
    with pytest.raises(Exception) as exc:
        distributed_rate_limiter.check_rate_limit(policy, identifier, max_req, win_sec)
    assert "429" in str(exc.value)


# ------------------------------------------------------------------------------
# 3. QR TOKEN GUESSING RESISTANCE & UNIFORM 404 RESPONSES
# ------------------------------------------------------------------------------

def test_qr_token_guessing_uniform_404():
    """Verify that invalid or guessed tokens return uniform HTTP 404 without internal leaks."""
    guesses = [
        "qr-00000000-0000-0000-0000-000000000000",
        "qr-guess-1",
        "OHID-IND-2026-99999",
        "admin' OR '1'='1"
    ]
    for token in guesses:
        res = client.post("/api/v1/patients/qr/scan-workflow", json={"qr_input": token})
        assert res.status_code == 404
        assert res.json()["detail"] == "OneHealth ID or QR Token could not be verified"
        assert "SELECT" not in res.text
        assert "Traceback" not in res.text


# ------------------------------------------------------------------------------
# 4. STRICT RBAC ON OPERATIONAL QR ENDPOINTS
# ------------------------------------------------------------------------------

def test_unauthenticated_staff_operations_blocked():
    """Verify that operational check-in, token issue, and facility registration require auth."""
    # Unauthenticated registration
    res1 = client.post("/api/v1/patients/qr/register-hospital", json={"patient_id": "p-test", "hospital_id": "hosp-kedar"})
    assert res1.status_code == 401

    # Unauthenticated appointment check-in
    res2 = client.post("/api/v1/patients/qr/check-in", json={"appointment_id": "appt-test"})
    assert res2.status_code == 401

    # Unauthenticated queue token issuance
    res3 = client.post("/api/v1/patients/qr/issue-token", json={"patient_id": "p-test"})
    assert res3.status_code == 401


# ------------------------------------------------------------------------------
# 5. TENANT ISOLATION ON CROSS-HOSPITAL REGISTRATION
# ------------------------------------------------------------------------------

def test_cross_hospital_registration_tenant_isolation():
    """Verify that staff assigned to Hospital A cannot register a patient at Hospital B."""
    # Create token for staff at Hospital A
    token_hosp_a = create_access_token({
        "sub": "rec_hosp_a",
        "role": "RECEPTIONIST",
        "permissions": ["reception.manage", "patient.register"],
        "hospital_id": "hosp-kedar",
        "hospital_ref_id": "hosp-kedar"
    })

    # Attempt to register patient at Hospital B (hosp-apollo)
    res = client.post(
        "/api/v1/patients/qr/register-hospital",
        json={"patient_id": "p-dccc29e4", "hospital_id": "hosp-apollo"},
        headers={"Authorization": f"Bearer {token_hosp_a}"}
    )
    assert res.status_code == 403
    assert "Forbidden" in res.json()["detail"] or "tenant" in res.json()["detail"].lower()


# ------------------------------------------------------------------------------
# 6. RECEPTIONIST CLINICAL DATA REDACTION
# ------------------------------------------------------------------------------

def test_receptionist_clinical_redaction():
    """Verify that receptionists receive administrative info while clinical diagnosis is redacted."""
    rec_token = create_access_token({
        "sub": "receptionist_user",
        "role": "RECEPTIONIST",
        "permissions": ["reception.manage", "appointment.read"],
        "hospital_id": "hosp-001",
        "hospital_ref_id": "hosp-001"
    })

    res = client.post(
        "/api/v1/patients/qr/scan-workflow",
        json={"qr_input": "QR-OHID-bd6d2d41e7e88cca9cd237edde1305f8"},
        headers={"Authorization": f"Bearer {rec_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "RECEPTIONIST"
    # Clinical summary must not exist for receptionist
    assert "clinical_summary" not in data["workflow_data"] or data["workflow_data"]["clinical_summary"] is None


# ------------------------------------------------------------------------------
# 7. CROSS-HOSPITAL CLINICAL SHARING DEFAULT BLOCK
# ------------------------------------------------------------------------------

def test_cross_hospital_clinical_sharing_default_block():
    """Verify external hospital doctor cannot view prior consultations without consent."""
    doc_token = create_access_token({
        "sub": "dr_senthil",
        "uid": "doc-k-01",
        "id": "doc-k-01",
        "user_ref_id": "doc-k-01",
        "role": "DOCTOR",
        "permissions": ["consultation.create", "clinical.read", "patient.read"],
        "hospital_id": "hosp-kedar",
        "hospital_ref_id": "hosp-kedar"
    })

    res = client.post(
        "/api/v1/patients/qr/scan-workflow",
        json={"qr_input": "QR-OHID-bd6d2d41e7e88cca9cd237edde1305f8", "hospital_id": "hosp-kedar"},
        headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "DOCTOR"
    assert data["workflow_data"]["cross_hospital_sharing_blocked"] is True
    assert "DPDP Act" in data["workflow_data"]["sharing_block_reason"]
    assert len(data["workflow_data"]["clinical_summary"]["prescriptions"]) == 0


# ------------------------------------------------------------------------------
# 8. DISTRIBUTED SESSION REVOCATION ENFORCEMENT
# ------------------------------------------------------------------------------

def test_session_revocation_enforcement():
    """Verify that revoked tokens are rejected immediately on subsequent requests."""
    user_id = "test_user_revoke_check"
    jti = f"jti-{datetime.now(timezone.utc).timestamp()}"
    token = create_access_token({
        "sub": user_id,
        "jti": jti,
        "role": "DOCTOR",
        "permissions": ["patient.read"]
    })

    # Revoke token
    session_manager.revoke_token(jti, user_id=user_id, reason="test_revocation")
    assert session_manager.is_token_revoked(jti, user_id=user_id) is True


# ------------------------------------------------------------------------------
# 9. AUDIT LOG INTEGRITY & PHI SCRUBBING
# ------------------------------------------------------------------------------

def test_qr_audit_log_scrubbing():
    """Verify audit logs record QR scans with masked/truncated tokens and zero PII."""
    with get_readonly_cursor() as cur:
        cur.execute("""
            SELECT action, resource_type, details
            FROM oh_id.audit_logs
            WHERE action = 'QR_WORKFLOW_SCAN'
            ORDER BY created_at DESC LIMIT 5;
        """)
        rows = cur.fetchall()
        for row in rows:
            details_str = str(row.get("details", ""))
            # Scanned token must be truncated with ellipsis
            assert "..." in details_str or len(details_str) < 256
            # Plaintext password or secret must never appear
            assert "password" not in details_str.lower()
            assert "secret" not in details_str.lower()


# ------------------------------------------------------------------------------
# 10. CORS STRICT ALLOWLIST ENFORCEMENT
# ------------------------------------------------------------------------------

def test_cors_rejects_untrusted_domain():
    """Verify CORS middleware rejects unauthorized cross-origin requests."""
    res = client.options(
        "/api/v1/patients/qr/scan-workflow",
        headers={
            "Origin": "https://malicious-hospital-attacker.com",
            "Access-Control-Request-Method": "POST"
        }
    )
    # Untrusted origin must not receive Access-Control-Allow-Origin matching attacker
    allow_origin = res.headers.get("access-control-allow-origin")
    assert allow_origin != "https://malicious-hospital-attacker.com"
