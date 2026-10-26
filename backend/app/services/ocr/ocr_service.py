"""
Document OCR Pipeline Service Orchestrator
Coordinates file quarantine, text extraction, field normalization, confidence scoring,
duplicate matching, and secure persistence to existing OH-ID clinical records.
Sathus Technology Pvt Ltd - OneHealth ID
"""

import uuid
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status
from backend.app.database.session import get_db_cursor, get_readonly_cursor
from backend.app.repositories.sp_views_repository import sp_repository
from backend.app.services.ocr.file_validator import (
    validate_and_quarantine_file,
    promote_quarantined_file_to_approved,
    delete_quarantined_file,
    read_decrypted_document_bytes,
)
from backend.app.services.ocr.pdfium_engine import PDFiumOCREngine
from backend.app.services.ocr.image_engine import ImageAndMediaOCREngine
from backend.app.services.ocr.extractor import DocumentFieldExtractor
from backend.app.services.ocr.duplicate_detector import DocumentDuplicateDetector
from backend.app.core.logging import logger, log_security_event


class DocumentOCRService:
    def __init__(self):
        self.pdfium_engine = PDFiumOCREngine()
        self.image_engine = ImageAndMediaOCREngine()
        self.extractor = DocumentFieldExtractor()
        self.duplicate_detector = DocumentDuplicateDetector()

    def process_uploaded_document(
        self,
        file_bytes: bytes,
        original_filename: str,
        document_category: str,
        uploader_user_id: str,
        hospital_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Full ingestion pipeline:
        1. Validates magic bytes, file extensions, and file sizes.
        2. Quarantines file in tenant-isolated directory.
        3. Creates job record in oh_id.document_ocr_jobs with status 'PROCESSING'.
        4. Dispatches to appropriate OCR extraction engine.
        5. Extracts hospital, patient, and clinical document entities with confidence.
        6. Runs duplicate detection against existing OH-ID records.
        7. Transitions state to 'REVIEW_REQUIRED' (or 'FAILED' if error).
        """
        job_id = f"ocr-{uuid.uuid4().hex[:12]}"
        
        # 1 & 2: Validate and quarantine file
        file_meta = validate_and_quarantine_file(
            content=file_bytes,
            original_filename=original_filename,
            hospital_id=hospital_id,
            job_id=job_id
        )

        storage_path = file_meta["storage_path"]
        mime_type = file_meta["mime_type"]
        file_type = file_meta["file_type"]
        file_size_bytes = file_meta["file_size_bytes"]
        file_hash = file_meta["file_hash"]

        # 3. Create initial job entry in database
        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO oh_id.document_ocr_jobs (
                    id, uploader_user_id, hospital_id, document_category,
                    file_name, file_type, file_size_bytes, storage_path,
                    mime_type, file_hash, status
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, 'PROCESSING'
                );
            """, (
                job_id, uploader_user_id, hospital_id, document_category,
                file_meta["file_name"], file_type, file_size_bytes, storage_path,
                mime_type, file_hash
            ))

        log_security_event(
            "DOCUMENT_OCR_UPLOADED",
            actor_id=uploader_user_id,
            resource=f"ocr_job:{job_id}",
            status="SUCCESS",
            details={"file_name": file_meta["file_name"], "category": document_category, "size": file_size_bytes}
        )

        # 4 & 5: Run OCR Extraction
        try:
            # Safely decrypt in memory for processing; file stays envelope-encrypted at rest on disk
            decrypted_bytes = read_decrypted_document_bytes(
                storage_path,
                job_id=job_id,
                filename=file_meta.get("file_name"),
                hospital_id=hospital_id
            )
            if file_type == "PDF":
                extracted_data = self.pdfium_engine.extract_text(decrypted_bytes, mime_type)
            else:
                extracted_data = self.image_engine.extract_text(decrypted_bytes, mime_type)

            raw_text = extracted_data.get("raw_text", "")
            detected_lang = extracted_data.get("language_detected", "eng")

            # Extract structured fields with confidence scores
            parsed = self.extractor.extract_fields(
                raw_text=raw_text,
                document_category=document_category,
                detected_language=detected_lang
            )

            extracted_fields = parsed["extracted_fields"]
            confidence_scores = parsed["confidence_scores"]
            source_locations = parsed["source_locations"]

            # 6: Check for duplicates in existing database
            patient_duplicates = self.duplicate_detector.check_patient_duplicates(
                extracted_fields=extracted_fields,
                hospital_id=hospital_id
            )
            hospital_duplicate = self.duplicate_detector.check_hospital_duplicates(
                extracted_fields=extracted_fields
            )

            duplicate_matches = {
                "patient_matches": patient_duplicates,
                "hospital_match": hospital_duplicate
            }

            # 7: Update database job with extracted results and status REVIEW_REQUIRED
            with get_db_cursor() as cur:
                cur.execute("""
                    UPDATE oh_id.document_ocr_jobs
                    SET status = 'REVIEW_REQUIRED',
                        extracted_fields = %s,
                        confidence_scores = %s,
                        source_locations = %s,
                        duplicate_matches = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                """, (
                    json.dumps(extracted_fields),
                    json.dumps(confidence_scores),
                    json.dumps(source_locations),
                    json.dumps(duplicate_matches),
                    job_id
                ))

            return self.get_job_detail(job_id)

        except Exception as e:
            logger.error(f"OCR Extraction failed for job {job_id}: {e}", exc_info=True)
            with get_db_cursor() as cur:
                cur.execute("""
                    UPDATE oh_id.document_ocr_jobs
                    SET status = 'FAILED',
                        error_message = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                """, (str(e)[:500], job_id))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OCR Extraction processing failed: {str(e)}"
            )

    def get_job_detail(self, job_id: str, hospital_id: Optional[str] = None) -> Dict[str, Any]:
        """Fetch job details with tenant isolation verification."""
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT 
                    id, uploader_user_id, hospital_id, document_category,
                    file_name, file_type, file_size_bytes, storage_path,
                    mime_type, file_hash, status,
                    extracted_fields, confidence_scores, source_locations,
                    corrected_fields, duplicate_matches, created_record_id,
                    reviewed_by, reviewed_at, rejection_reason, error_message,
                    created_at, updated_at
                FROM oh_id.document_ocr_jobs
                WHERE id = %s;
            """, (job_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Document OCR job not found.")

            # Tenant isolation: If user is scoped to a hospital, verify match
            if hospital_id and row["hospital_id"] and row["hospital_id"] != hospital_id:
                raise HTTPException(status_code=403, detail="Unauthorized access to this document job.")

            return dict(row)

    def correct_job_fields(
        self,
        job_id: str,
        corrected_fields: Dict[str, Any],
        user_id: str,
        hospital_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Allows reviewer to supply corrected values before confirmation."""
        job = self.get_job_detail(job_id, hospital_id)
        if job["status"] not in ("REVIEW_REQUIRED", "OCR_COMPLETED", "FAILED"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot edit fields for job with status {job['status']}."
            )

        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.document_ocr_jobs
                SET corrected_fields = %s,
                    reviewed_by = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
            """, (json.dumps(corrected_fields), user_id, job_id))

        log_security_event(
            "DOCUMENT_OCR_FIELDS_CORRECTED",
            actor_id=user_id,
            resource=f"ocr_job:{job_id}",
            status="SUCCESS",
            details={"fields_updated": list(corrected_fields.keys())}
        )
        return self.get_job_detail(job_id)

    def retry_job_ocr(self, job_id: str, user_id: str, hospital_id: Optional[str] = None) -> Dict[str, Any]:
        """Retries extraction on a previously quarantined document."""
        job = self.get_job_detail(job_id, hospital_id)
        storage_path = Path(job["storage_path"])
        if not storage_path.exists():
            raise HTTPException(status_code=404, detail="Quarantined document file no longer exists.")

        try:
            with open(storage_path, "rb") as f:
                content = f.read()

            return self.process_uploaded_document(
                file_bytes=content,
                original_filename=job["file_name"],
                document_category=job["document_category"],
                uploader_user_id=user_id,
                hospital_id=job["hospital_id"]
            )
        except Exception as e:
            logger.error(f"Retry OCR failed for job {job_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Retry failed: {str(e)}")

    def approve_and_persist_document(
        self,
        job_id: str,
        user: Dict[str, Any],
        final_fields: Dict[str, Any],
        patient_id: Optional[str] = None,
        create_provisional_patient: bool = False
    ) -> Dict[str, Any]:
        """
        Saves approved information into the existing database architecture:
        - Stores to oh_id.medical_documents
        - Moves file to approved storage
        - Updates job to APPROVED
        - Logs audit trail
        """
        user_id = user.get("id") or user.get("user_ref_id") or user.get("username")
        user_hospital = user.get("hospital_ref_id") or user.get("hospital_id")
        job = self.get_job_detail(job_id, user_hospital)

        if job["status"] not in ("REVIEW_REQUIRED", "OCR_COMPLETED"):
            raise HTTPException(
                status_code=400,
                detail=f"Job cannot be approved from current state '{job['status']}'."
            )

        # Merge extracted + corrected + confirmed fields
        merged_fields = {**(job.get("extracted_fields") or {}), **(job.get("corrected_fields") or {}), **final_fields}

        # Determine target patient
        effective_patient_id = patient_id
        if not effective_patient_id and create_provisional_patient:
            # Create provisional patient via repository
            patient_name = merged_fields.get("patient_name") or "Provisional Patient"
            patient_age = merged_fields.get("patient_age") or 30
            patient_gender = merged_fields.get("patient_gender") or "Unspecified"
            patient_phone = merged_fields.get("patient_phone")
            assigned_id = f"p-prov-{uuid.uuid4().hex[:8]}"
            
            registered = sp_repository.register_patient(
                name=patient_name,
                age=int(patient_age),
                diagnosis="Document Review Registration",
                gender=patient_gender,
                phone=patient_phone,
                hospital_id=job.get("hospital_id") or user_hospital or "hosp-kedar",
                branch_id="branch-kedar-01",
                patient_id=assigned_id,
                is_demo_data=False
            )
            effective_patient_id = registered.get("id") if registered else assigned_id

        if not effective_patient_id:
            raise HTTPException(
                status_code=400,
                detail="A valid patient ID or provisional patient creation request is required to persist clinical records."
            )

        # Promote file from quarantine to approved storage
        try:
            approved_path = promote_quarantined_file_to_approved(job["storage_path"], job.get("hospital_id"))
        except Exception as e:
            logger.error(f"Error promoting file to approved storage: {e}")
            approved_path = job["storage_path"]

        # Persist document into existing oh_id.medical_documents table
        title = (
            merged_fields.get("document_type") or 
            f"{job['document_category'].replace('_', ' ').title()} - {merged_fields.get('hospital_name') or 'External'}"
        )

        doc_record = sp_repository.create_patient_uploaded_document(
            patient_id=effective_patient_id,
            title=title,
            category=job["document_category"],
            source_type="EXTERNAL_PROVIDER",
            source_label=f"{merged_fields.get('hospital_name') or 'External Facility'} (OCR Verified)",
            uploaded_by=user_id,
            doctor_id=user_id,
            hospital_id=job.get("hospital_id") or user_hospital or "hosp-kedar",
            file_type=job["file_type"],
            file_size_kb=max(1, job["file_size_bytes"] // 1024),
            document_date=merged_fields.get("document_date"),
            notes=f"Document uploaded and verified via OCR Extraction. Hospital: {merged_fields.get('hospital_name', 'N/A')}. Doctor: {merged_fields.get('doctor_name', 'N/A')}.",
            tags=["OCR_EXTRACTED", "VERIFIED_UPLOAD", job["document_category"]],
            metadata={
                "ocr_job_id": job_id,
                "approved_storage_path": approved_path,
                "extracted_fields": merged_fields,
                "confidence_scores": job.get("confidence_scores"),
                "file_hash": job.get("file_hash"),
            },
            status="AVAILABLE"
        )

        created_doc_id = doc_record.get("id") if doc_record else f"doc-{uuid.uuid4().hex[:8]}"

        # Update job status to APPROVED
        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.document_ocr_jobs
                SET status = 'APPROVED',
                    storage_path = %s,
                    created_record_id = %s,
                    reviewed_by = %s,
                    reviewed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
            """, (approved_path, created_doc_id, user_id, job_id))

        log_security_event(
            "DOCUMENT_OCR_APPROVED",
            actor_id=user_id,
            resource=f"patient:{effective_patient_id}:doc:{created_doc_id}",
            status="SUCCESS",
            details={"job_id": job_id, "category": job["document_category"]}
        )

        return {
            "job_id": job_id,
            "status": "APPROVED",
            "document_id": created_doc_id,
            "patient_id": effective_patient_id,
            "message": "Document successfully approved and securely saved to OneHealth ID records."
        }

    def reject_job(
        self,
        job_id: str,
        user_id: str,
        rejection_reason: str,
        hospital_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Rejects the document OCR extraction, securely deletes quarantined file, and updates status."""
        job = self.get_job_detail(job_id, hospital_id)

        # Delete quarantined file
        delete_quarantined_file(job["storage_path"])

        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.document_ocr_jobs
                SET status = 'REJECTED',
                    rejection_reason = %s,
                    reviewed_by = %s,
                    reviewed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
            """, (rejection_reason, user_id, job_id))

        log_security_event(
            "DOCUMENT_OCR_REJECTED",
            actor_id=user_id,
            resource=f"ocr_job:{job_id}",
            status="SUCCESS",
            details={"reason": rejection_reason}
        )

        return {
            "job_id": job_id,
            "status": "REJECTED",
            "message": "Document upload was rejected and quarantined file removed."
        }


# Singleton service instance
ocr_service = DocumentOCRService()
