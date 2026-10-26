"""
Migration: Create Document OCR Jobs table for OH-ID document upload and OCR identity extraction
Sathus Technology Pvt Ltd - OneHealth ID
"""

import sys
from pathlib import Path
_root = str(Path(__file__).resolve().parent.parent.parent.parent)
if _root not in sys.path:
    sys.path.insert(0, _root)

from backend.app.database.session import get_db_cursor
from backend.app.core.logging import logger

def migrate_document_ocr_jobs():
    with get_db_cursor() as cur:
        # Create oh_id.document_ocr_jobs table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.document_ocr_jobs (
                id VARCHAR(64) PRIMARY KEY,
                uploader_user_id VARCHAR(64) NOT NULL,
                hospital_id VARCHAR(64),
                document_category VARCHAR(50) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_type VARCHAR(20) NOT NULL,
                file_size_bytes BIGINT NOT NULL,
                storage_path TEXT NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                file_hash VARCHAR(128),
                status VARCHAR(30) NOT NULL DEFAULT 'UPLOADED',
                extracted_fields JSONB DEFAULT '{}'::jsonb,
                confidence_scores JSONB DEFAULT '{}'::jsonb,
                source_locations JSONB DEFAULT '{}'::jsonb,
                corrected_fields JSONB DEFAULT '{}'::jsonb,
                duplicate_matches JSONB DEFAULT '[]'::jsonb,
                created_record_id VARCHAR(64),
                reviewed_by VARCHAR(64),
                reviewed_at TIMESTAMPTZ,
                rejection_reason TEXT,
                error_message TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_doc_ocr_jobs_status ON oh_id.document_ocr_jobs (status);
            CREATE INDEX IF NOT EXISTS idx_doc_ocr_jobs_uploader ON oh_id.document_ocr_jobs (uploader_user_id);
            CREATE INDEX IF NOT EXISTS idx_doc_ocr_jobs_hospital ON oh_id.document_ocr_jobs (hospital_id);
            CREATE INDEX IF NOT EXISTS idx_doc_ocr_jobs_created ON oh_id.document_ocr_jobs (created_at DESC);
        """)
        logger.info("Successfully created oh_id.document_ocr_jobs table and indexes.")

if __name__ == "__main__":
    migrate_document_ocr_jobs()
    print("Migration migrate_document_ocr_jobs completed successfully.")
