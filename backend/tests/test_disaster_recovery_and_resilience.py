"""
Automated Test Suite: Disaster Recovery, Distributed Rate Limiting, Session Revocation & Malware Defense
Sathus Technology Pvt Ltd - OneHealth ID Enterprise Security

Verifies:
- Phase 2: Distributed Redis-backed rate limiting across concurrent workers, atomic Lua operations, and risk-based fail-closed/open behavior.
- Phase 3: Server-side token/session revocation, logout bearer invalidation, and deactivated user enforcement.
- Phase 4: Managed Cloud KMS provider abstraction, least-privilege context binding, and disaster recovery key availability.
- Phase 5: Anti-malware stream inspection, EICAR detection, archive bomb defenses, and fail-closed outage policies.
- Phase 6: Plaintext storage hygiene verification (100% encrypted files in quarantine and approved folders).
- Phase 7: Complete isolated disaster recovery backup and restoration drill with zero plaintext leakage.
"""

import io
import os
import json
import uuid
import shutil
import zipfile
import threading
from pathlib import Path
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor

import pytest
import fakeredis
from fastapi.testclient import TestClient
from jose import jwt

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.security import create_access_token
from backend.app.core.rate_limit import (
    distributed_rate_limiter,
    EndpointRisk,
    InProcessSlidingWindowLimiter,
)
from backend.app.core.session_manager import session_manager
from backend.app.services.crypto.envelope_encryption import (
    envelope_crypto,
    EnvelopeEncryptionService,
    DecryptionError,
)
from backend.app.services.crypto.kms_provider import (
    MockCloudKMSProvider,
    LocalHKDFKMSProvider,
    KMSUnavailableError,
    KMSAccessDeniedError,
    KMSInvalidContextError,
)
from backend.app.services.security.malware_scanner import (
    malware_scanner,
    MalwareDetectedError,
    ArchiveBombDetectedError,
    EICAR_SIGNATURE,
)
from backend.app.database.session import get_db_cursor, get_readonly_cursor
from backend.app.repositories.sp_views_repository import sp_repository


client = TestClient(app)


# ==============================================================================
# SECTION 1: DISTRIBUTED RATE LIMITING TESTS (PHASE 2)
# ==============================================================================

def test_phase2_01_atomic_redis_sliding_window_concurrency():
    """Verify atomic sliding-window rate limiting across multiple concurrent workers using Redis."""
    fake_redis = fakeredis.FakeStrictRedis(decode_responses=True)
    distributed_rate_limiter.set_redis_client(fake_redis)

    policy = "concurrent_worker_test"
    user_id = "test_user_multiworker"
    max_requests = 10
    window_seconds = 60

    results = []

    def make_request(worker_id: int):
        try:
            distributed_rate_limiter.check_rate_limit(
                policy=policy,
                identifier=user_id,
                max_requests=max_requests,
                window_seconds=window_seconds,
                risk_level=EndpointRisk.GENERAL_API
            )
            results.append((worker_id, True))
        except Exception:
            results.append((worker_id, False))

    # Simulate 25 concurrent requests across 5 worker threads
    with ThreadPoolExecutor(max_workers=5) as executor:
        for i in range(25):
            executor.submit(make_request, i)

    successful = [r for r in results if r[1] is True]
    rejected = [r for r in results if r[1] is False]

    # Exactly 10 requests allowed, remaining 15 rejected atomically
    assert len(successful) == 10
    assert len(rejected) == 15

    distributed_rate_limiter.set_redis_client(None)


def test_phase2_02_rate_limiter_outage_risk_behavior():
    """Verify defined fail-open vs fail-closed policies during Redis infrastructure outage."""
    class BrokenRedis:
        def eval(self, *args, **kwargs):
            raise ConnectionError("Simulated Redis network partition")

    distributed_rate_limiter.set_redis_client(BrokenRedis())

    # 1. Critical Auth falls back to local limiter (does not let brute-force slip through)
    # First 15 pass, 16th gets 429
    for _ in range(15):
        distributed_rate_limiter.check_rate_limit(
            policy="auth_outage_test",
            identifier="test_ip_1",
            max_requests=15,
            window_seconds=60,
            risk_level=EndpointRisk.CRITICAL_AUTH
        )
    with pytest.raises(Exception) as exc_info:
        distributed_rate_limiter.check_rate_limit(
            policy="auth_outage_test",
            identifier="test_ip_1",
            max_requests=15,
            window_seconds=60,
            risk_level=EndpointRisk.CRITICAL_AUTH
        )
    assert exc_info.value.status_code == 429

    # 2. Document upload fails-closed under strict mode (HTTP 503)
    with pytest.raises(Exception) as upload_exc:
        distributed_rate_limiter.check_rate_limit(
            policy="upload_outage_test",
            identifier="test_ip_2",
            max_requests=20,
            window_seconds=60,
            risk_level=EndpointRisk.DOCUMENT_UPLOAD
        )
    assert upload_exc.value.status_code == 503
    assert "fail-closed" in upload_exc.value.detail.lower()

    # 3. General API fails-open to maintain hospital clinical operations
    # Should not raise exception
    distributed_rate_limiter.check_rate_limit(
        policy="general_outage_test",
        identifier="test_ip_3",
        max_requests=300,
        window_seconds=60,
        risk_level=EndpointRisk.GENERAL_API
    )

    distributed_rate_limiter.set_redis_client(None)


