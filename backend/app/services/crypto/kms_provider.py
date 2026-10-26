"""
KMS Abstraction & Cloud Key Management Service
Implements enterprise key encryption key (KEK) management, hardware security module
abstractions, cryptographic context binding, least-privilege policies, and fail-safe error handling.
Sathus Technology Pvt Ltd - OneHealth ID Enterprise Security
"""

import os
import json
import base64
from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple, Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.exceptions import InvalidTag

from backend.app.core.config import settings
from backend.app.core.logging import logger, log_security_event


class KMSError(Exception):
    """Base exception for Key Management Service operations."""
    pass


class KMSAccessDeniedError(KMSError):
    """Raised when IAM role lacks kms:Decrypt or kms:GenerateDataKey."""
    pass


class KMSUnavailableError(KMSError):
    """Raised when KMS endpoint or HSM appliance is unreachable."""
    pass


class KMSInvalidContextError(KMSError):
    """Raised when encryption context (tenant, doc) does not match during unwrap."""
    pass


class KMSProvider(ABC):
    """Abstract interface for Enterprise Key Management Services (AWS KMS, GCP KMS, Vault, HSM)."""

    @abstractmethod
    def generate_data_key(
        self,
        key_id: str,
        encryption_context: Optional[Dict[str, str]] = None
    ) -> Tuple[bytes, bytes]:
        """
        Generates an ephemeral 256-bit DEK.
        Returns: Tuple of (plaintext_dek, encrypted_dek)
        """
        pass

    @abstractmethod
    def encrypt_dek(
        self,
        plaintext_dek: bytes,
        key_id: str,
        encryption_context: Optional[Dict[str, str]] = None
    ) -> bytes:
        """Wraps/encrypts a 32-byte DEK under the specified Master KEK."""
        pass

    @abstractmethod
    def decrypt_dek(
        self,
        encrypted_dek: bytes,
        key_id: str,
        encryption_context: Optional[Dict[str, str]] = None
    ) -> bytes:
        """Unwraps/decrypts an encrypted DEK. Validates cryptographic context."""
        pass


class LocalHKDFKMSProvider(KMSProvider):
    """
    Cryptographically sound software KMS provider using HKDF-SHA256 and AES-256-GCM.
    Used for local development, staging sandbox, and off-grid disaster recovery.
    """

    def __init__(self):
        self._kek_cache: Dict[str, bytes] = {}

    def _resolve_kek_bytes(self, key_id: str) -> bytes:
        if key_id in self._kek_cache:
            return self._kek_cache[key_id]

        if settings.DOC_ENCRYPTION_KEY and key_id == settings.DOC_ENCRYPTION_KEY_ID:
            raw = settings.DOC_ENCRYPTION_KEY.strip()
            if len(raw) == 64:
                try:
                    kek_bytes = bytes.fromhex(raw)
                except ValueError:
                    kek_bytes = raw.encode("utf-8")[:32]
            else:
                try:
                    decoded = base64.b64decode(raw)
                    kek_bytes = decoded if len(decoded) == 32 else raw.encode("utf-8")[:32]
                except Exception:
                    kek_bytes = raw.encode("utf-8")[:32]
        else:
            hkdf = HKDF(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b"ohid-enterprise-kek-salt-v1",
                info=f"OH-ID-MASTER-KEK-{key_id}".encode("utf-8"),
            )
            kek_bytes = hkdf.derive(settings.SECRET_KEY.encode("utf-8"))

        if len(kek_bytes) != 32:
            kek_bytes = (kek_bytes + b"\x00" * 32)[:32]

        self._kek_cache[key_id] = kek_bytes
        return kek_bytes

    def register_kek(self, key_id: str, kek_bytes: bytes) -> None:
        if len(kek_bytes) != 32:
            raise KMSError("Master KEK must be exactly 32 bytes (256 bits).")
        self._kek_cache[key_id] = kek_bytes

    def _context_to_aad(self, key_id: str, encryption_context: Optional[Dict[str, str]]) -> bytes:
        if not encryption_context:
            return f"DEK-{key_id}".encode("utf-8")
        # Deterministically sorted context JSON for AAD binding
        sorted_ctx = json.dumps(encryption_context, sort_keys=True)
        return f"DEK-{key_id}:{sorted_ctx}".encode("utf-8")

    def generate_data_key(
        self,
        key_id: str,
        encryption_context: Optional[Dict[str, str]] = None
    ) -> Tuple[bytes, bytes]:
        plaintext_dek = AESGCM.generate_key(bit_length=256)
        encrypted_dek = self.encrypt_dek(plaintext_dek, key_id, encryption_context)
        return plaintext_dek, encrypted_dek

    def encrypt_dek(
        self,
        plaintext_dek: bytes,
        key_id: str,
        encryption_context: Optional[Dict[str, str]] = None
    ) -> bytes:
        kek_bytes = self._resolve_kek_bytes(key_id)
        nonce = os.urandom(12)
        aad = self._context_to_aad(key_id, encryption_context)
        aesgcm = AESGCM(kek_bytes)
        ciphertext = aesgcm.encrypt(nonce, plaintext_dek, aad)
        # 12-byte nonce prepended to wrapped key
        return nonce + ciphertext

    def decrypt_dek(
        self,
        encrypted_dek: bytes,
        key_id: str,
        encryption_context: Optional[Dict[str, str]] = None
    ) -> bytes:
        if len(encrypted_dek) < 28:
            raise KMSError("Encrypted DEK is malformed or truncated.")
        kek_bytes = self._resolve_kek_bytes(key_id)
        nonce = encrypted_dek[:12]
        ciphertext = encrypted_dek[12:]
        aad = self._context_to_aad(key_id, encryption_context)
        aesgcm = AESGCM(kek_bytes)
        try:
            return aesgcm.decrypt(nonce, ciphertext, aad)
        except InvalidTag:
            raise KMSInvalidContextError("KMS decryption failed: Authentication tag failure or context mismatch.")


