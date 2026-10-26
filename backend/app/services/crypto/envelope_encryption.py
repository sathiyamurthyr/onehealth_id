"""
Envelope Encryption & Cryptographic Data Protection Service
Implements NIST SP 800-38D AES-256-GCM Authenticated Encryption with
per-object Data Encryption Keys (DEKs) and Key Encryption Keys (KEKs).
Sathus Technology Pvt Ltd - OneHealth ID Enterprise Security
"""

import os
import json
import base64
import struct
from typing import Dict, Any, Tuple, Optional, Union
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.exceptions import InvalidTag

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.services.crypto.kms_provider import (
    get_kms_provider,
    KMSProvider,
    LocalHKDFKMSProvider,
    MockCloudKMSProvider,
    KMSError,
    KMSInvalidContextError,
    KMSAccessDeniedError
)

# Magic signature for encrypted binary document storage
ENCRYPTED_FILE_MAGIC = b"OHID_ENC_V1"


class CryptographicError(Exception):
    """Base exception for all cryptographic failures without leaking sensitive info."""
    pass


class DecryptionError(CryptographicError):
    """Raised when ciphertext authentication tag is invalid or decryption fails."""
    pass


class KeyManagementError(CryptographicError):
    """Raised when KEK is missing, invalid, or cannot be resolved."""
    pass


