"""
OneHealth ID (OH-ID) — Centralized API Payload Encryption Service
Implements NIST SP 800-38D AES-256-GCM authenticated encryption,
ECDH (NIST P-256 / secp256r1) ephemeral key agreement, HKDF-SHA256 derivation,
protocol Additional Authenticated Data (AAD) canonicalization, and anti-replay protection.
Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
"""

import os
import time
import json
import uuid
import base64
import threading
from typing import Dict, Any, Optional, Tuple, Union, List
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from cryptography.exceptions import InvalidTag

from backend.app.core.config import settings
from backend.app.core.logging import logger, log_security_event


# Protocol constants
ENCRYPTION_PROTOCOL_VERSION = 1
ENCRYPTION_ALGORITHM = "AES-256-GCM"
CURVE_NAME = "P-256"
KDF_NAME = "HKDF-SHA256"
NONCE_LENGTH_BYTES = 12
AUTH_TAG_LENGTH_BYTES = 16
HKDF_INFO_PREFIX = b"OH-ID-PAYLOAD-ENCRYPTION-V1"
HKDF_SALT = b"ohid-enterprise-payload-encryption-salt-2026"


class PayloadEncryptionError(Exception):
    """Base exception for payload encryption/decryption failures."""
    pass


class PayloadAuthenticationError(PayloadEncryptionError):
    """Raised when authentication tag verification or AAD validation fails."""
    pass


class PayloadReplayError(PayloadEncryptionError):
    """Raised when an encrypted request has an expired timestamp or duplicate request ID."""
    pass


class KeyNotFoundError(PayloadEncryptionError):
    """Raised when key_id is missing, expired, or unrecognized."""
    pass


class InvalidEnvelopeError(PayloadEncryptionError):
    """Raised when an encrypted envelope has malformed fields or unsupported version."""
    pass