class MockCloudKMSProvider(KMSProvider):
    """
    Simulates enterprise Cloud KMS (e.g., AWS KMS / GCP Cloud KMS / HashiCorp Vault).
    Enforces least-privilege IAM policies, explicit key ARNs, and simulated failure modes.
    """

    def __init__(self, key_arn: str = "arn:aws:kms:ap-south-1:112233445566:key/ohid-prod-kek"):
        self.key_arn = key_arn
        self._keys: Dict[str, bytes] = {
            key_arn: os.urandom(32),
            "arn:aws:kms:ap-south-1:112233445566:key/ohid-kek-v2": os.urandom(32)
        }
        self.is_reachable = True
        self.iam_allowed = True

    def set_availability(self, reachable: bool, iam_allowed: bool = True) -> None:
        """Used in test suites to simulate network partitions or IAM permission revokes."""
        self.is_reachable = reachable
        self.iam_allowed = iam_allowed

    def _check_policies(self, action: str):
        if not self.is_reachable:
            raise KMSUnavailableError("Cloud KMS service endpoint unreachable (connection timeout).")
        if not self.iam_allowed:
            raise KMSAccessDeniedError(f"User/Role lacks permission '{action}' on resource '{self.key_arn}'.")

    def generate_data_key(
        self,
        key_id: str,
        encryption_context: Optional[Dict[str, str]] = None
    ) -> Tuple[bytes, bytes]:
        self._check_policies("kms:GenerateDataKey")
        target_arn = key_id if "arn:" in key_id else self.key_arn
        if target_arn not in self._keys:
            self._keys[target_arn] = os.urandom(32)

        master_key = self._keys[target_arn]
        plaintext_dek = AESGCM.generate_key(bit_length=256)

        nonce = os.urandom(12)
        context_aad = json.dumps(encryption_context or {}, sort_keys=True).encode("utf-8")
        aesgcm = AESGCM(master_key)
        ciphertext = aesgcm.encrypt(nonce, plaintext_dek, context_aad)
        encrypted_dek = nonce + ciphertext

        return plaintext_dek, encrypted_dek

    def encrypt_dek(
        self,
        plaintext_dek: bytes,
        key_id: str,
        encryption_context: Optional[Dict[str, str]] = None
    ) -> bytes:
        self._check_policies("kms:Encrypt")
        target_arn = key_id if "arn:" in key_id else self.key_arn
        if target_arn not in self._keys:
            self._keys[target_arn] = os.urandom(32)

        master_key = self._keys[target_arn]
        nonce = os.urandom(12)
        context_aad = json.dumps(encryption_context or {}, sort_keys=True).encode("utf-8")
        aesgcm = AESGCM(master_key)
        ciphertext = aesgcm.encrypt(nonce, plaintext_dek, context_aad)
        return nonce + ciphertext

    def decrypt_dek(
        self,
        encrypted_dek: bytes,
        key_id: str,
        encryption_context: Optional[Dict[str, str]] = None
    ) -> bytes:
        self._check_policies("kms:Decrypt")
        target_arn = key_id if "arn:" in key_id else self.key_arn
        if target_arn not in self._keys:
            raise KMSError(f"Key '{target_arn}' does not exist in KMS.")

        master_key = self._keys[target_arn]
        nonce = encrypted_dek[:12]
        ciphertext = encrypted_dek[12:]
        context_aad = json.dumps(encryption_context or {}, sort_keys=True).encode("utf-8")

        aesgcm = AESGCM(master_key)
        try:
            return aesgcm.decrypt(nonce, ciphertext, context_aad)
        except InvalidTag:
            raise KMSInvalidContextError("KMS decryption failed: Encryption context mismatch or tampered DEK.")