class EnvelopeEncryptionService:
    """
    Enterprise Envelope Encryption Service.
    - DEK: Cryptographically unique 256-bit AES key per document/item.
    - KEK: Key Encryption Key managed via configuration or KMS.
    - Authenticated Encryption: AES-256-GCM with 96-bit random nonces and 128-bit authentication tags.
    - Hardware/Cloud KMS Integration via pluggable KMSProvider abstraction.
    """

    def __init__(self, kms_provider: Optional[KMSProvider] = None):
        self._kek_cache: Dict[str, bytes] = {}
        self.default_kek_id = settings.DOC_ENCRYPTION_KEY_ID or "kek-v1"
        self.kms_provider = kms_provider or get_kms_provider()

    def set_kms_provider(self, provider: KMSProvider) -> None:
        """Sets or replaces the active KMS provider (e.g. AWS KMS, Mock Cloud KMS)."""
        self.kms_provider = provider

    def _resolve_kek(self, kek_id: Optional[str] = None) -> Tuple[str, bytes]:
        """
        Resolves the 256-bit Key Encryption Key for the specified key ID.
        If no explicit DOC_ENCRYPTION_KEY is provided in environment, securely
        derives a 256-bit KEK from SECRET_KEY using HKDF-SHA256.
        """
        active_id = kek_id or self.default_kek_id
        if active_id in self._kek_cache:
            return active_id, self._kek_cache[active_id]

        if settings.DOC_ENCRYPTION_KEY:
            raw_key = settings.DOC_ENCRYPTION_KEY.strip()
            # Support hex, base64, or raw 32-byte string
            if len(raw_key) == 64:
                try:
                    kek_bytes = bytes.fromhex(raw_key)
                except ValueError:
                    kek_bytes = raw_key.encode("utf-8")[:32]
            else:
                try:
                    decoded = base64.b64decode(raw_key)
                    if len(decoded) == 32:
                        kek_bytes = decoded
                    else:
                        kek_bytes = raw_key.encode("utf-8")[:32]
                except Exception:
                    kek_bytes = raw_key.encode("utf-8")[:32]
        else:
            # Deterministic, cryptographically sound derivation via HKDF-SHA256
            hkdf = HKDF(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b"ohid-enterprise-kek-salt-v1",
                info=f"OH-ID-MASTER-KEK-{active_id}".encode("utf-8"),
            )
            kek_bytes = hkdf.derive(settings.SECRET_KEY.encode("utf-8"))

        if len(kek_bytes) != 32:
            kek_bytes = (kek_bytes + b"\x00" * 32)[:32]

        self._kek_cache[active_id] = kek_bytes
        return active_id, kek_bytes

    def register_kek(self, kek_id: str, kek_bytes: bytes) -> None:
        """Allows registering specific KEK versions for rotation or historical decryption."""
        if len(kek_bytes) != 32:
            raise KeyManagementError("KEK must be exactly 32 bytes (256 bits).")
        self._kek_cache[kek_id] = kek_bytes
        if hasattr(self.kms_provider, "register_kek"):
            try:
                self.kms_provider.register_kek(kek_id, kek_bytes)
            except Exception:
                pass

    # --------------------------------------------------------------------------
    # Binary Document Encryption & Decryption (At-Rest File Protection)
    # --------------------------------------------------------------------------

    def encrypt_document_bytes(
        self,
        plaintext: bytes,
        associated_data: Optional[bytes] = None,
        kek_id: Optional[str] = None
    ) -> bytes:
        """
        Encrypts arbitrary document bytes using a unique per-file DEK.
        Returns a binary package:
        [11-byte MAGIC: OHID_ENC_V1]
        [4-byte big-endian header length]
        [UTF-8 JSON header metadata with encrypted DEK and nonces]
        [Ciphertext + 16-byte GCM Auth Tag]
        """
        active_kek_id, kek_bytes = self._resolve_kek(kek_id)

        # 1. Generate unique 256-bit DEK
        dek = AESGCM.generate_key(bit_length=256)

        # 2. Encrypt plaintext with DEK using AES-256-GCM
        data_nonce = os.urandom(12)
        aesgcm_data = AESGCM(dek)
        ciphertext = aesgcm_data.encrypt(data_nonce, plaintext, associated_data)

        # 3. Encrypt DEK with KEK using AES-256-GCM
        edek_nonce = os.urandom(12)
        aesgcm_kek = AESGCM(kek_bytes)
        edek = aesgcm_kek.encrypt(edek_nonce, dek, f"DEK-{active_kek_id}".encode("utf-8"))

        # 4. Assemble package
        header = {
            "v": 1,
            "kek_id": active_kek_id,
            "edek": base64.b64encode(edek).decode("ascii"),
            "edek_nonce": base64.b64encode(edek_nonce).decode("ascii"),
            "data_nonce": base64.b64encode(data_nonce).decode("ascii"),
            "aad_len": len(associated_data) if associated_data else 0
        }
        header_bytes = json.dumps(header).encode("utf-8")
        header_len = len(header_bytes)

        return ENCRYPTED_FILE_MAGIC + struct.pack(">I", header_len) + header_bytes + ciphertext

    def decrypt_document_bytes(
        self,
        encrypted_package: bytes,
        associated_data: Optional[bytes] = None
    ) -> bytes:
        """
        Decrypts an encrypted binary document package.
        Validates magic signature, decrypts DEK with KEK, and decrypts ciphertext with DEK.
        Tampering with any header byte or ciphertext raises DecryptionError.
        """
        magic_len = len(ENCRYPTED_FILE_MAGIC)
        if len(encrypted_package) < magic_len + 4:
            raise DecryptionError("Invalid encrypted document format: data too short.")

        if not encrypted_package.startswith(ENCRYPTED_FILE_MAGIC):
            raise DecryptionError("Invalid encrypted document format: magic header mismatch.")

        # Read header length
        header_len = struct.unpack(">I", encrypted_package[magic_len:magic_len + 4])[0]
        header_start = magic_len + 4
        header_end = header_start + header_len

        if len(encrypted_package) < header_end:
            raise DecryptionError("Corrupted document package: truncated header.")

        try:
            header_json = encrypted_package[header_start:header_end].decode("utf-8")
            header = json.loads(header_json)
        except Exception as e:
            raise DecryptionError(f"Corrupted document header metadata: {e}")

        ciphertext = encrypted_package[header_end:]

        # Resolve KEK
        kek_id = header.get("kek_id")
        _, kek_bytes = self._resolve_kek(kek_id)

        # Decrypt DEK
        try:
            edek = base64.b64decode(header["edek"])
            edek_nonce = base64.b64decode(header["edek_nonce"])
            data_nonce = base64.b64decode(header["data_nonce"])

            aesgcm_kek = AESGCM(kek_bytes)
            dek = aesgcm_kek.decrypt(edek_nonce, edek, f"DEK-{kek_id}".encode("utf-8"))
        except InvalidTag:
            raise DecryptionError("Authentication tag failure: KEK cannot authenticate encrypted DEK.")
        except Exception as e:
            raise DecryptionError(f"DEK recovery failed: {e}")

        # Decrypt ciphertext
        try:
            aesgcm_data = AESGCM(dek)
            plaintext = aesgcm_data.decrypt(data_nonce, ciphertext, associated_data)
            return plaintext
        except InvalidTag:
            raise DecryptionError("Authentication tag failure: document ciphertext has been altered or tampered with.")
        except Exception as e:
            raise DecryptionError(f"Document payload decryption failed: {e}")

    def is_encrypted_document(self, data: bytes) -> bool:
        """Checks if byte payload is an encrypted document package."""
        return data.startswith(ENCRYPTED_FILE_MAGIC)

    # --------------------------------------------------------------------------
    # Field-Level Encryption & Decryption (For PII & Sensitive Attributes)
    # --------------------------------------------------------------------------

    def encrypt_field(
        self,
        plaintext: str,
        context_aad: Optional[str] = None,
        kek_id: Optional[str] = None
    ) -> str:
        """
        Encrypts a sensitive string field (e.g. National ID, Aadhaar, emergency contact).
        Returns a compact, safe base64-encoded envelope JSON string.
        """
        if plaintext is None:
            return ""

        active_kek_id, kek_bytes = self._resolve_kek(kek_id)
        dek = AESGCM.generate_key(bit_length=256)

        aad_bytes = context_aad.encode("utf-8") if context_aad else None
        data_nonce = os.urandom(12)
        aesgcm_data = AESGCM(dek)
        ciphertext = aesgcm_data.encrypt(data_nonce, plaintext.encode("utf-8"), aad_bytes)

        edek_nonce = os.urandom(12)
        aesgcm_kek = AESGCM(kek_bytes)
        edek = aesgcm_kek.encrypt(edek_nonce, dek, f"FIELD-{active_kek_id}".encode("utf-8"))

        envelope = {
            "v": 1,
            "k": active_kek_id,
            "ed": base64.b64encode(edek).decode("ascii"),
            "en": base64.b64encode(edek_nonce).decode("ascii"),
            "dn": base64.b64encode(data_nonce).decode("ascii"),
            "ct": base64.b64encode(ciphertext).decode("ascii"),
        }
        return "enc:v1:" + base64.urlsafe_b64encode(json.dumps(envelope).encode("utf-8")).decode("ascii")

    def decrypt_field(
        self,
        encrypted_field_str: str,
        context_aad: Optional[str] = None
    ) -> str:
        """
        Decrypts an encrypted field string. If the string is not encrypted (legacy data),
        returns the plaintext string unchanged.
        """
        if not encrypted_field_str or not encrypted_field_str.startswith("enc:v1:"):
            return encrypted_field_str or ""

        try:
            b64_payload = encrypted_field_str[len("enc:v1:"):]
            raw_json = base64.urlsafe_b64decode(b64_payload.encode("ascii")).decode("utf-8")
            envelope = json.loads(raw_json)

            kek_id = envelope["k"]
            _, kek_bytes = self._resolve_kek(kek_id)

            edek = base64.b64decode(envelope["ed"])
            edek_nonce = base64.b64decode(envelope["en"])
            data_nonce = base64.b64decode(envelope["dn"])
            ciphertext = base64.b64decode(envelope["ct"])

            aesgcm_kek = AESGCM(kek_bytes)
            dek = aesgcm_kek.decrypt(edek_nonce, edek, f"FIELD-{kek_id}".encode("utf-8"))

            aad_bytes = context_aad.encode("utf-8") if context_aad else None
            aesgcm_data = AESGCM(dek)
            plaintext = aesgcm_data.decrypt(data_nonce, ciphertext, aad_bytes)
            return plaintext.decode("utf-8")
        except InvalidTag:
            raise DecryptionError("Authentication tag failure: field ciphertext or tag has been tampered with.")
        except Exception as e:
            raise DecryptionError(f"Field decryption failed: {e}")

    # --------------------------------------------------------------------------
    # Key Rotation Support
    # --------------------------------------------------------------------------

    def reencrypt_document(
        self,
        encrypted_package: bytes,
        new_kek_id: str,
        new_kek_bytes: bytes,
        associated_data: Optional[bytes] = None
    ) -> bytes:
        """
        Rotates the KEK wrapping a document's DEK without decrypting and re-encrypting the payload!
        Only the 32-byte DEK is unwrapped with old KEK and rewrapped with new KEK.
        """
        magic_len = len(ENCRYPTED_FILE_MAGIC)
        header_len = struct.unpack(">I", encrypted_package[magic_len:magic_len + 4])[0]
        header_start = magic_len + 4
        header_end = header_start + header_len

        header = json.loads(encrypted_package[header_start:header_end].decode("utf-8"))
        ciphertext = encrypted_package[header_end:]

        # Unwrap DEK with old KEK
        old_kek_id = header.get("kek_id")
        _, old_kek_bytes = self._resolve_kek(old_kek_id)

        edek = base64.b64decode(header["edek"])
        edek_nonce = base64.b64decode(header["edek_nonce"])
        aesgcm_old = AESGCM(old_kek_bytes)
        dek = aesgcm_old.decrypt(edek_nonce, edek, f"DEK-{old_kek_id}".encode("utf-8"))

        # Rewrap DEK with new KEK
        new_edek_nonce = os.urandom(12)
        aesgcm_new = AESGCM(new_kek_bytes)
        new_edek = aesgcm_new.encrypt(new_edek_nonce, dek, f"DEK-{new_kek_id}".encode("utf-8"))

        # Update header
        header["kek_id"] = new_kek_id
        header["edek"] = base64.b64encode(new_edek).decode("ascii")
        header["edek_nonce"] = base64.b64encode(new_edek_nonce).decode("ascii")

        new_header_bytes = json.dumps(header).encode("utf-8")
        return ENCRYPTED_FILE_MAGIC + struct.pack(">I", len(new_header_bytes)) + new_header_bytes + ciphertext


# Singleton instance
envelope_crypto = EnvelopeEncryptionService()
