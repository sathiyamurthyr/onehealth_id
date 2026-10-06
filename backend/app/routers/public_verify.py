from fastapi import APIRouter, HTTPException, status
from typing import Optional, Dict, Any
from backend.app.core.response import success_response
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.core.logging import logger

router = APIRouter(prefix="", tags=["Public Digital Verification & Secure Shares"])

@router.get("/public/verify/prescription/{token}")
def verify_prescription_public(token: str):
    """
    Publicly verifies digital prescription authenticity using cryptographic token or RX ID.
    Returns minimal verification metadata without exposing confidential diagnoses or clinical notes.
    """
    try:
        verification = sp_repository.verify_prescription_public(token)
        if not verification:
            raise HTTPException(
                status_code=404,
                detail="Prescription record not found or invalid digital verification token."
            )
        return success_response(
            data=verification,
            message="Prescription authenticity verified successfully."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to verify prescription public token {token}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Prescription verification service temporarily unavailable.")

@router.get("/public/share/prescription/{token}")
def get_shared_prescription(token: str):
    """
    Retrieves time-limited, shared digital prescription for designated recipient.
    Validates expiration and revocation status.
    """
    try:
        shared_data = sp_repository.get_shared_prescription(token)
        if not shared_data:
            raise HTTPException(
                status_code=404,
                detail="Secure prescription share link was not found."
            )

        if not shared_data.get("is_valid_share", True):
            return {
                "success": False,
                "error": {
                    "code": "SHARE_LINK_EXPIRED_OR_REVOKED",
                    "message": shared_data.get("reason", "This secure prescription share link has expired or been revoked.")
                },
                "data": shared_data
            }

        return success_response(
            data=shared_data,
            message="Shared prescription retrieved successfully."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch shared prescription token {token}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load shared prescription.")


@router.get("/public/verify/lab-report/{token}")
def verify_lab_report_public(token: str):
    """
    Publicly verifies laboratory diagnostic report authenticity using cryptographic token or Report ID.
    Returns laboratory accreditation and authenticity metadata without violating patient confidentiality.
    """
    try:
        verification = sp_repository.verify_lab_report_public(token)
        if not verification:
            raise HTTPException(
                status_code=404,
                detail="Laboratory report not found or invalid digital verification token."
            )
        return success_response(
            data=verification,
            message="Laboratory report authenticity verified successfully."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to verify lab report public token {token}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Laboratory report verification service temporarily unavailable.")


@router.get("/public/share/lab-report/{token}")
def get_shared_lab_report(token: str):
    """
    Retrieves time-limited, shared diagnostic lab report for designated recipient (e.g. consulting doctor).
    Validates expiration, revocation status, and allowed access levels.
    """
    try:
        shared_data = sp_repository.get_shared_lab_report(token)
        if not shared_data:
            raise HTTPException(
                status_code=404,
                detail="Secure laboratory report share link was not found."
            )

        if not shared_data.get("is_valid_share", True):
            return {
                "success": False,
                "error": {
                    "code": "SHARE_LINK_EXPIRED_OR_REVOKED",
                    "message": shared_data.get("reason", "This secure lab report share link has expired or been revoked.")
                },
                "data": shared_data
            }

        return success_response(
            data=shared_data,
            message="Shared laboratory report retrieved successfully."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch shared lab report token {token}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load shared laboratory report.")


@router.get("/public/verify/document/{token}")
def verify_document_public(token: str):
    """
    Publicly verifies digital medical document authenticity using cryptographic token or Document Code.
    Returns zero-knowledge verification metadata without exposing confidential diagnoses or clinical notes.
    """
    try:
        verification = sp_repository.verify_document_public(token)
        if not verification:
            raise HTTPException(
                status_code=404,
                detail="Medical document record not found or invalid digital verification token."
            )
        return success_response(
            data=verification,
            message="Medical document authenticity verified successfully."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to verify medical document public token {token}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Medical document verification service temporarily unavailable.")


@router.get("/public/share/document/{token}")
def get_shared_document(token: str):
    """
    Retrieves time-limited, shared medical document for designated recipient.
    Validates expiration and revocation status.
    """
    try:
        shared_data = sp_repository.get_shared_document(token)
        if not shared_data:
            raise HTTPException(
                status_code=404,
                detail="Secure medical document share link was not found."
            )

        if not shared_data.get("is_active", True):
            reason = shared_data.get("revocation_reason") or ("Link expired" if shared_data.get("expires_at") else "This secure medical document share link has expired or been revoked.")
            return {
                "success": False,
                "error": {
                    "code": "SHARE_LINK_EXPIRED_OR_REVOKED",
                    "message": reason
                },
                "data": shared_data
            }

        return success_response(
            data=shared_data,
            message="Shared medical document retrieved successfully."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch shared medical document token {token}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load shared medical document.")

