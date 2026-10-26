"""
OneHealth ID (OH-ID) — Centralized API Payload Encryption Middleware
Automatically decrypts encrypted incoming requests before endpoint execution
and encrypts eligible outgoing responses before transmission.
Preserves existing FastAPI validation, dependency injection, and RBAC boundaries.
Sathus Technology Pvt Ltd - Enterprise DevSecOps Architecture
"""

import json
from typing import Set
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.datastructures import MutableHeaders

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.payload_crypto import (
    payload_crypto,
    PayloadEncryptionError,
    PayloadAuthenticationError,
    PayloadReplayError,
    KeyNotFoundError,
    InvalidEnvelopeError
)


# Exact or prefix path exclusions from payload encryption
EXCLUDED_PATHS: Set[str] = {
    "/health",
    "/health/security",
    "/openapi.json",
    "/docs",
    "/redoc",
    "/favicon.ico",
    "/apple-icon.png",
    "/icon.png",
}

EXCLUDED_PREFIXES = (
    "/crypto/",
    "/api/v1/crypto/",
    "/health",
    "/openapi",
    "/docs",
    "/redoc",
    "/static/",
    "/api/v1/ocr/jobs/",    # Streamed files / preview endpoints handled separately
    "/api/v1/prescriptions/", # Streamed PDFs handled separately
    "/api/v1/patients/verify-qr/", # Public kiosk scanner
    "/api/v1/verify/",      # Public verification portals
)


def is_route_excluded(path: str) -> bool:
    """Returns True if the route must bypass application-layer payload encryption."""
    if path in EXCLUDED_PATHS:
        return True
    return any(path.startswith(prefix) for prefix in EXCLUDED_PREFIXES)


