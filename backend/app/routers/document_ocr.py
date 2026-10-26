"""
Document Upload and OCR Extraction Router
Endpoints for uploading supporting clinical and identity documents, running OCR extraction,
reviewing extracted entities, editing fields, and persisting approved records.
Sathus Technology Pvt Ltd - OneHealth ID
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    Depends,
    HTTPException,
    status,
    Body,
    Response
)
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.app.core.rbac import (
    get_current_user_context,
    require_any_permission,
    validate_hospital_tenant_scope
)
from backend.app.core.response import success_response, error_response
from backend.app.core.rate_limit import rate_limit_document_upload
from backend.app.services.ocr.ocr_service import ocr_service
from backend.app.services.ocr.file_validator import read_decrypted_document_bytes
from backend.app.core.logging import logger, log_security_event

router = APIRouter(prefix="/documents", tags=["Document Upload & OCR Identity Extraction"])


# Pydantic Request Models
class CorrectFieldsPayload(BaseModel):
    corrected_fields: Dict[str, Any] = Field(..., description="Map of field name to corrected value")


class ApproveDocumentPayload(BaseModel):
    final_fields: Dict[str, Any] = Field(default_factory=dict, description="Verified final fields")
    patient_id: Optional[str] = Field(None, description="Existing patient ID if matched or selected")
    create_provisional_patient: bool = Field(False, description="Flag to register provisional patient if none exists")


class RejectDocumentPayload(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500, description="Reason for rejecting the extracted document")


@router.post("/upload-ocr", dependencies=[Depends(rate_limit_document_upload)])
async def upload_document_for_ocr(
    file: UploadFile = File(...),
    document_category: str = Form(..., description="Document type: HOSPITAL_REGISTRATION, PATIENT_ID, DISCHARGE_SUMMARY, PRESCRIPTION, LAB_REPORT, MEDICAL_RECORD, REFERRAL_LETTER, INSURANCE_DOCUMENT, OTHER"),
    hospital_id: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(require_any_permission(
        "patient.create", "patient.read", "consultation.create", "clinical.write",
        "hospital.manage", "system.manage", "reception.manage"
    ))
):
    """
    Step 2 & 3: Uploads a document (PDF, JPG, PNG, WEBP, DOCX, MP4, MOV) when a patient or hospital cannot be found.
    Validates file signature, enforces size limits, and triggers OCR text extraction & field identification.
    """
    user_id = current_user.get("id") or current_user.get("user_ref_id") or current_user.get("username")
    effective_hospital = hospital_id or current_user.get("hospital_ref_id") or current_user.get("hospital_id")

    # Read uploaded file content
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    try:
        job = ocr_service.process_uploaded_document(
            file_bytes=content,
            original_filename=file.filename or "uploaded_document",
            document_category=document_category,
            uploader_user_id=user_id,
            hospital_id=effective_hospital
        )
        return success_response(
            data=job,
            message="Document uploaded and processed successfully. Please review the extracted information."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during document upload and OCR: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}"
        )


@router.get("/jobs/{job_id}")
def get_ocr_job(
    job_id: str,
    current_user: Dict[str, Any] = Depends(require_any_permission(
        "patient.read", "consultation.create", "clinical.write", "hospital.manage", "system.manage"
    ))
):
    """
    Step 4: Retrieves extracted fields, confidence scores, and duplicate warnings for human review.
    Enforces hospital/tenant isolation.
    """
    user_hospital = current_user.get("hospital_ref_id") or current_user.get("hospital_id")
    job = ocr_service.get_job_detail(job_id, user_hospital)
    return success_response(data=job)


@router.patch("/jobs/{job_id}/correct")
def correct_ocr_job_fields(
    job_id: str,
    payload: CorrectFieldsPayload,
    current_user: Dict[str, Any] = Depends(require_any_permission(
        "patient.create", "consultation.create", "clinical.write", "hospital.manage", "system.manage"
    ))
):
    """
    Step 4: Allows authorized reviewer to correct extracted values prior to approval.
    """
    user_id = current_user.get("id") or current_user.get("user_ref_id") or current_user.get("username")
    user_hospital = current_user.get("hospital_ref_id") or current_user.get("hospital_id")
    
    updated_job = ocr_service.correct_job_fields(
        job_id=job_id,
        corrected_fields=payload.corrected_fields,
        user_id=user_id,
        hospital_id=user_hospital
    )
    return success_response(data=updated_job, message="Fields successfully corrected.")


@router.post("/jobs/{job_id}/retry")
def retry_ocr_job(
    job_id: str,
    current_user: Dict[str, Any] = Depends(require_any_permission(
        "patient.create", "consultation.create", "clinical.write", "system.manage"
    ))
):
    """
    Retries OCR extraction on quarantined file.
    """
    user_id = current_user.get("id") or current_user.get("user_ref_id") or current_user.get("username")
    user_hospital = current_user.get("hospital_ref_id") or current_user.get("hospital_id")
    
    retried_job = ocr_service.retry_job_ocr(
        job_id=job_id,
        user_id=user_id,
        hospital_id=user_hospital
    )
    return success_response(data=retried_job, message="OCR extraction re-executed successfully.")


@router.post("/jobs/{job_id}/approve")
def approve_ocr_job(
    job_id: str,
    payload: ApproveDocumentPayload,
    current_user: Dict[str, Any] = Depends(require_any_permission(
        "patient.create", "consultation.create", "clinical.write", "hospital.manage", "system.manage"
    ))
):
    """
    Step 6: Confirms and approves extracted document. Persists records to existing oh_id.medical_documents table
    and moves file to approved storage location.
    """
    result = ocr_service.approve_and_persist_document(
        job_id=job_id,
        user=current_user,
        final_fields=payload.final_fields,
        patient_id=payload.patient_id,
        create_provisional_patient=payload.create_provisional_patient
    )
    return success_response(data=result, message=result["message"])


@router.post("/jobs/{job_id}/reject")
def reject_ocr_job(
    job_id: str,
    payload: RejectDocumentPayload,
    current_user: Dict[str, Any] = Depends(require_any_permission(
        "patient.create", "consultation.create", "clinical.write", "hospital.manage", "system.manage"
    ))
):
    """
    Rejects the document OCR extraction, removes quarantined file, and updates status to REJECTED.
    """
    user_id = current_user.get("id") or current_user.get("user_ref_id") or current_user.get("username")
    user_hospital = current_user.get("hospital_ref_id") or current_user.get("hospital_id")
    
    result = ocr_service.reject_job(
        job_id=job_id,
        user_id=user_id,
        rejection_reason=payload.reason,
        hospital_id=user_hospital
    )
    return success_response(data=result, message=result["message"])


@router.get("/jobs/{job_id}/file")
def get_ocr_job_file(
    job_id: str,
    current_user: Dict[str, Any] = Depends(require_any_permission(
        "patient.read", "consultation.create", "clinical.write", "hospital.manage", "system.manage"
    ))
):
    """
    Streams original document preview to authorized reviewer (inline rendering for PDF and images).
    Decrypts envelope-encrypted data on-the-fly and enforces strict hospital tenant isolation.
    """
    user_hospital = current_user.get("hospital_ref_id") or current_user.get("hospital_id")
    user_perms = current_user.get("permissions", [])
    job = ocr_service.get_job_detail(job_id, user_hospital)

    # Tenant boundary enforcement: Non-platform users cannot access jobs from other facilities
    if "system.manage" not in user_perms and user_hospital and job.get("hospital_id") and job["hospital_id"] != user_hospital:
        log_security_event("TENANT_ACCESS_DENIED", actor_id=current_user.get("username"), resource=f"ocr_job:{job_id}", status="DENIED")
        raise HTTPException(status_code=403, detail="Forbidden: Document belongs to a different hospital facility.")

    try:
        decrypted_bytes = read_decrypted_document_bytes(
            storage_path=job["storage_path"],
            job_id=job_id,
            filename=job.get("file_name"),
            hospital_id=job.get("hospital_id")
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document file not found on server.")
    except Exception as e:
        logger.error(f"Failed to decrypt document {job_id}: {e}")
        raise HTTPException(status_code=500, detail="Document decryption failed.")

    log_security_event(
        "DOCUMENT_PREVIEWED",
        actor_id=current_user.get("username") or current_user.get("id"),
        hospital_id=job.get("hospital_id"),
        resource=f"ocr_job:{job_id}",
        status="SUCCESS",
        details={"file_name": job.get("file_name"), "mime_type": job.get("mime_type")}
    )

    mime = job.get("mime_type", "application/octet-stream")
    return Response(
        content=decrypted_bytes,
        media_type=mime,
        headers={
            "Content-Disposition": f"inline; filename=\"{job.get('file_name', 'document')}\"",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-cache, no-store, must-revalidate"
        }
    )