class AWSKMSProvider(KMSProvider):
    """
    Production AWS KMS Key Management Service Provider.
    Calls AWS KMS via boto3 with cryptographic context binding and least-privilege IAM enforcement.
    """

    def __init__(self, key_arn: Optional[str] = None, region_name: str = "ap-south-1"):
        self.key_arn = key_arn or settings.KMS_KEY_ARN
        self.region_name = region_name
        self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client
        try:
            import boto3
            from botocore.config import Config
            config = Config(
                retries={"max_attempts": 3, "mode": "standard"},
                connect_timeout=2.0,
                read_timeout=3.0
            )
            self._client = boto3.client("kms", region_name=self.region_name, config=config)
            return self._client
        except Exception as e:
            logger.error(f"Failed to initialize AWS KMS client: {e}")
            raise KMSUnavailableError(f"AWS KMS client initialization failed: {e}")

    def generate_data_key(
        self,
        key_id: str,
        encryption_context: Optional[Dict[str, str]] = None
    ) -> Tuple[bytes, bytes]:
        client = self._get_client()
        target_arn = key_id if "arn:" in key_id else self.key_arn
        if not target_arn:
            raise KMSUnavailableError("AWS KMS Key ARN is not configured.")
        try:
            kwargs = {
                "KeyId": target_arn,
                "KeySpec": "AES_256",
            }
            if encryption_context:
                kwargs["EncryptionContext"] = encryption_context
            resp = client.generate_data_key(**kwargs)
            plaintext_dek = resp["Plaintext"]
            encrypted_dek = resp["CiphertextBlob"]
            return plaintext_dek, encrypted_dek
        except Exception as err:
            err_str = str(err)
            if "AccessDenied" in err_str:
                raise KMSAccessDeniedError(f"AWS KMS access denied for key {target_arn}: {err_str}")
            raise KMSUnavailableError(f"AWS KMS generate_data_key failed: {err_str}")

    def encrypt_dek(
        self,
        plaintext_dek: bytes,
        key_id: str,
        encryption_context: Optional[Dict[str, str]] = None
    ) -> bytes:
        client = self._get_client()
        target_arn = key_id if "arn:" in key_id else self.key_arn
        if not target_arn:
            raise KMSUnavailableError("AWS KMS Key ARN is not configured.")
        try:
            kwargs = {
                "KeyId": target_arn,
                "Plaintext": plaintext_dek
            }
            if encryption_context:
                kwargs["EncryptionContext"] = encryption_context
            resp = client.encrypt(**kwargs)
            return resp["CiphertextBlob"]
        except Exception as err:
            err_str = str(err)
            if "AccessDenied" in err_str:
                raise KMSAccessDeniedError(f"AWS KMS access denied for key {target_arn}: {err_str}")
            raise KMSUnavailableError(f"AWS KMS encrypt_dek failed: {err_str}")

    def decrypt_dek(
        self,
        encrypted_dek: bytes,
        key_id: str,
        encryption_context: Optional[Dict[str, str]] = None
    ) -> bytes:
        client = self._get_client()
        try:
            kwargs = {
                "CiphertextBlob": encrypted_dek
            }
            if key_id and "arn:" in key_id:
                kwargs["KeyId"] = key_id
            if encryption_context:
                kwargs["EncryptionContext"] = encryption_context
            resp = client.decrypt(**kwargs)
            return resp["Plaintext"]
        except Exception as err:
            err_str = str(err)
            if "InvalidCiphertextException" in err_str or "AccessDenied" in err_str:
                raise KMSInvalidContextError(f"AWS KMS decryption failed: Context mismatch or invalid ciphertext: {err_str}")
            raise KMSUnavailableError(f"AWS KMS decrypt_dek failed: {err_str}")


def get_kms_provider() -> KMSProvider:
    """
    Factory to resolve the active KMS provider according to system configuration.
    Strictly forbids falling back to local development keys when running in production.
    """
    provider_type = settings.KMS_PROVIDER.lower().strip()

    # In production, disallow silent fallback to local development key provider!
    if settings.ENVIRONMENT == "production":
        if provider_type not in ("aws_kms", "cloud_kms"):
            raise RuntimeError(
                "FATAL SECURITY CONFIGURATION: Production environment must use a managed cloud KMS (e.g. KMS_PROVIDER='aws_kms'). "
                "Local development key provider is strictly forbidden in production."
            )

    if provider_type in ("aws_kms", "cloud_kms"):
        return AWSKMSProvider(key_arn=settings.KMS_KEY_ARN)
    elif provider_type == "mock_cloud_kms":
        return MockCloudKMSProvider(key_arn=settings.KMS_KEY_ARN or "arn:aws:kms:ap-south-1:112233445566:key/ohid-prod-kek")

    # Default to LocalHKDFKMSProvider for development and synthetic tests
    return LocalHKDFKMSProvider()