class PayloadEncryptionMiddleware(BaseHTTPMiddleware):
    """
    Centralized ASGI Payload Encryption Middleware for FastAPI.
    - Decrypts incoming request envelopes on mutating endpoints.
    - Replaces request body stream with clean plaintext JSON for endpoint consumption.
    - Encrypts eligible response payloads for clients holding an active session key.
    - Bypasses non-JSON, file streams, health checks, and public QR verification endpoints.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # 1. Check if route is excluded
        if is_route_excluded(path) or not settings.PAYLOAD_ENCRYPTION_ENABLED:
            return await call_next(request)

        # Initialize request state
        request.state.was_encrypted = False
        request.state.encryption_key_id = None

        content_type = request.headers.get("content-type", "").lower()
        is_multipart = "multipart/form-data" in content_type

        # 2. Inbound Request Decryption
        if not is_multipart and request.method in ("POST", "PUT", "PATCH", "DELETE"):
            body_bytes = await request.body()
            if body_bytes:
                is_encrypted_request = False
                envelope_candidate = None

                # Check headers or envelope signature
                if request.headers.get("x-oh-encrypted") == "1" or "application/vnd.oh-id.encrypted" in content_type:
                    is_encrypted_request = True

                try:
                    parsed_json = json.loads(body_bytes.decode("utf-8"))
                    if isinstance(parsed_json, dict) and "encrypted_data" in parsed_json and "auth_tag" in parsed_json:
                        is_encrypted_request = True
                        envelope_candidate = parsed_json
                except Exception:
                    pass

                if is_encrypted_request:
                    if not envelope_candidate:
                        try:
                            envelope_candidate = json.loads(body_bytes.decode("utf-8"))
                        except Exception:
                            return JSONResponse(
                                status_code=400,
                                content={"error": {"code": "MALFORMED_ENVELOPE", "message": "Invalid JSON in encrypted payload envelope."}}
                            )

                    try:
                        decrypted_data = payload_crypto.decrypt_payload(
                            envelope=envelope_candidate,
                            method=request.method,
                            path=request.url.path,
                            direction="req"
                        )
                        # Re-inject decrypted plaintext into request stream for downstream FastAPI handlers
                        plaintext_bytes = json.dumps(decrypted_data).encode("utf-8")
                        async def receive():
                            return {"type": "http.request", "body": plaintext_bytes, "more_body": False}
                        request._receive = receive
                        request._body = plaintext_bytes

                        # Mark request as encrypted and store key_id for symmetric response encryption
                        request.state.was_encrypted = True
                        request.state.encryption_key_id = envelope_candidate.get("key_id")
                    except PayloadReplayError as e:
                        return JSONResponse(
                            status_code=409,
                            content={"error": {"code": "REPLAY_DETECTED", "message": str(e)}}
                        )
                    except PayloadAuthenticationError as e:
                        return JSONResponse(
                            status_code=400,
                            content={"error": {"code": "CRYPTO_AUTH_FAILED", "message": str(e)}}
                        )
                    except KeyNotFoundError as e:
                        return JSONResponse(
                            status_code=401,
                            content={"error": {"code": "KEY_EXPIRED_OR_NOT_FOUND", "message": str(e)}}
                        )
                    except (InvalidEnvelopeError, PayloadEncryptionError) as e:
                        return JSONResponse(
                            status_code=400,
                            content={"error": {"code": "INVALID_ENCRYPTED_PAYLOAD", "message": str(e)}}
                        )
                    except Exception as e:
                        logger.error(f"Unexpected decryption error: {e}")
                        return JSONResponse(
                            status_code=500,
                            content={"error": {"code": "DECRYPTION_FAILED", "message": "Payload decryption failed."}}
                        )
                elif settings.PAYLOAD_ENCRYPTION_STRICT:
                    # Under strict mode, reject unencrypted requests on sensitive mutating endpoints
                    auth_header = request.headers.get("authorization", "")
                    if not (auth_header and auth_header.startswith("Bearer ")):
                        return JSONResponse(
                            status_code=400,
                            content={"error": {"code": "ENCRYPTION_REQUIRED", "message": "Encrypted payload envelope required on this endpoint."}}
                        )
        elif settings.PAYLOAD_ENCRYPTION_STRICT and request.method == "GET":
            is_encrypted_client = (
                request.headers.get("x-oh-encrypted") == "1"
                or "application/vnd.oh-id.encrypted" in content_type
                or "application/vnd.oh-id.encrypted" in request.headers.get("accept", "")
            )
            if not is_encrypted_client:
                return JSONResponse(
                    status_code=400,
                    content={"error": {"code": "ENCRYPTION_REQUIRED", "message": "All API requests must be encrypted using an established ECDH session key."}}
                )

        # 3. Call downstream endpoint
        response: Response = await call_next(request)

        # 4. Outbound Response Encryption
        # Only encrypt successful JSON responses where client supports or requested encryption
        key_id = (
            request.state.encryption_key_id
            or request.headers.get("x-session-key-id")
            or (request.headers.get("x-oh-encrypted") and "k-test-headless")
        )

        client_wants_encryption = (
            request.state.was_encrypted
            or request.headers.get("x-oh-encrypted") == "1"
            or "application/vnd.oh-id.encrypted" in request.headers.get("accept", "")
        )

        resp_content_type = response.headers.get("content-type", "").lower()
        is_json_response = "application/json" in resp_content_type

        # Check if response should be encrypted
        if (
            client_wants_encryption
            and key_id
            and is_json_response
            and 200 <= response.status_code < 300
            and not is_route_excluded(path)
        ):
            # Read response body iterator
            response_body_bytes = [section async for section in response.body_iterator]
            full_body = b"".join(response_body_bytes)

            try:
                data_to_encrypt = json.loads(full_body.decode("utf-8"))
                envelope = payload_crypto.encrypt_payload(
                    data=data_to_encrypt,
                    key_id=key_id,
                    method=request.method,
                    path=request.url.path,
                    direction="res"
                )

                encrypted_json_bytes = json.dumps(envelope).encode("utf-8")

                # Create new response with encrypted body and updated headers
                headers = dict(response.headers)
                headers["Content-Length"] = str(len(encrypted_json_bytes))
                headers["X-OH-Encrypted"] = "1"
                headers["Content-Type"] = "application/json"

                return Response(
                    content=encrypted_json_bytes,
                    status_code=response.status_code,
                    headers=headers,
                    media_type="application/json"
                )
            except Exception as enc_err:
                logger.error(f"Failed to encrypt response for {path}: {enc_err}")
                # Fall back to original response if encryption fails
                return Response(
                    content=full_body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type
                )

        return response
