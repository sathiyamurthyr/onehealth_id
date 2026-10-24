"""
OH-ID Migration: Password Reset OTP Workflow & Support Assistance
Creates oh_id.password_reset_otps and ensures platform_support_tickets indices.
"""
from backend.app.database.session import get_db_cursor
import logging

logger = logging.getLogger("ohid.migration.password_reset")

def run_migration():
    logger.info("Executing password reset OTP and support assistance migration...")
    with get_db_cursor() as cur:
        # 1. Create table oh_id.password_reset_otps
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.password_reset_otps (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) NOT NULL REFERENCES oh_id.users(id) ON DELETE CASCADE,
                email VARCHAR(255) NOT NULL,
                otp_hash VARCHAR(255) NOT NULL,
                purpose VARCHAR(32) NOT NULL DEFAULT 'PASSWORD_RESET',
                attempts_count INT NOT NULL DEFAULT 0,
                max_attempts INT NOT NULL DEFAULT 5,
                is_verified BOOLEAN NOT NULL DEFAULT FALSE,
                verified_at TIMESTAMPTZ,
                reset_token_hash VARCHAR(255),
                is_used BOOLEAN NOT NULL DEFAULT FALSE,
                used_at TIMESTAMPTZ,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                correlation_id VARCHAR(64),
                ip_address VARCHAR(64),
                user_agent TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_pwd_reset_user 
            ON oh_id.password_reset_otps(user_id, is_used, expires_at);

            CREATE INDEX IF NOT EXISTS idx_pwd_reset_email 
            ON oh_id.password_reset_otps(LOWER(email));

            CREATE INDEX IF NOT EXISTS idx_pwd_reset_correlation 
            ON oh_id.password_reset_otps(correlation_id);
        """)

        # 2. Add optional tracking columns to platform_support_tickets if not already present
        cur.execute("""
            ALTER TABLE oh_id.platform_support_tickets 
            ADD COLUMN IF NOT EXISTS request_category VARCHAR(64);

            ALTER TABLE oh_id.platform_support_tickets 
            ADD COLUMN IF NOT EXISTS client_ip VARCHAR(64);

            CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_num 
            ON oh_id.platform_support_tickets(ticket_number);
        """)

        # 3. Create or replace view for password reset support inquiries
        cur.execute("""
            CREATE OR REPLACE VIEW oh_id.vw_password_reset_assistance AS
            SELECT 
                id,
                ticket_number,
                hospital_id,
                category,
                request_category,
                priority,
                status,
                subject,
                description,
                reported_by_name,
                reported_by_email,
                reported_by_phone,
                assigned_to,
                resolution_notes,
                created_at,
                updated_at,
                resolved_at
            FROM oh_id.platform_support_tickets
            WHERE category IN ('ACCOUNT_RECOVERY', 'PASSWORD_RESET', 'OTP_DELIVERY', 'OTP_VERIFICATION');
        """)

    print("Password reset OTP migration completed successfully!")

if __name__ == "__main__":
    run_migration()
