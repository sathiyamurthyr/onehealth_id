"""
OneHealth ID (OH-ID) — Cryptographic Key Agreement & Handshake Router
Provides ephemeral ECDH P-256 key exchange for zero-storage browser session encryption.
Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any

from backend.app.core.config import settings
from backend.app.core.payload_crypto import payload_crypto, InvalidEnvelopeError
from backend.app.core.response import success_response


router = APIRouter(prefix="/crypto", tags=["Cryptography & Key Exchange"])


class HandshakeRequest(BaseModel):
    client_public_key: str = Field(
        ...,
        description="Base64-encoded 65-byte uncompressed P-256 public key (starts with 0x04)",
        min_length=80,
        max_length=120
    )


class HandshakeResponse(BaseModel):
    version: int
    key_id: str
    server_public_key: str
    algorithm: str
    curve: str
    kdf: str
    expires_at: int
    timestamp_window_seconds: int


@router.post("/handshake", response_model=HandshakeResponse, status_code=status.HTTP_200_OK)
def perform_cryptographic_handshake(req: HandshakeRequest):
    """
    Step 1: Cryptographic Key Agreement.
    Accepts client ephemeral ECDH P-256 public key, generates server keypair,
    derives shared AES-256-GCM traffic key, and returns server public key + key_id.
    Zero raw keys are transmitted over the network.
    """
    if not settings.PAYLOAD_ENCRYPTION_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payload encryption subsystem is currently disabled."
        )

    try:
        handshake_data = payload_crypto.perform_handshake(req.client_public_key)
        return HandshakeResponse(**handshake_data)
    except InvalidEnvelopeError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cryptographic key establishment failed."
        )


@router.get("/status")
def get_crypto_subsystem_status():
    """
    DevSecOps Health Check for Application-Layer Encryption Subsystem.
    Zero disclosure of key material or secret keys.
    """
    return success_response(data={
        "status": "ACTIVE" if settings.PAYLOAD_ENCRYPTION_ENABLED else "DISABLED",
        "algorithm": "AES-256-GCM",
        "curve": "NIST P-256 (secp256r1)",
        "kdf": "HKDF-SHA256",
        "version": 1,
        "strict_mode": settings.PAYLOAD_ENCRYPTION_STRICT,
        "timestamp_window_seconds": settings.PAYLOAD_ENCRYPTION_TIMESTAMP_WINDOW,
        "key_ttl_seconds": settings.PAYLOAD_ENCRYPTION_KEY_TTL_SECONDS
    })
