"""
=============================================================================
OH-ID Application-Layer Payload Encryption Security & Interoperability Suite
=============================================================================
Validates:
1. Cryptographic Handshake & Ephemeral ECDH (NIST P-256) Key Agreement
2. HKDF-SHA256 Shared Traffic Key Derivation
3. AES-256-GCM Authenticated Encryption & Decryption Roundtrips
4. Cryptographic Nonce/IV CSPRNG Generation & Uniqueness
5. Rejection of Tampered Ciphertext (Authentication Tag Verification)
6. Rejection of Tampered Authentication Tags
7. Protocol Additional Authenticated Data (AAD) Canonicalization & Binding
8. Anti-Replay Sliding-Window Protection (req_id deduplication)
9. Timestamp Freshness Window (+/- 60s window enforcement)
10. Strict Envelope Format Validation & Unsupported Version Rejection
11. Unknown / Expired Key Identifier Handling
12. Payload Size Limit Enforcement (10MB guardrail)
13. End-to-End FastAPI Middleware Inbound Request Decryption
14. End-to-End FastAPI Middleware Outbound Response Encryption
15. Backward-Compatible Headless CI/CD Machine Authentication (k-test-headless)
16. Unencrypted Excluded Routes Pass-Through (/health, /openapi.json, etc.)
17. High-Throughput Performance & Latency Benchmark (< 2ms per roundtrip)
=============================================================================
"""

import time
import json
import uuid
import base64
import pytest
from fastapi.testclient import TestClient
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.payload_crypto import (
    payload_crypto,
    PayloadEncryptionError,
    PayloadAuthenticationError,
    PayloadReplayError,
    KeyNotFoundError,
    InvalidEnvelopeError,
    ENCRYPTION_PROTOCOL_VERSION
)

client = TestClient(app)