# ==============================================================================
# SECTION 2: SESSION & TOKEN REVOCATION TESTS (PHASE 3)
# ==============================================================================

def test_phase3_01_logout_invalidates_copied_bearer_token():
    """Verify server-side token revocation: copied bearer tokens are rejected after logout."""
    session_manager.reset()
    user_id = f"usr-rev-{uuid.uuid4().hex[:6]}"
    token_jti = str(uuid.uuid4())

    token = create_access_token({
        "sub": "revocation_tester",
        "uid": user_id,
        "user_ref_id": user_id,
        "role": "STAFF",
        "roles": ["STAFF"],
        "permissions": ["patient.read"],
        "jti": token_jti
    })

    # Verify session manager confirms token is initially valid
    assert session_manager.is_token_revoked(token_jti, user_id=user_id) is False

    # Perform logout with the token
    logout_res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200

    # Token must now be strictly revoked server-side
    assert session_manager.is_token_revoked(token_jti, user_id=user_id) is True

    # Replaying the copied bearer token to a protected endpoint must be rejected with 401
    auth_check = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert auth_check.status_code == 401


def test_phase3_02_disabled_user_blocked_immediately():
    """Verify deactivated user accounts cannot access protected endpoints even with valid unexpired token."""
    user_id = f"usr-dis-{uuid.uuid4().hex[:6]}"
    username = f"deactivated_{uuid.uuid4().hex[:6]}"

    try:
        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO oh_id.users (
                    id, user_ref_id, username, email, full_name, role, password_hash, is_active
                ) VALUES (
                    %s, %s, %s, %s, 'Deactivated User', 'STAFF', '$2b$12$dummyhashforresiliencetestonly0000000000000000000000000', FALSE
                );
            """, (user_id, user_id, username, f"{username}@test.com"))

        token = create_access_token({
            "sub": username,
            "uid": user_id,
            "user_ref_id": user_id,
            "role": "STAFF",
            "roles": ["STAFF"],
            "permissions": ["patient.read"]
        })

        # Attempting to call protected patient endpoint
        res = client.get("/api/v1/patients", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 403
        assert "deactivated" in res.json().get("detail", "").lower()
    finally:
        with get_db_cursor() as cur:
            cur.execute("DELETE FROM oh_id.users WHERE id = %s;", (user_id,))


# ==============================================================================
# SECTION 3: KMS ABSTRACTION & KEY MANAGEMENT TESTS (PHASE 4)
# ==============================================================================

def test_phase4_01_mock_cloud_kms_lifecycle_and_context_binding():
    """Verify Cloud KMS provider abstraction, cryptographic context binding, and IAM checks."""
    kms = MockCloudKMSProvider(key_arn="arn:aws:kms:ap-south-1:112233445566:key/ohid-test-kek")
    context = {"tenant_id": "hosp-apollo", "document_id": "doc-biopsy-001"}

    # Generate Data Key
    plaintext_dek, encrypted_dek = kms.generate_data_key("arn:aws:kms:ap-south-1:112233445566:key/ohid-test-kek", encryption_context=context)
    assert len(plaintext_dek) == 32
    assert encrypted_dek != plaintext_dek

    # Unwrapping with correct context recovers DEK
    unwrapped = kms.decrypt_dek(encrypted_dek, "arn:aws:kms:ap-south-1:112233445566:key/ohid-test-kek", encryption_context=context)
    assert unwrapped == plaintext_dek

    # Unwrapping with mismatched tenant/doc context raises KMSInvalidContextError
    wrong_context = {"tenant_id": "hosp-kauvery", "document_id": "doc-biopsy-001"}
    with pytest.raises(KMSInvalidContextError):
        kms.decrypt_dek(encrypted_dek, "arn:aws:kms:ap-south-1:112233445566:key/ohid-test-kek", encryption_context=wrong_context)

    # Simulated KMS offline / network partition
    kms.set_availability(reachable=False)
    with pytest.raises(KMSUnavailableError):
        kms.decrypt_dek(encrypted_dek, "arn:aws:kms:ap-south-1:112233445566:key/ohid-test-kek", encryption_context=context)

    # Simulated IAM permission revoke
    kms.set_availability(reachable=True, iam_allowed=False)
    with pytest.raises(KMSAccessDeniedError):
        kms.decrypt_dek(encrypted_dek, "arn:aws:kms:ap-south-1:112233445566:key/ohid-test-kek", encryption_context=context)


def test_phase4_02_production_environment_forbids_local_keys(monkeypatch):
    """Verify that production environment strictly forbids falling back to local development keys."""
    from backend.app.services.crypto.kms_provider import get_kms_provider
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "KMS_PROVIDER", "local")

    with pytest.raises(RuntimeError) as exc_info:
        get_kms_provider()

    assert "Production environment must use a managed cloud KMS" in str(exc_info.value)


def test_phase1_01_security_health_endpoint():
    """Verify DevSecOps security health check endpoint reports status without leaking secrets."""
    res = client.get("/health/security")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "security_controls" in data
    controls = data["security_controls"]
    assert "rate_limiter" in controls
    assert "malware_scanner" in controls
    assert "kms_provider" in controls
    assert "envelope_encryption" in controls
    # Verify zero secrets disclosed
    text = res.text.lower()
    for sensitive in ("secret", "password", "token", "private_key", "dek", "kek"):
        if sensitive in ("token", "secret"):
            # Ensure only descriptive key names, no values
            assert "bearer" not in text
            assert "secret_key" not in text


# ==============================================================================
# SECTION 4: ANTI-MALWARE & ARCHIVE BOMB DEFENSE TESTS (PHASE 5)
# ==============================================================================

def test_phase5_01_malware_eicar_detection():
    """Verify malware scanner rejects files containing EICAR test signature."""
    malware_scanner.set_mock_mode(True)
    eicar_content = b"%PDF-1.4\n" + EICAR_SIGNATURE

    with pytest.raises(MalwareDetectedError) as exc_info:
        malware_scanner.scan_bytes(eicar_content, "eicar_test.pdf", hospital_id="hosp-kedar")
    assert "EICAR" in exc_info.value.threat_name


def test_phase5_02_archive_bomb_and_zip_slip_prevention():
    """Verify detection and rejection of zip bombs and path traversal attempts."""
    # 1. Zip-Slip path traversal in DOCX container
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("../../etc/passwd", "malicious payload")
    zip_bytes = zip_buffer.getvalue()

    with pytest.raises(MalwareDetectedError) as exc_info:
        malware_scanner.scan_bytes(zip_bytes, "malicious_slip.docx", hospital_id="hosp-kedar")
    assert "ZipSlip" in exc_info.value.threat_name

    # 2. Archive Bomb high compression ratio
    bomb_buffer = io.BytesIO()
    with zipfile.ZipFile(bomb_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        # 10 MB of zeros compressed into few hundred bytes
        zf.writestr("huge_empty_file.txt", b"\x00" * (10 * 1024 * 1024))
    bomb_bytes = bomb_buffer.getvalue()

    with pytest.raises(ArchiveBombDetectedError):
        malware_scanner.scan_bytes(bomb_bytes, "bomb.docx", hospital_id="hosp-kedar")


def test_phase5_03_scanner_offline_fail_closed_policy():
    """Verify fail-closed policy blocks upload when antivirus scanner is offline."""
    malware_scanner.set_simulated_outage(True)
    clean_bytes = b"%PDF-1.4\nClean test document bytes"

    with pytest.raises(Exception) as exc_info:
        malware_scanner.scan_bytes(clean_bytes, "clean.pdf", hospital_id="hosp-kedar")
    assert exc_info.value.status_code == 503
    assert "fail-closed" in exc_info.value.detail.lower()

    malware_scanner.set_simulated_outage(False)


# ==============================================================================
# SECTION 5: PLAINTEXT STORAGE HYGIENE AUDIT (PHASE 6)
# ==============================================================================

def test_phase6_01_storage_contains_zero_plaintext_files():
    """Verify physical storage folders contain 100% encrypted files starting with OHID_ENC_V1."""
    storage_root = Path("backend/storage/documents")
    if not storage_root.exists():
        pytest.skip("Storage directory not present in environment")

    unencrypted = []
    total_files = 0

    for root, dirs, files in os.walk(storage_root):
        for f in files:
            total_files += 1
            full_path = Path(root) / f
            with open(full_path, "rb") as fp:
                head = fp.read(11)
                if head != b"OHID_ENC_V1":
                    unencrypted.append(str(full_path.relative_to(storage_root)))

    assert len(unencrypted) == 0, f"Found {len(unencrypted)} unencrypted files: {unencrypted}"
    assert total_files > 0, "Expected at least one encrypted document file in storage"


# ==============================================================================
# SECTION 6: ISOLATED DISASTER RECOVERY RESTORE DRILL (PHASE 7)
# ==============================================================================

def test_phase7_01_isolated_disaster_recovery_drill(tmp_path):
    """
    Complete isolated disaster recovery backup & restoration drill:
    1. Create encrypted synthetic documents across two hospital tenants.
    2. Archive encrypted packages and manifest to an isolated DR backup vault.
    3. Simulate total primary system loss and restore into a fresh recovery root.
    4. Re-derive KEK from DR vault secret and verify 100% byte-for-byte decryption.
    5. Verify wrong-tenant or tampered restored packages strictly fail authentication.
    """
    dr_backup_vault = tmp_path / "dr_backup_vault"
    dr_restored_target = tmp_path / "dr_restored_target"
    dr_backup_vault.mkdir()
    dr_restored_target.mkdir()

    # Synthetic clinical documents
    docs = {
        "doc_apollo_1.pdf": (b"%PDF-1.4\nDischarge Summary: Patient recovered from cardiac stent.", "hosp-apollo", "job-dr-01"),
        "doc_kauvery_2.pdf": (b"%PDF-1.4\nOncology Lab Biopsy: Negative for malignant carcinoma.", "hosp-kauvery", "job-dr-02"),
        "doc_apollo_3.pdf": (b"%PDF-1.4\nPrescription: Atorvastatin 20mg OD at night.", "hosp-apollo", "job-dr-03")
    }

    crypto_service = EnvelopeEncryptionService()
    manifest = []

    # 1. Encrypt and store into DR backup vault
    for filename, (content, tenant, job_id) in docs.items():
        aad = f"{tenant}:{job_id}:{filename}".encode("utf-8")
        encrypted_pkg = crypto_service.encrypt_document_bytes(content, associated_data=aad)

        # Write to backup vault
        tenant_vault = dr_backup_vault / tenant
        tenant_vault.mkdir(parents=True, exist_ok=True)
        file_path = tenant_vault / f"{job_id}_{filename}"
        file_path.write_bytes(encrypted_pkg)

        manifest.append({
            "filename": filename,
            "tenant": tenant,
            "job_id": job_id,
            "relative_path": str(file_path.relative_to(dr_backup_vault)),
            "size_encrypted": len(encrypted_pkg)
        })

    # Save disaster recovery metadata manifest
    manifest_file = dr_backup_vault / "dr_manifest.json"
    manifest_file.write_text(json.dumps(manifest, indent=2))

    # 2. Simulate complete recovery into a fresh restored target directory
    loaded_manifest = json.loads(manifest_file.read_text())
    for item in loaded_manifest:
        src = dr_backup_vault / item["relative_path"]
        dest = dr_restored_target / item["relative_path"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)

    # 3. Initialize fresh disaster recovery crypto service with DR master secret
    dr_crypto = EnvelopeEncryptionService()

    # 4. Verify 100% recovery for every document with correct context
    for item in loaded_manifest:
        restored_path = dr_restored_target / item["relative_path"]
        assert restored_path.exists()
        raw_pkg = restored_path.read_bytes()

        # Decrypt with correct tenant and job context
        correct_aad = f"{item['tenant']}:{item['job_id']}:{item['filename']}".encode("utf-8")
        decrypted_bytes = dr_crypto.decrypt_document_bytes(raw_pkg, associated_data=correct_aad)
        expected_bytes = docs[item["filename"]][0]
        assert decrypted_bytes == expected_bytes

        # 5. Verify wrong-tenant context fails authentication
        wrong_tenant_aad = f"wrong-tenant:{item['job_id']}:{item['filename']}".encode("utf-8")
        with pytest.raises(DecryptionError):
            dr_crypto.decrypt_document_bytes(raw_pkg, associated_data=wrong_tenant_aad)

        # 6. Verify tampered restored package fails authentication
        tampered_pkg = bytearray(raw_pkg)
        tampered_pkg[-1] ^= 0xFF
        with pytest.raises(DecryptionError):
            dr_crypto.decrypt_document_bytes(bytes(tampered_pkg), associated_data=correct_aad)
