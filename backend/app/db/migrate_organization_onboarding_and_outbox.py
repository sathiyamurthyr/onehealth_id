"""
OH-ID Migration: Organization Registration, Onboarding Sessions, and Notification Outbox
Creates oh_id.organization_onboarding_sessions and oh_id.notification_outbox tables,
and adds verification tracking columns to oh_id.hospitals.
"""
import sys
import os
sys.path.insert(0, r"d:\oh-id")

from backend.app.database.session import get_db_cursor
from backend.app.core.config import settings

def run_migration():
    print(f"Applying Organization Onboarding & Notification Outbox Migration to schema: {settings.DB_SCHEMA}")
    with get_db_cursor() as cur:
        # 1. Create organization_onboarding_sessions table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.organization_onboarding_sessions (
                id VARCHAR(64) PRIMARY KEY,
                mobile_number VARCHAR(32),
                mobile_otp_hash VARCHAR(128),
                mobile_verified BOOLEAN DEFAULT FALSE,
                mobile_verified_at TIMESTAMPTZ,
                mobile_attempts_count INT DEFAULT 0,
                mobile_last_sent_at TIMESTAMPTZ,
                mobile_expires_at TIMESTAMPTZ,
                email_address VARCHAR(256),
                email_otp_hash VARCHAR(128),
                email_verified BOOLEAN DEFAULT FALSE,
                email_verified_at TIMESTAMPTZ,
                email_attempts_count INT DEFAULT 0,
                email_last_sent_at TIMESTAMPTZ,
                email_expires_at TIMESTAMPTZ,
                idempotency_key VARCHAR(128) UNIQUE,
                application_ref VARCHAR(64) UNIQUE,
                ip_address VARCHAR(64),
                user_agent TEXT,
                status VARCHAR(32) DEFAULT 'IN_PROGRESS',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_onboarding_contacts 
                ON oh_id.organization_onboarding_sessions (mobile_number, email_address);
            CREATE INDEX IF NOT EXISTS idx_onboarding_idempotency 
                ON oh_id.organization_onboarding_sessions (idempotency_key);
        """)

        # 2. Create notification_outbox table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.notification_outbox (
                id VARCHAR(64) PRIMARY KEY,
                event_type VARCHAR(64) NOT NULL,
                channel VARCHAR(32) NOT NULL,
                recipient VARCHAR(256) NOT NULL,
                masked_recipient VARCHAR(256),
                subject_or_template VARCHAR(256),
                payload JSONB,
                delivery_status VARCHAR(32) DEFAULT 'SENT',
                error_message TEXT,
                retry_count INT DEFAULT 0,
                hospital_id VARCHAR(64),
                application_ref VARCHAR(64),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                sent_at TIMESTAMPTZ
            );
            CREATE INDEX IF NOT EXISTS idx_outbox_hospital 
                ON oh_id.notification_outbox (hospital_id);
            CREATE INDEX IF NOT EXISTS idx_outbox_application_ref 
                ON oh_id.notification_outbox (application_ref);
            CREATE INDEX IF NOT EXISTS idx_outbox_delivery_status 
                ON oh_id.notification_outbox (delivery_status);
        """)

        # 3. Add verification tracking columns to oh_id.hospitals if not existing
        cur.execute("""
            ALTER TABLE oh_id.hospitals
                ADD COLUMN IF NOT EXISTS onboarding_session_id VARCHAR(64),
                ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS verified_mobile VARCHAR(32),
                ADD COLUMN IF NOT EXISTS verified_email VARCHAR(256);
        """)

        print("Migration applied successfully!")

if __name__ == "__main__":
    run_migration()
