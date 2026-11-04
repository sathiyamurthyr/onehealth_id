"""
Database Migration: Patient Storage Quota & Health Vault Management
Sathus Technology Pvt Ltd - OneHealth ID (OH-ID)

Implements:
1. oh_id.patient_storage_quotas table (1 GB default per patient)
2. Soft-deletion support on oh_id.medical_documents (status='DELETED', deleted_at)
3. Updating oh_id.vw_medical_documents_full view to filter out deleted records
4. Initializing quotas for all existing patients
"""

from backend.app.database.session import get_db_cursor
from backend.app.core.logging import logger


def migrate_patient_storage_quota_vault():
    with get_db_cursor() as cur:
        # 1. Create table for patient storage quotas
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.patient_storage_quotas (
                patient_id VARCHAR(64) PRIMARY KEY REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                total_quota_bytes BIGINT NOT NULL DEFAULT 1073741824, -- 1 GB default
                plan_name VARCHAR(100) NOT NULL DEFAULT 'Free Tier',
                plan_tier VARCHAR(50) NOT NULL DEFAULT 'FREE',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_patient_storage_quota_pat ON oh_id.patient_storage_quotas(patient_id);
        """)

        # 2. Add deleted_at column to oh_id.medical_documents
        cur.execute("""
            ALTER TABLE oh_id.medical_documents
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
        """)

        # 3. Initialize 1 GB quota for all existing patients who don't have one
        cur.execute("""
            INSERT INTO oh_id.patient_storage_quotas (patient_id, total_quota_bytes, plan_name, plan_tier)
            SELECT id, 1073741824, 'Free Tier', 'FREE'
            FROM oh_id.patients
            ON CONFLICT (patient_id) DO NOTHING;
        """)

        # 4. Recreate master view oh_id.vw_medical_documents_full excluding DELETED status
        cur.execute("""
            DROP VIEW IF EXISTS oh_id.vw_medical_documents_full CASCADE;
            CREATE OR REPLACE VIEW oh_id.vw_medical_documents_full AS
            SELECT 
                md.id,
                md.document_code,
                md.patient_id,
                p.name AS patient_name,
                p.onehealth_id,
                p.gender AS patient_gender,
                p.dob AS patient_dob,
                p.phone AS patient_phone,
                md.hospital_id,
                COALESCE(h.name, md.source_label, 'Healthcare Facility') AS hospital_name,
                h.code AS hospital_code,
                h.city AS hospital_city,
                h.state AS hospital_state,
                md.branch_id,
                md.doctor_id,
                COALESCE(d.name, (md.metadata->>'doctor_name'), (md.metadata->>'consultant'), 'Attending Clinician') AS doctor_name,
                d.specialty AS doctor_specialty,
                COALESCE(md.department, d.specialty, 'General Medicine') AS department,
                md.title,
                md.category,
                md.status,
                md.source_type,
                COALESCE(md.source_label, h.name, 'Healthcare Provider') AS source_label,
                md.uploaded_by,
                md.created_by,
                md.verified_by,
                md.verified_at,
                md.reviewed_by,
                md.reviewed_at,
                md.review_notes,
                rev_doc.name AS reviewed_by_doctor_name,
                md.related_visit_id,
                md.related_appointment_id,
                md.related_order_id,
                md.related_prescription_id,
                md.related_request_id,
                dr.title AS request_title,
                md.file_type,
                md.file_size_kb,
                md.file_hash,
                md.document_date,
                md.reference_id,
                md.visit_id,
                md.notes,
                md.tags,
                md.metadata,
                md.images,
                md.verification_token,
                md.digital_signature,
                md.created_at,
                md.updated_at,
                md.deleted_at
            FROM oh_id.medical_documents md
            LEFT JOIN oh_id.patients p ON md.patient_id = p.id
            LEFT JOIN oh_id.hospitals h ON md.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON md.doctor_id = d.id
            LEFT JOIN oh_id.doctors rev_doc ON md.reviewed_by = rev_doc.id
            LEFT JOIN oh_id.document_requests dr ON md.related_request_id = dr.id
            WHERE md.status != 'DELETED' AND md.deleted_at IS NULL;
        """)

        # 5. Recreate inbox view dependent on medical_documents
        cur.execute("""
            DROP VIEW IF EXISTS oh_id.vw_doctor_document_inbox CASCADE;
            CREATE OR REPLACE VIEW oh_id.vw_doctor_document_inbox AS
            SELECT 
                md.id AS document_id,
                md.document_code,
                md.patient_id,
                p.name AS patient_name,
                p.onehealth_id,
                md.hospital_id,
                h.name AS hospital_name,
                md.doctor_id,
                md.title,
                md.category,
                md.status,
                md.file_type,
                md.file_size_kb,
                md.document_date,
                md.uploaded_by,
                md.created_at,
                md.reviewed_at,
                md.review_notes
            FROM oh_id.medical_documents md
            JOIN oh_id.patients p ON md.patient_id = p.id
            LEFT JOIN oh_id.hospitals h ON md.hospital_id = h.id
            WHERE md.status != 'DELETED' AND md.deleted_at IS NULL;
        """)

    print("Migration successfully applied: oh_id.patient_storage_quotas & view updates.")


if __name__ == "__main__":
    migrate_patient_storage_quota_vault()