class SessionKeyEntry:
    def __init__(self, key_id: str, aes_key: bytes, expires_at: float, client_public_key: Optional[str] = None):
        self.key_id = key_id
        self.aes_key = aes_key
        self.expires_at = expires_at
        self.client_public_key = client_public_key
        self.created_at = time.time()

    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class PayloadCryptoService:
    """
    Centralized cryptographic engine for API request/response payload encryption.
    - Zero plaintext keys stored in browser storage or static JS bundles.
    - Dynamic session key agreement using ECDH P-256.
    - Replay protection with strict timestamp validity window and sliding-window cache.
    - Strict Additional Authenticated Data (AAD) binding to HTTP method, path, and direction.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._session_keys: Dict[str, SessionKeyEntry] = {}
        self._seen_request_ids: Dict[str, float] = {}
        self._last_cleanup_time = time.time()

        # Deterministic test key for headless CI/CD suites
        self._initialize_headless_test_key()

    def _initialize_headless_test_key(self) -> None:
        """Derives a fixed test key from SECRET_KEY for headless test automation."""
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=HKDF_SALT,
            info=b"OH-ID-HEADLESS-CI-PAYLOAD-KEY"
        )
        test_key_bytes = hkdf.derive(settings.SECRET_KEY.encode("utf-8"))
        self._session_keys["k-test-headless"] = SessionKeyEntry(
            key_id="k-test-headless",
            aes_key=test_key_bytes,
            expires_at=time.time() + 86400 * 365,  # Long lived for automation
            client_public_key="HEADLESS_TEST_CLIENT"
        )

    def _cleanup_expired_entries(self) -> None:
        """Purges expired session keys and stale replay request IDs."""
        now = time.time()
        if now - self._last_cleanup_time < 30.0:
            return

        with self._lock:
            self._last_cleanup_time = now
            # Clean expired session keys (except headless test key)
            expired_keys = [
                k for k, entry in self._session_keys.items()
                if entry.is_expired() and k != "k-test-headless"
            ]
            for k in expired_keys:
                del self._session_keys[k]

            # Clean expired request IDs older than 2x timestamp window
            retention_window = settings.PAYLOAD_ENCRYPTION_TIMESTAMP_WINDOW * 2
            expired_reqs = [
                req_id for req_id, seen_time in self._seen_request_ids.items()
                if now - seen_time > retention_window
            ]
            for req_id in expired_reqs:
                del self._seen_request_ids[req_id]

    def perform_handshake(self, client_public_key_b64: str) -> Dict[str, Any]:
        """
        Executes ECDH P-256 key agreement with client.
        1. Validates client public key (uncompressed point format, 65 bytes starting with 0x04).
        2. Generates ephemeral server ECDH P-256 keypair.
        3. Derives shared secret using ECDH.
        4. Derives session AES-256 key using HKDF-SHA256.
        5. Registers session key with TTL and returns server public key.
        """
        self._cleanup_expired_entries()

        try:
            client_pub_bytes = base64.b64decode(client_public_key_b64)
            if len(client_pub_bytes) != 65 or client_pub_bytes[0] != 0x04:
                raise ValueError("Invalid client public key: must be 65-byte uncompressed P-256 point starting with 0x04.")
            client_pub_point = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), client_pub_bytes)
        except Exception as e:
            logger.warning(f"Handshake rejected: invalid client public key ({e})")
            raise InvalidEnvelopeError("Invalid client public key encoding.")

        # Generate ephemeral server ECDH keypair
        server_private_key = ec.generate_private_key(ec.SECP256R1())
        server_public_key = server_private_key.public_key()
        server_pub_bytes = server_public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)

        # Perform ECDH key exchange
        shared_secret = server_private_key.exchange(ec.ECDH(), client_pub_point)

        # Derive 256-bit AES key via HKDF-SHA256
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=HKDF_SALT,
            info=HKDF_INFO_PREFIX
        )
        aes_session_key = hkdf.derive(shared_secret)

        key_id = f"k-sess-{uuid.uuid4().hex[:12]}"
        expires_at = time.time() + settings.PAYLOAD_ENCRYPTION_KEY_TTL_SECONDS

        with self._lock:
            self._session_keys[key_id] = SessionKeyEntry(
                key_id=key_id,
                aes_key=aes_session_key,
                expires_at=expires_at,
                client_public_key=client_public_key_b64[:20] + "..."
            )

        log_security_event(
            "PAYLOAD_ENCRYPTION_KEY_ESTABLISHED",
            resource=f"key:{key_id}",
            status="SUCCESS",
            details={"algorithm": ENCRYPTION_ALGORITHM, "ttl_seconds": settings.PAYLOAD_ENCRYPTION_KEY_TTL_SECONDS}
        )

        return {
            "version": ENCRYPTION_PROTOCOL_VERSION,
            "key_id": key_id,
            "server_public_key": base64.b64encode(server_pub_bytes).decode("ascii"),
            "algorithm": ENCRYPTION_ALGORITHM,
            "curve": CURVE_NAME,
            "kdf": KDF_NAME,
            "expires_at": int(expires_at),
            "timestamp_window_seconds": settings.PAYLOAD_ENCRYPTION_TIMESTAMP_WINDOW
        }

    def canonicalize_aad(
        self,
        version: int,
        method: str,
        path: str,
        key_id: str,
        direction: str,
        req_id: str,
        ts: int
    ) -> bytes:
        """
        Builds deterministic Additional Authenticated Data (AAD) for AES-GCM.
        Binds protocol version, HTTP method, canonical URL path, key ID,
        direction ('req' or 'res'), unique request ID, and timestamp.
        """
        # Canonicalize path: strip query parameters, lowercase, ensure leading slash
        clean_path = path.split("?")[0].strip()
        if not clean_path.startswith("/"):
            clean_path = "/" + clean_path

        # Canonical format
        aad_str = f"v={version}|method={method.upper().strip()}|path={clean_path}|key_id={key_id.strip()}|dir={direction.strip().lower()}|req_id={req_id.strip()}|ts={ts}"
        return aad_str.encode("utf-8")

    def _resolve_session_key(self, key_id: str) -> bytes:
        """Retrieves active AES-256 session key by key_id."""
        with self._lock:
            entry = self._session_keys.get(key_id)
            if not entry:
                raise KeyNotFoundError(f"Session key '{key_id}' not found or expired.")
            if entry.is_expired() and key_id != "k-test-headless":
                del self._session_keys[key_id]
                raise KeyNotFoundError(f"Session key '{key_id}' has expired. Please re-handshake.")
            return entry.aes_key

    def _validate_freshness_and_replay(self, req_id: str, ts: int) -> None:
        """
        Validates timestamp freshness and prevents replay attacks.
        - Timestamp must be within +/- timestamp_window seconds of server time.
        - Request ID must be unique within the sliding window.
        """
        now = time.time()
        window = settings.PAYLOAD_ENCRYPTION_TIMESTAMP_WINDOW

        if abs(now - ts) > window:
            log_security_event(
                "PAYLOAD_TIMESTAMP_EXPIRED",
                resource=f"req:{req_id}",
                status="DENIED",
                details={"request_ts": ts, "server_ts": int(now), "window": window}
            )
            raise PayloadReplayError(f"Request timestamp outside allowed validity window (skew: {int(now - ts)}s, max: {window}s).")

        with self._lock:
            if req_id in self._seen_request_ids:
                log_security_event(
                    "PAYLOAD_REPLAY_DETECTED",
                    resource=f"req:{req_id}",
                    status="DENIED",
                    details={"req_id": req_id}
                )
                raise PayloadReplayError(f"Replay attack detected: request ID '{req_id}' already processed.")
            self._seen_request_ids[req_id] = now

    def encrypt_payload(
        self,
        data: Union[Dict[str, Any], List[Any], str, bytes],
        key_id: str,
        method: str,
        path: str,
        direction: str = "res",
        req_id: Optional[str] = None,
        ts: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Encrypts payload into canonical envelope format using AES-256-GCM.
        Returns: Envelope dictionary ready for JSON serialization.
        """
        aes_key = self._resolve_session_key(key_id)

        # Serialize data to UTF-8 bytes
        if isinstance(data, (dict, list)):
            plaintext_bytes = json.dumps(data, separators=(",", ":")).encode("utf-8")
        elif isinstance(data, str):
            plaintext_bytes = data.encode("utf-8")
        elif isinstance(data, bytes):
            plaintext_bytes = data
        else:
            plaintext_bytes = str(data).encode("utf-8")

        if len(plaintext_bytes) > settings.PAYLOAD_ENCRYPTION_MAX_PAYLOAD_SIZE:
            raise PayloadEncryptionError(f"Payload size exceeds maximum allowed ({len(plaintext_bytes)} > {settings.PAYLOAD_ENCRYPTION_MAX_PAYLOAD_SIZE} bytes).")

        # 96-bit cryptographically secure random nonce
        iv = os.urandom(NONCE_LENGTH_BYTES)
        active_req_id = req_id or f"req-{uuid.uuid4().hex[:12]}"
        active_ts = ts if ts is not None else int(time.time())

        # Construct protocol Additional Authenticated Data
        aad = self.canonicalize_aad(
            version=ENCRYPTION_PROTOCOL_VERSION,
            method=method,
            path=path,
            key_id=key_id,
            direction=direction,
            req_id=active_req_id,
            ts=active_ts
        )

        # Encrypt with AES-GCM
        aesgcm = AESGCM(aes_key)
        ct_and_tag = aesgcm.encrypt(iv, plaintext_bytes, aad)

        # Slices: last 16 bytes are the authentication tag in cryptography AESGCM
        ciphertext = ct_and_tag[:-AUTH_TAG_LENGTH_BYTES]
        auth_tag = ct_and_tag[-AUTH_TAG_LENGTH_BYTES:]

        return {
            "version": ENCRYPTION_PROTOCOL_VERSION,
            "key_id": key_id,
            "iv": base64.b64encode(iv).decode("ascii"),
            "encrypted_data": base64.b64encode(ciphertext).decode("ascii"),
            "auth_tag": base64.b64encode(auth_tag).decode("ascii"),
            "req_id": active_req_id,
            "ts": active_ts
        }

    def decrypt_payload(
        self,
        envelope: Dict[str, Any],
        method: str,
        path: str,
        direction: str = "req"
    ) -> Any:
        """
        Validates envelope, checks freshness/replay, and decrypts ciphertext using AES-256-GCM.
        Returns: Decoded JSON object (dict/list).
        """
        self._cleanup_expired_entries()

        # Strict envelope structure validation
        if not isinstance(envelope, dict):
            raise InvalidEnvelopeError("Invalid encrypted envelope: must be a JSON object.")

        for required_field in ("version", "key_id", "iv", "encrypted_data", "auth_tag", "req_id", "ts"):
            if required_field not in envelope:
                raise InvalidEnvelopeError(f"Missing required envelope field: '{required_field}'.")

        version = envelope.get("version")
        if version != ENCRYPTION_PROTOCOL_VERSION:
            raise InvalidEnvelopeError(f"Unsupported envelope version '{version}'. Expected version {ENCRYPTION_PROTOCOL_VERSION}.")

        key_id = str(envelope["key_id"])
        req_id = str(envelope["req_id"])
        ts = int(envelope["ts"])

        # Decode base64 components
        try:
            iv = base64.b64decode(envelope["iv"])
            ciphertext = base64.b64decode(envelope["encrypted_data"])
            auth_tag = base64.b64decode(envelope["auth_tag"])
        except Exception as e:
            raise InvalidEnvelopeError(f"Malformed base64 encoding in envelope: {e}")

        if len(iv) != NONCE_LENGTH_BYTES:
            raise InvalidEnvelopeError(f"Invalid IV length: expected {NONCE_LENGTH_BYTES} bytes, got {len(iv)}.")
        if len(auth_tag) != AUTH_TAG_LENGTH_BYTES:
            raise InvalidEnvelopeError(f"Invalid auth_tag length: expected {AUTH_TAG_LENGTH_BYTES} bytes, got {len(auth_tag)}.")

        # Replay and Freshness Validation for incoming requests
        if direction == "req":
            self._validate_freshness_and_replay(req_id, ts)

        # Resolve AES-256 session key
        aes_key = self._resolve_session_key(key_id)

        # Reconstruct Additional Authenticated Data (AAD)
        aad = self.canonicalize_aad(
            version=version,
            method=method,
            path=path,
            key_id=key_id,
            direction=direction,
            req_id=req_id,
            ts=ts
        )

        # Combine ciphertext and auth tag for AESGCM
        ct_and_tag = ciphertext + auth_tag

        try:
            aesgcm = AESGCM(aes_key)
            plaintext_bytes = aesgcm.decrypt(iv, ct_and_tag, aad)
        except InvalidTag:
            log_security_event(
                "PAYLOAD_DECRYPTION_AUTH_TAG_FAILED",
                resource=f"key:{key_id}",
                status="DENIED",
                details={"method": method, "path": path, "req_id": req_id}
            )
            raise PayloadAuthenticationError("Cryptographic authentication failed: invalid tag or altered Additional Authenticated Data.")
        except Exception as e:
            logger.warning(f"Unexpected decryption failure: {e}")
            raise PayloadEncryptionError("Decryption operation failed.")

        # Parse decrypted payload as JSON
        try:
            return json.loads(plaintext_bytes.decode("utf-8"))
        except Exception:
            return plaintext_bytes.decode("utf-8", errors="replace")


# Singleton cryptographic service instance
payload_crypto = PayloadCryptoService()
