"""
OH-ID Migration: Hospital & Clinic Registration and Super Admin Approval Workflow
Adds backward-compatible columns to oh_id.hospitals and oh_id.hospital_verifications.
"""
import sys
import os
sys.path.insert(0, r"d:\oh-id")

from backend.app.database.session import get_db_cursor
from backend.app.core.config import settings

def run_migration():
    print(f"Applying Hospital Approval Workflow Migration to schema: {settings.DB_SCHEMA}")
    with get_db_cursor() as cur:
        # 1. Add approval and representative columns to oh_id.hospitals
        cur.execute("""
            ALTER TABLE oh_id.hospitals
                ADD COLUMN IF NOT EXISTS application_ref VARCHAR(64) UNIQUE,
                ADD COLUMN IF NOT EXISTS rep_name VARCHAR(128),
                ADD COLUMN IF NOT EXISTS rep_designation VARCHAR(128),
                ADD COLUMN IF NOT EXISTS rep_email VARCHAR(128),
                ADD COLUMN IF NOT EXISTS rep_phone VARCHAR(32),
                ADD COLUMN IF NOT EXISTS supporting_documents JSONB DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS review_notes TEXT,
                ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(64),
                ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        """)

        # 2. Create index on application_ref and lifecycle_status for ultra-fast lookup
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_hospitals_application_ref ON oh_id.hospitals (application_ref);
            CREATE INDEX IF NOT EXISTS idx_hospitals_lifecycle_status ON oh_id.hospitals (lifecycle_status);
        """)

        # 3. Create platform audit logs table if not exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.platform_audit_logs (
                id VARCHAR(64) PRIMARY KEY,
                admin_user_id VARCHAR(64),
                admin_username VARCHAR(64),
                action VARCHAR(64) NOT NULL,
                entity_type VARCHAR(64) NOT NULL,
                entity_id VARCHAR(64) NOT NULL,
                entity_name VARCHAR(256),
                previous_value JSONB,
                new_value JSONB,
                reason TEXT,
                ticket_ref VARCHAR(64),
                ip_address VARCHAR(64),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_entity ON oh_id.platform_audit_logs (entity_type, entity_id);
        """)

        # 4. Ensure existing hospitals have application_ref if empty
        cur.execute("""
            UPDATE oh_id.hospitals
            SET application_ref = 'APP-' || UPPER(SUBSTRING(MD5(id || code) FROM 1 FOR 8))
            WHERE application_ref IS NULL;
        """)

        print("Migration applied successfully!")

if __name__ == "__main__":
    run_migration()