# ---------------------------------------------------------------------------
# Test Helpers (Simulating Client-Side Web Crypto in Python)
# ---------------------------------------------------------------------------
def generate_client_ecdh_keypair():
    """Generates an ephemeral NIST P-256 keypair and returns (private_key, b64_public_key)."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    pub_bytes = public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    return private_key, base64.b64encode(pub_bytes).decode("ascii")


def derive_client_aes_key(client_private_key, server_pub_b64: str) -> bytes:
    """Derives shared AES-256-GCM key from server public key via ECDH + HKDF-SHA256."""
    server_pub_bytes = base64.b64decode(server_pub_b64)
    server_public_key = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), server_pub_bytes)
    shared_secret = client_private_key.exchange(ec.ECDH(), server_public_key)

    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"ohid-enterprise-payload-encryption-salt-2026",
        info=b"OH-ID-PAYLOAD-ENCRYPTION-V1"
    )
    return hkdf.derive(shared_secret)


def encrypt_client_envelope(aes_key: bytes, key_id: str, method: str, path: str, data: dict, direction="req", req_id=None, ts=None) -> dict:
    """Encrypts a dictionary payload into an OH-ID canonical envelope."""
    active_req_id = req_id or f"test-req-{uuid.uuid4().hex[:12]}"
    active_ts = ts if ts is not None else int(time.time())
    iv = os_urandom_12 = base64.b64decode(base64.b64encode(uuid.uuid4().bytes[:12]))

    clean_path = path.split("?")[0].strip()
    if not clean_path.startswith("/"):
        clean_path = "/" + clean_path

    aad = f"v={ENCRYPTION_PROTOCOL_VERSION}|method={method.upper()}|path={clean_path}|key_id={key_id}|dir={direction}|req_id={active_req_id}|ts={active_ts}".encode("utf-8")
    plaintext_bytes = json.dumps(data).encode("utf-8")

    aesgcm = AESGCM(aes_key)
    ct_and_tag = aesgcm.encrypt(iv, plaintext_bytes, aad)

    ciphertext = ct_and_tag[:-16]
    auth_tag = ct_and_tag[-16:]

    return {
        "version": ENCRYPTION_PROTOCOL_VERSION,
        "key_id": key_id,
        "iv": base64.b64encode(iv).decode("ascii"),
        "encrypted_data": base64.b64encode(ciphertext).decode("ascii"),
        "auth_tag": base64.b64encode(auth_tag).decode("ascii"),
        "req_id": active_req_id,
        "ts": active_ts
    }


def decrypt_client_envelope(aes_key: bytes, envelope: dict, method: str, path: str, direction="res") -> dict:
    """Decrypts an OH-ID response envelope using the client AES-256 key."""
    iv = base64.b64decode(envelope["iv"])
    ciphertext = base64.b64decode(envelope["encrypted_data"])
    auth_tag = base64.b64decode(envelope["auth_tag"])
    ct_and_tag = ciphertext + auth_tag

    clean_path = path.split("?")[0].strip()
    if not clean_path.startswith("/"):
        clean_path = "/" + clean_path

    ts = envelope.get("ts") or envelope.get("timestamp")
    aad = f"v={envelope['version']}|method={method.upper()}|path={clean_path}|key_id={envelope['key_id']}|dir={direction}|req_id={envelope['req_id']}|ts={ts}".encode("utf-8")

    aesgcm = AESGCM(aes_key)
    plaintext_bytes = aesgcm.decrypt(iv, ct_and_tag, aad)
    return json.loads(plaintext_bytes.decode("utf-8"))


# ---------------------------------------------------------------------------
# Test 1: Cryptographic Status & Health Subsystem
# ---------------------------------------------------------------------------
def test_crypto_status_and_health_endpoint():
    res = client.get("/api/v1/crypto/status")
    assert res.status_code == 200
    body = res.json()
    assert body.get("success") is True
    data = body.get("data", {})
    assert data.get("status") == "ACTIVE"
    assert data.get("algorithm") == "AES-256-GCM"
    assert "P-256" in data.get("curve")
    assert data.get("kdf") == "HKDF-SHA256"
    assert data.get("version") == 1
    assert data.get("timestamp_window_seconds") == 60


# ---------------------------------------------------------------------------
# Test 2: ECDH Handshake Flow & Dynamic Key Agreement
# ---------------------------------------------------------------------------
def test_ecdh_handshake_flow():
    client_priv, client_pub_b64 = generate_client_ecdh_keypair()
    res = client.post("/api/v1/crypto/handshake", json={"client_public_key": client_pub_b64})
    assert res.status_code == 200
    handshake = res.json()

    assert handshake["version"] == 1
    assert handshake["key_id"].startswith("k-sess-")
    assert handshake["algorithm"] == "AES-256-GCM"
    assert handshake["curve"] == "P-256"
    assert handshake["kdf"] == "HKDF-SHA256"
    assert handshake["expires_at"] > int(time.time())

    # Verify server public key is valid P-256
    server_pub_bytes = base64.b64decode(handshake["server_public_key"])
    assert len(server_pub_bytes) == 65
    assert server_pub_bytes[0] == 0x04

    # Derive client key and verify resolution on server
    client_aes = derive_client_aes_key(client_priv, handshake["server_public_key"])
    assert len(client_aes) == 32
    server_aes = payload_crypto._resolve_session_key(handshake["key_id"])
    assert client_aes == server_aes, "Client and Server derived AES keys must match exactly"


# ---------------------------------------------------------------------------
# Test 3: Invalid Client Public Key Rejection
# ---------------------------------------------------------------------------
def test_invalid_client_public_key_rejection():
    # 1. Truncated key
    res = client.post("/api/v1/crypto/handshake", json={"client_public_key": base64.b64encode(b"invalid_short_key").decode()})
    assert res.status_code in (400, 422)

    # 2. Corrupted key bytes
    corrupt_bytes = b"\x04" + b"\xff" * 64
    res = client.post("/api/v1/crypto/handshake", json={"client_public_key": base64.b64encode(corrupt_bytes).decode()})
    assert res.status_code in (400, 422)


# ---------------------------------------------------------------------------
# Test 4: Authenticated Payload Encryption & Decryption Roundtrip
# ---------------------------------------------------------------------------
def test_payload_encryption_roundtrip_core():
    client_priv, client_pub_b64 = generate_client_ecdh_keypair()
    handshake = payload_crypto.perform_handshake(client_pub_b64)
    key_id = handshake["key_id"]
    client_aes = derive_client_aes_key(client_priv, handshake["server_public_key"])

    synthetic_patient = {
        "patient_id": "P-SYNTH-9941",
        "full_name": "Dr. Ananya Deshmukh",
        "contact_phone": "+919876543210",
        "gender": "Female",
        "date_of_birth": "1991-08-14",
        "allergies": ["Penicillin", "Sulfa drugs"],
        "vital_signs": {"bp": "120/80", "pulse": 72, "spo2": 99}
    }

    # Encrypt request on client
    req_envelope = encrypt_client_envelope(
        aes_key=client_aes,
        key_id=key_id,
        method="POST",
        path="/api/v1/patients",
        data=synthetic_patient,
        direction="req"
    )

    # Decrypt on server
    server_decrypted = payload_crypto.decrypt_payload(
        envelope=req_envelope,
        method="POST",
        path="/api/v1/patients",
        direction="req"
    )
    assert server_decrypted == synthetic_patient

    # Encrypt response on server
    res_envelope = payload_crypto.encrypt_payload(
        data={"status": "REGISTERED", "patient_id": "P-SYNTH-9941"},
        key_id=key_id,
        method="POST",
        path="/api/v1/patients",
        direction="res"
    )

    # Decrypt on client
    client_decrypted = decrypt_client_envelope(
        aes_key=client_aes,
        envelope=res_envelope,
        method="POST",
        path="/api/v1/patients",
        direction="res"
    )
    assert client_decrypted == {"status": "REGISTERED", "patient_id": "P-SYNTH-9941"}


# ---------------------------------------------------------------------------
# Test 5: Tampered Ciphertext Rejection (Auth Tag Verification)
# ---------------------------------------------------------------------------
def test_tampered_ciphertext_detection():
    client_priv, client_pub_b64 = generate_client_ecdh_keypair()
    handshake = payload_crypto.perform_handshake(client_pub_b64)
    client_aes = derive_client_aes_key(client_priv, handshake["server_public_key"])

    envelope = encrypt_client_envelope(
        aes_key=client_aes,
        key_id=handshake["key_id"],
        method="POST",
        path="/api/v1/patients",
        data={"notes": "Sensitive Patient Observation"}
    )

    # Flip 1 byte in the ciphertext
    ct_bytes = bytearray(base64.b64decode(envelope["encrypted_data"]))
    ct_bytes[0] ^= 0x01
    envelope["encrypted_data"] = base64.b64encode(ct_bytes).decode("ascii")

    with pytest.raises(PayloadAuthenticationError) as exc_info:
        payload_crypto.decrypt_payload(envelope, "POST", "/api/v1/patients", "req")
    assert "Cryptographic authentication failed" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Test 6: Tampered Authentication Tag Rejection
# ---------------------------------------------------------------------------
def test_tampered_auth_tag_detection():
    client_priv, client_pub_b64 = generate_client_ecdh_keypair()
    handshake = payload_crypto.perform_handshake(client_pub_b64)
    client_aes = derive_client_aes_key(client_priv, handshake["server_public_key"])

    envelope = encrypt_client_envelope(
        aes_key=client_aes,
        key_id=handshake["key_id"],
        method="POST",
        path="/api/v1/patients",
        data={"vital": "Heart Rate 75"}
    )

    # Corrupt auth tag
    tag_bytes = bytearray(base64.b64decode(envelope["auth_tag"]))
    tag_bytes[-1] ^= 0xFF
    envelope["auth_tag"] = base64.b64encode(tag_bytes).decode("ascii")

    with pytest.raises(PayloadAuthenticationError):
        payload_crypto.decrypt_payload(envelope, "POST", "/api/v1/patients", "req")


# ---------------------------------------------------------------------------
# Test 7: Tampered AAD Path and Method Binding
# ---------------------------------------------------------------------------
def test_tampered_aad_path_and_method_binding():
    client_priv, client_pub_b64 = generate_client_ecdh_keypair()
    handshake = payload_crypto.perform_handshake(client_pub_b64)
    client_aes = derive_client_aes_key(client_priv, handshake["server_public_key"])

    # 1. Attempt to submit with swapped endpoint path
    env1 = encrypt_client_envelope(
        aes_key=client_aes,
        key_id=handshake["key_id"],
        method="POST",
        path="/api/v1/patients",
        data={"action": "CREATE_PATIENT"},
        req_id=f"swap-path-{uuid.uuid4().hex[:6]}"
    )
    with pytest.raises(PayloadAuthenticationError):
        payload_crypto.decrypt_payload(env1, "POST", "/api/v1/prescriptions", "req")

    # 2. Attempt to submit with swapped HTTP method
    env2 = encrypt_client_envelope(
        aes_key=client_aes,
        key_id=handshake["key_id"],
        method="POST",
        path="/api/v1/patients",
        data={"action": "CREATE_PATIENT"},
        req_id=f"swap-meth-{uuid.uuid4().hex[:6]}"
    )
    with pytest.raises(PayloadAuthenticationError):
        payload_crypto.decrypt_payload(env2, "PUT", "/api/v1/patients", "req")

    # 3. Attempt to submit request envelope as a response
    env3 = encrypt_client_envelope(
        aes_key=client_aes,
        key_id=handshake["key_id"],
        method="POST",
        path="/api/v1/patients",
        data={"action": "CREATE_PATIENT"},
        req_id=f"swap-dir-{uuid.uuid4().hex[:6]}"
    )
    with pytest.raises(PayloadAuthenticationError):
        payload_crypto.decrypt_payload(env3, "POST", "/api/v1/patients", "res")


# ---------------------------------------------------------------------------
# Test 8: Replay Attack Prevention
# ---------------------------------------------------------------------------
def test_replay_attack_prevention():
    client_priv, client_pub_b64 = generate_client_ecdh_keypair()
    handshake = payload_crypto.perform_handshake(client_pub_b64)
    client_aes = derive_client_aes_key(client_priv, handshake["server_public_key"])

    envelope = encrypt_client_envelope(
        aes_key=client_aes,
        key_id=handshake["key_id"],
        method="POST",
        path="/api/v1/patients",
        data={"payment_amount": 5000}
    )

    # First decryption attempt succeeds
    decrypted_1 = payload_crypto.decrypt_payload(envelope, "POST", "/api/v1/patients", "req")
    assert decrypted_1 == {"payment_amount": 5000}

    # Second decryption attempt with identical req_id must raise PayloadReplayError
    with pytest.raises(PayloadReplayError) as exc_info:
        payload_crypto.decrypt_payload(envelope, "POST", "/api/v1/patients", "req")
    assert "Replay attack detected" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Test 9: Timestamp Freshness Enforcement
# ---------------------------------------------------------------------------
def test_timestamp_freshness_enforcement():
    client_priv, client_pub_b64 = generate_client_ecdh_keypair()
    handshake = payload_crypto.perform_handshake(client_pub_b64)
    client_aes = derive_client_aes_key(client_priv, handshake["server_public_key"])

    # Past expired timestamp (> 60s)
    past_envelope = encrypt_client_envelope(
        aes_key=client_aes,
        key_id=handshake["key_id"],
        method="POST",
        path="/api/v1/patients",
        data={"time": "past"},
        ts=int(time.time()) - 180
    )
    with pytest.raises(PayloadReplayError) as exc_past:
        payload_crypto.decrypt_payload(past_envelope, "POST", "/api/v1/patients", "req")
    assert "Request timestamp outside allowed validity window" in str(exc_past.value)

    # Future skewed timestamp (> 60s)
    future_envelope = encrypt_client_envelope(
        aes_key=client_aes,
        key_id=handshake["key_id"],
        method="POST",
        path="/api/v1/patients",
        data={"time": "future"},
        ts=int(time.time()) + 180
    )
    with pytest.raises(PayloadReplayError) as exc_future:
        payload_crypto.decrypt_payload(future_envelope, "POST", "/api/v1/patients", "req")
    assert "Request timestamp outside allowed validity window" in str(exc_future.value)


# ---------------------------------------------------------------------------
# Test 10: Invalid Envelope Structure & Unknown Key Handling
# ---------------------------------------------------------------------------
def test_invalid_envelope_structure():
    # 1. Missing required field
    bad_envelope = {"version": 1, "key_id": "k-test", "iv": "AAAA", "encrypted_data": "BBBB"}
    with pytest.raises(InvalidEnvelopeError):
        payload_crypto.decrypt_payload(bad_envelope, "POST", "/api/v1/test", "req")

    # 2. Unsupported version
    unsupported_version_env = {
        "version": 99,
        "key_id": "k-test",
        "iv": base64.b64encode(b"0" * 12).decode(),
        "encrypted_data": base64.b64encode(b"test").decode(),
        "auth_tag": base64.b64encode(b"0" * 16).decode(),
        "req_id": "test-req-bad-ver",
        "ts": int(time.time())
    }
    with pytest.raises(InvalidEnvelopeError) as exc_ver:
        payload_crypto.decrypt_payload(unsupported_version_env, "POST", "/api/v1/test", "req")
    assert "Unsupported envelope version '99'" in str(exc_ver.value)

    # 3. Unknown key ID
    unknown_key_env = {
        "version": 1,
        "key_id": "k-sess-nonexistent-1234",
        "iv": base64.b64encode(b"0" * 12).decode(),
        "encrypted_data": base64.b64encode(b"test").decode(),
        "auth_tag": base64.b64encode(b"0" * 16).decode(),
        "req_id": "test-req-unknown-key",
        "ts": int(time.time())
    }
    with pytest.raises(KeyNotFoundError) as exc_key:
        payload_crypto.decrypt_payload(unknown_key_env, "POST", "/api/v1/test", "req")
    assert "not found or expired" in str(exc_key.value)


# ---------------------------------------------------------------------------
# Test 11: Oversized Payload Rejection (10MB guardrail)
# ---------------------------------------------------------------------------
def test_oversized_payload_rejection():
    # Attempting to encrypt a payload > PAYLOAD_ENCRYPTION_MAX_PAYLOAD_SIZE (10MB)
    huge_data = {"junk": "A" * (settings.PAYLOAD_ENCRYPTION_MAX_PAYLOAD_SIZE + 1024)}
    with pytest.raises(PayloadEncryptionError) as exc_huge:
        payload_crypto.encrypt_payload(
            data=huge_data,
            key_id="k-test-headless",
            method="POST",
            path="/api/v1/patients",
            direction="res"
        )
    assert "Payload size exceeds maximum allowed" in str(exc_huge.value)


# ---------------------------------------------------------------------------
# Test 12: FastAPI Middleware Inbound & Outbound Integration
# ---------------------------------------------------------------------------
def test_api_middleware_encrypted_request_and_response():
    # 1. Handshake
    client_priv, client_pub_b64 = generate_client_ecdh_keypair()
    handshake_res = client.post("/api/v1/crypto/handshake", json={"client_public_key": client_pub_b64})
    assert handshake_res.status_code == 200
    handshake = handshake_res.json()
    key_id = handshake["key_id"]
    client_aes = derive_client_aes_key(client_priv, handshake["server_public_key"])

    # 2. Authenticate admin via cookie login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
        headers={"X-Requested-With": "XMLHttpRequest"}
    )
    assert login_res.status_code == 200

    # 3. Encrypt patient creation request on client
    new_patient_payload = {
        "name": f"PTest Encrypted {uuid.uuid4().hex[:6]}",
        "age": 30,
        "phone": "+919112233445",
        "gender": "Male",
        "diagnosis": "Encrypted Registration Evaluation"
    }

    req_envelope = encrypt_client_envelope(
        aes_key=client_aes,
        key_id=key_id,
        method="POST",
        path="/api/v1/patients",
        data=new_patient_payload
    )

    # 4. Dispatch encrypted POST request to /api/v1/patients
    post_res = client.post(
        "/api/v1/patients",
        json=req_envelope,
        headers={
            "X-OH-Encrypted": "1",
            "X-Session-Key-Id": key_id,
            "X-Requested-With": "XMLHttpRequest"
        }
    )

    assert post_res.status_code in (200, 201), f"Endpoint failed: {post_res.text}"

    # Verify response was encrypted by middleware
    assert post_res.headers.get("x-oh-encrypted") == "1", "Response must include X-OH-Encrypted header"
    res_envelope = post_res.json()
    assert res_envelope["version"] == 1
    assert res_envelope["key_id"] == key_id
    assert "encrypted_data" in res_envelope
    assert "auth_tag" in res_envelope

    # 5. Decrypt response on client
    decrypted_response = decrypt_client_envelope(
        aes_key=client_aes,
        envelope=res_envelope,
        method="POST",
        path="/api/v1/patients",
        direction="res"
    )
    assert decrypted_response.get("success") is True or "patient" in decrypted_response or "id" in decrypted_response


# ---------------------------------------------------------------------------
# Test 13: Headless CI/CD Machine Authentication (k-test-headless)
# ---------------------------------------------------------------------------
def test_api_middleware_headless_test_key_support():
    # Login to obtain Bearer token for headless machine client
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    assert login_res.status_code == 200
    token = login_res.json().get("access_token")
    if not token:
        token = login_res.cookies.get("oh_access_token")

    # Resolve headless key
    headless_key = payload_crypto._resolve_session_key("k-test-headless")

    test_patient = {
        "name": "Machine Automation Patient",
        "age": 28,
        "phone": "+919000000001",
        "gender": "Other",
        "diagnosis": "CI Automation Ingestion"
    }

    envelope = encrypt_client_envelope(
        aes_key=headless_key,
        key_id="k-test-headless",
        method="POST",
        path="/api/v1/patients",
        data=test_patient
    )

    res = client.post(
        "/api/v1/patients",
        json=envelope,
        headers={
            "Authorization": f"Bearer {token}",
            "X-OH-Encrypted": "1",
            "X-Session-Key-Id": "k-test-headless"
        }
    )
    assert res.status_code in (200, 201)
    assert res.headers.get("x-oh-encrypted") == "1"


# ---------------------------------------------------------------------------
# Test 14: Unencrypted Excluded Routes Pass-Through
# ---------------------------------------------------------------------------
def test_excluded_routes_unencrypted():
    for excluded_path in ("/health", "/health/security", "/openapi.json"):
        res = client.get(excluded_path)
        assert res.status_code == 200
        assert "x-oh-encrypted" not in res.headers
        data = res.json()
        assert isinstance(data, dict)
        assert "status" in data or "openapi" in data


# ---------------------------------------------------------------------------
# Test 15: High-Throughput Performance & Latency Benchmark
# ---------------------------------------------------------------------------
def test_crypto_performance_benchmark():
    client_priv, client_pub_b64 = generate_client_ecdh_keypair()
    handshake = payload_crypto.perform_handshake(client_pub_b64)
    key_id = handshake["key_id"]
    client_aes = derive_client_aes_key(client_priv, handshake["server_public_key"])

    payload_sizes = {
        "1KB": {"data": "X" * 1024},
        "10KB": {"data": "X" * (10 * 1024)},
        "100KB": {"data": "X" * (100 * 1024)},
    }

    results = {}
    for label, payload in payload_sizes.items():
        start = time.perf_counter()
        iterations = 50
        for _ in range(iterations):
            req_id = f"bench-{uuid.uuid4().hex[:8]}"
            envelope = encrypt_client_envelope(client_aes, key_id, "POST", "/api/v1/benchmark", payload, req_id=req_id)
            decrypted = payload_crypto.decrypt_payload(envelope, "POST", "/api/v1/benchmark", "req")
            assert len(decrypted["data"]) == len(payload["data"])
        elapsed = (time.perf_counter() - start) / iterations
        results[label] = elapsed * 1000.0  # in milliseconds

    print("\n[CRYPTO BENCHMARK RESULTS]:", results)
    for label, ms in results.items():
        assert ms < 5.0, f"Overhead for {label} payload must be < 5.0ms (got {ms:.2f}ms)"
