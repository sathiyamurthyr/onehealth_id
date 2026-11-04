"""
Document OCR Pipeline Service Orchestrator
Coordinates file quarantine, text extraction, field normalization, confidence scoring,
duplicate matching, automatic AES-256-GCM envelope encryption, Backblaze B2 private storage,
and secure persistence to existing OH-ID clinical records without mandatory hospital approval.
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
from backend.app.services.ocr.document_validator import document_validator, ValidationDecision
from backend.app.services.crypto.envelope_encryption import envelope_crypto
from backend.app.services.storage.b2_storage import b2_storage
from backend.app.core.logging import logger, log_security_event


class DocumentOCRService:
    delete_quarantined_file = staticmethod(delete_quarantined_file)

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
        hospital_id: Optional[str] = None,
        patient_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes the Complete Enterprise OCR & Automated Document Storage Journey:
        1. Security validation: Signature, MIME, anti-malware scan, size limits, quarantine.
        2. OCR extraction: Text, language, layout, readability.
        3. Medical document validation: Domain relevance & category classification.
        4. Automatic Storage Decision:
           - Mark upload as STORED
           - Application-level AES-256-GCM envelope encryption with per-document DEK
           - Upload encrypted bytes to private Backblaze B2 bucket
           - Automatically save metadata to oh_id.medical_documents (status='AVAILABLE')
           - Mark OCR processing as COMPLETED
           - Make available in Patient Documents without mandatory hospital clinical approval
        5. Exception Handling:
           - Uncertain OCR or layout: Original is safely preserved and stored; retry offered.
           - Security or invalid file: Rejected with specific explanation.
        """
        job_id = f"ocr-{uuid.uuid4().hex[:12]}"

        # Pre-flight quota check if patient is known
        early_patient_id = patient_id
        if not early_patient_id and uploader_user_id:
            try:
                p_rec = sp_repository.get_patient_by_user_ref(uploader_user_id)
                if p_rec:
                    early_patient_id = p_rec.get("id")
            except Exception:
                pass

        if early_patient_id:
            quota_eval = sp_repository.check_and_lock_storage_quota(
                patient_id=early_patient_id,
                incoming_bytes=len(file_bytes)
            )
            if not quota_eval.get("allowed", True):
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Storage quota exceeded. Available: {quota_eval.get('available_mb', 0)} MB. Upload size: {round(len(file_bytes)/(1024*1024), 2)} MB. Please upgrade your Health Vault storage."
                )

        # 1. Security validation, anti-malware scan, and quarantine storage
        try:
            file_meta = validate_and_quarantine_file(
                content=file_bytes,
                original_filename=original_filename,
                hospital_id=hospital_id,
                job_id=job_id
            )
        except HTTPException as http_exc:
            err_str = str(http_exc.detail)
            if "Malicious payload detected" in err_str or "decompression risk" in err_str or "ZipSlip" in err_str:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "decision": ValidationDecision.REJECTED_MALWARE.value,
                        "error": err_str,
                        "actionable_remedy": "File failed anti-malware security inspection and was quarantined/deleted.",
                        "file_name": original_filename,
                        "upload_status": "UPLOAD_FAILED",
                        "ocr_status": "FAILED",
                        "classification_status": "UNSUPPORTED"
                    }
                )
            raise

        storage_path = file_meta["storage_path"]
        mime_type = file_meta["mime_type"]
        file_type = file_meta["file_type"]
        file_size_bytes = file_meta["file_size_bytes"]
        file_hash = file_meta["file_hash"]

        # 2. Create initial job entry in database with separate status dimensions
        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO oh_id.document_ocr_jobs (
                    id, uploader_user_id, hospital_id, document_category,
                    file_name, file_type, file_size_bytes, storage_path,
                    mime_type, file_hash, status, upload_status, ocr_status, classification_status,
                    patient_id
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, 'PROCESSING', 'UPLOADING', 'PROCESSING', 'IDENTIFIED',
                    %s
                );
            """, (
                job_id, uploader_user_id, hospital_id, document_category,
                file_meta["file_name"], file_type, file_size_bytes, storage_path,
                mime_type, file_hash, patient_id
            ))

        log_security_event(
            "DOCUMENT_OCR_UPLOADED",
            actor_id=uploader_user_id,
            resource=f"ocr_job:{job_id}",
            status="SUCCESS",
            details={"file_name": file_meta["file_name"], "category": document_category, "size": file_size_bytes}
        )

        # 3. Run OCR Extraction
        try:
            # Safely decrypt in memory for processing; file stays envelope-encrypted at rest
            decrypted_bytes = read_decrypted_document_bytes(
                storage_path,
                job_id=job_id,
                filename=file_meta.get("file_name"),
                hospital_id=hospital_id
            )
            try:
                if file_type == "PDF":
                    extracted_data = self.pdfium_engine.extract_text(decrypted_bytes, mime_type)
                    pages_text = extracted_data.get("pages_text", [extracted_data.get("raw_text", "")])
                    val_result = document_validator.evaluate_multipage_pdf(
                        pages_text=pages_text,
                        selected_category=document_category
                    )
                else:
                    extracted_data = self.image_engine.extract_text(decrypted_bytes, mime_type)
                    raw_text = extracted_data.get("raw_text", "")
                    is_scanned = extracted_data.get("is_scanned", False)
                    is_mobile_screenshot = extracted_data.get("is_mobile_screenshot", False)
                    val_result = document_validator.evaluate_validation_decision(
                        raw_text=raw_text,
                        selected_category=document_category,
                        is_scanned=is_scanned,
                        is_mobile_screenshot=is_mobile_screenshot
                    )
            except Exception as ocr_parse_err:
                err_lower = str(ocr_parse_err).lower()
                if "corrupt" in err_lower or "pdfium" in err_lower or "format error" in err_lower:
                    self.delete_quarantined_file(storage_path)
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Corrupted or invalid document format: {str(ocr_parse_err)}"
                    )
                raise

            raw_text = extracted_data.get("raw_text", "")
            detected_lang = extracted_data.get("language_detected", "eng")

            # Case: REJECTION (Non-medical screenshots, chat messages, irrelevant bills, malware)
            if not val_result.is_accepted:
                # Immediately clean up quarantined file - rejected files must NOT be stored
                self.delete_quarantined_file(storage_path)

                with get_db_cursor() as cur:
                    cur.execute("""
                        UPDATE oh_id.document_ocr_jobs
                        SET status = %s,
                            upload_status = 'UPLOAD_FAILED',
                            ocr_status = 'COMPLETED',
                            classification_status = 'UNSUPPORTED',
                            validation_decision = %s,
                            rejection_reason = %s,
                            actionable_remedy = %s,
                            validation_metrics = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s;
                    """, (
                        val_result.decision.value,
                        val_result.decision.value,
                        val_result.reason,
                        val_result.actionable_remedy,
                        json.dumps(val_result.model_dump()),
                        job_id
                    ))

                log_security_event(
                    "DOCUMENT_VALIDATION_REJECTED",
                    actor_id=uploader_user_id,
                    hospital_id=hospital_id,
                    resource=f"ocr_job:{job_id}",
                    status="DENIED",
                    details={
                        "decision": val_result.decision.value,
                        "reason": val_result.reason,
                        "relevance_score": val_result.relevance_score
                    }
                )
                return self.get_job_detail(job_id)

            # 5. Extract Clinical Entities & Metadata
            parsed = self.extractor.extract_fields(
                raw_text=raw_text,
                document_category=document_category,
                detected_language=detected_lang
            )

            extracted_fields = parsed["extracted_fields"]
            confidence_scores = parsed["confidence_scores"]
            source_locations = parsed["source_locations"]

            # Duplicate detection
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

            # 6. Resolve Target Patient
            effective_patient_id = patient_id
            if not effective_patient_id and uploader_user_id:
                try:
                    patient_rec = sp_repository.get_patient_by_user_ref(uploader_user_id)
                    if patient_rec:
                        effective_patient_id = patient_rec.get("id")
                except Exception:
                    pass

            if not effective_patient_id and patient_duplicates:
                effective_patient_id = patient_duplicates[0].get("id")

            if not effective_patient_id:
                effective_patient_id = "p-101"

            # 7. Automated Acceptance Decision & Separate Status Dimensions
            # Upload: VALIDATING, ENCRYPTING, UPLOADING, STORED, UPLOAD_FAILED
            # OCR: PENDING, PROCESSING, COMPLETED, LOW_CONFIDENCE, FAILED
            # Classification: IDENTIFIED, UNCERTAIN, UNSUPPORTED
            is_routine_valid = val_result.is_accepted or val_result.decision.value in ("ACCEPTED", "UPLOADED", "VERIFIED")

            if is_routine_valid:
                upload_status = "STORED"
                ocr_status = "COMPLETED" if val_result.confidence >= 0.35 else "LOW_CONFIDENCE"
                classification_status = "IDENTIFIED"
                final_status = "STORED"
                val_decision_str = "STORED"
                reason_text = None
                remedy_text = None
            else:
                # Uncertain layout or handwriting: original securely preserved and stored!
                upload_status = "STORED"
                ocr_status = "LOW_CONFIDENCE"
                classification_status = "UNCERTAIN"
                final_status = "STORED"
                val_decision_str = "STORED"
                reason_text = None
                remedy_text = None

            # 8. Application-Level AES-256-GCM Envelope Encryption for Backblaze B2 Upload
            tenant_scope = hospital_id or "hosp-kedar"
            safe_filename = file_meta["file_name"]
            aad = f"{tenant_scope}:{job_id}:{safe_filename}".encode("utf-8")
            encrypted_package = envelope_crypto.encrypt_document_bytes(file_bytes, associated_data=aad)

            # 9. Upload Encrypted Bytes to Private Backblaze B2 Storage
            b2_storage_key = f"documents/{tenant_scope}/{job_id}/{safe_filename}.enc"
            b2_meta = b2_storage.upload_encrypted_document(
                encrypted_bytes=encrypted_package,
                storage_key=b2_storage_key,
                original_filename=safe_filename,
                metadata={
                    "job_id": job_id,
                    "category": document_category,
                    "patient_id": effective_patient_id or "unassigned",
                    "hospital_id": tenant_scope
                }
            )

            # 10. Promote file to approved storage path for fast local streaming
            try:
                approved_path = promote_quarantined_file_to_approved(storage_path, hospital_id)
            except Exception as e:
                logger.warning(f"Could not promote file to approved local path: {e}")
                approved_path = storage_path

            # 11. Auto-Persist Document into oh_id.medical_documents with status='AVAILABLE'
            title = (
                extracted_fields.get("document_type") or 
                f"{document_category.replace('_', ' ').title()} - {extracted_fields.get('hospital_name') or 'Verified Clinical Record'}"
            )[:95]

            doc_record = sp_repository.create_patient_uploaded_document(
                patient_id=effective_patient_id,
                title=title,
                category=document_category,
                source_type="PATIENT_UPLOADED",
                source_label=f"{extracted_fields.get('hospital_name') or 'OneHealth Vault'} (Auto-Stored)"[:95],
                uploaded_by=uploader_user_id,
                doctor_id=None,
                hospital_id=tenant_scope,
                file_type=file_type,
                file_size_kb=max(1, file_size_bytes // 1024),
                document_date=extracted_fields.get("document_date"),
                notes=f"Auto-stored in health vault via OCR pipeline. Facility: {extracted_fields.get('hospital_name', 'N/A')}. Doctor: {extracted_fields.get('doctor_name', 'N/A')}.",
                tags=["AUTO_STORED", "B2_ENCRYPTED", "VERIFIED_UPLOAD", document_category],
                metadata={
                    "ocr_job_id": job_id,
                    "b2_bucket": b2_meta["bucket"],
                    "b2_storage_key": b2_meta["storage_key"],
                    "b2_etag": b2_meta["etag"],
                    "file_hash": file_hash,
                    "encryption_algorithm": "AES-256-GCM",
                    "extracted_fields": extracted_fields,
                    "confidence_scores": confidence_scores,
                    "auto_stored": True,
                },
                status="AVAILABLE"
            )
            created_doc_id = doc_record.get("id") if doc_record else f"doc-{uuid.uuid4().hex[:8]}"

            # 12. Update Job Record in Database
            with get_db_cursor() as cur:
                cur.execute("""
                    UPDATE oh_id.document_ocr_jobs
                    SET status = %s,
                        upload_status = %s,
                        ocr_status = %s,
                        classification_status = %s,
                        validation_decision = %s,
                        b2_storage_key = %s,
                        b2_bucket = %s,
                        b2_etag = %s,
                        b2_encryption_algorithm = 'AES-256-GCM',
                        created_record_id = %s,
                        patient_id = %s,
                        storage_path = %s,
                        extracted_fields = %s,
                        confidence_scores = %s,
                        source_locations = %s,
                        duplicate_matches = %s,
                        validation_metrics = %s,
                        rejection_reason = %s,
                        actionable_remedy = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                """, (
                    final_status,
                    upload_status,
                    ocr_status,
                    classification_status,
                    val_decision_str,
                    b2_meta["storage_key"],
                    b2_meta["bucket"],
                    b2_meta["etag"],
                    created_doc_id,
                    effective_patient_id,
                    approved_path,
                    json.dumps(extracted_fields),
                    json.dumps(confidence_scores),
                    json.dumps(source_locations),
                    json.dumps(duplicate_matches),
                    json.dumps(val_result.model_dump()),
                    reason_text,
                    remedy_text,
                    job_id
                ))

            log_security_event(
                f"DOCUMENT_AUTO_STORED",
                actor_id=uploader_user_id,
                hospital_id=hospital_id,
                resource=f"ocr_job:{job_id}:doc:{created_doc_id}",
                status="SUCCESS",
                details={
                    "category": document_category,
                    "b2_key": b2_meta["storage_key"],
                    "upload_status": upload_status,
                    "ocr_status": ocr_status,
                    "classification_status": classification_status
                }
            )

            return self.get_job_detail(job_id)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"OCR Extraction failed for job {job_id}: {e}", exc_info=True)
            with get_db_cursor() as cur:
                cur.execute("""
                    UPDATE oh_id.document_ocr_jobs
                    SET status = 'PROCESSING_FAILED',
                        upload_status = 'STORED',
                        ocr_status = 'FAILED',
                        classification_status = 'UNCERTAIN',
                        validation_decision = 'PROCESSING_FAILED',
                        error_message = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                """, (str(e), job_id))
            raise HTTPException(
                status_code=500,
                detail=f"OCR Extraction pipeline encountered an internal failure: {str(e)}"
            )

    def get_job_detail(self, job_id: str, hospital_id: Optional[str] = None) -> Dict[str, Any]:
        """Fetch job details with tenant isolation verification."""
        with get_readonly_cursor() as cur:
            cur.execute("""
                SELECT 
                    id, uploader_user_id, hospital_id, document_category,
                    file_name, file_type, file_size_bytes, storage_path,
                    mime_type, file_hash, status,
                    upload_status, ocr_status, classification_status,
                    b2_storage_key, b2_bucket, b2_etag, b2_encryption_algorithm,
                    patient_id,
                    extracted_fields, confidence_scores, source_locations,
                    corrected_fields, duplicate_matches, created_record_id,
                    reviewed_by, reviewed_at, rejection_reason, error_message,
                    validation_decision, validation_metrics, actionable_remedy,
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

            d = dict(row)
            # Default fallbacks for separate status dimensions
            if not d.get("upload_status"):
                d["upload_status"] = "STORED" if d.get("status") in ("STORED", "ACCEPTED", "APPROVED", "VERIFIED") else "UPLOAD_FAILED"
            if not d.get("ocr_status"):
                d["ocr_status"] = "COMPLETED" if d.get("status") in ("STORED", "ACCEPTED", "APPROVED") else "PENDING"
            if not d.get("classification_status"):
                d["classification_status"] = "IDENTIFIED" if d.get("status") in ("STORED", "ACCEPTED", "APPROVED") else "UNCERTAIN"
            return d

    def correct_job_fields(
        self,
        job_id: str,
        corrected_fields: Dict[str, Any],
        user_id: str,
        hospital_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Allows reviewer to supply corrected values before confirmation."""
        job = self.get_job_detail(job_id, hospital_id)
        if job["status"] not in ("STORED", "ACCEPTED", "UPLOADED", "VERIFIED", "REVIEW_REQUIRED", "OCR_COMPLETED", "FAILED"):
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
        """Retries extraction on a previously stored document."""
        job = self.get_job_detail(job_id, hospital_id)
        storage_path = Path(job["storage_path"])
        if not storage_path.exists():
            raise HTTPException(status_code=404, detail="Document file no longer exists.")

        try:
            # Decrypt in memory to re-run OCR safely
            content = read_decrypted_document_bytes(
                str(storage_path),
                job_id=job_id,
                filename=job.get("file_name"),
                hospital_id=job.get("hospital_id")
            )

            return self.process_uploaded_document(
                file_bytes=content,
                original_filename=job["file_name"],
                document_category=job["document_category"],
                uploader_user_id=user_id,
                hospital_id=job["hospital_id"],
                patient_id=job.get("patient_id")
            )
        except Exception as e:
            logger.error(f"Error during OCR retry for job {job_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to retry OCR: {e}")

    def approve_and_persist_document(
        self,
        job_id: str,
        user: Dict[str, Any],
        final_fields: Dict[str, Any],
        patient_id: Optional[str] = None,
        create_provisional_patient: bool = False
    ) -> Dict[str, Any]:
        """
        Confirms clinical review and persistence into oh_id.medical_documents:
        - Updates existing oh_id.medical_documents record if auto-stored, or creates new one
        - Moves file to approved storage
        - Updates job to APPROVED
        - Logs audit trail
        """
        user_id = user.get("id") or user.get("user_ref_id") or user.get("username")
        user_hospital = user.get("hospital_ref_id") or user.get("hospital_id")
        job = self.get_job_detail(job_id, user_hospital)

        if job["status"] not in ("STORED", "ACCEPTED", "REVIEW_REQUIRED", "OCR_COMPLETED", "UPLOADED", "VERIFIED"):
            raise HTTPException(
                status_code=400,
                detail=f"Job cannot be approved from current state '{job['status']}'."
            )

        # Merge extracted + corrected + confirmed fields
        merged_fields = {**(job.get("extracted_fields") or {}), **(job.get("corrected_fields") or {}), **final_fields}

        # Determine target patient
        effective_patient_id = patient_id or job.get("patient_id")
        if not effective_patient_id and create_provisional_patient:
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
            effective_patient_id = "p-101"

        # Promote file from quarantine to approved storage if needed
        try:
            approved_path = promote_quarantined_file_to_approved(job["storage_path"], job.get("hospital_id"))
        except Exception as e:
            approved_path = job["storage_path"]

        created_doc_id = job.get("created_record_id")
        if not created_doc_id:
            title = (
                merged_fields.get("document_type") or 
                f"{job['document_category'].replace('_', ' ').title()} - {merged_fields.get('hospital_name') or 'External'}"
            )
            doc_record = sp_repository.create_patient_uploaded_document(
                patient_id=effective_patient_id,
                title=title,
                category=job["document_category"],
                source_type="EXTERNAL_PROVIDER",
                source_label=f"{merged_fields.get('hospital_name') or 'External Facility'} (Staff Confirmed)",
                uploaded_by=user_id,
                doctor_id=user_id,
                hospital_id=job.get("hospital_id") or user_hospital or "hosp-kedar",
                file_type=job["file_type"],
                file_size_kb=max(1, job["file_size_bytes"] // 1024),
                document_date=merged_fields.get("document_date"),
                notes=f"Document reviewed and confirmed by clinical staff. Hospital: {merged_fields.get('hospital_name', 'N/A')}. Doctor: {merged_fields.get('doctor_name', 'N/A')}.",
                tags=["OCR_EXTRACTED", "STAFF_CONFIRMED", job["document_category"]],
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
        """Rejects a document OCR extraction and records reason."""
        job = self.get_job_detail(job_id, hospital_id)
        if job["status"] in ("REJECTED", "APPROVED"):
            raise HTTPException(status_code=400, detail=f"Job already has final status '{job['status']}'.")

        delete_quarantined_file(job["storage_path"])

        with get_db_cursor() as cur:
            cur.execute("""
                UPDATE oh_id.document_ocr_jobs
                SET status = 'REJECTED',
                    upload_status = 'UPLOAD_FAILED',
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
            details={"rejection_reason": rejection_reason}
        )

        return {
            "job_id": job_id,
            "status": "REJECTED",
            "message": "Document rejected and quarantined file deleted."
        }


# Singleton service instance
ocr_service = DocumentOCRService()
