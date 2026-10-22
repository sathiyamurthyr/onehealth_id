import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(root_dir))

from backend.app.database.session import get_db_cursor

def run_migration():
    print("[MIGRATION] Backfilling full_name and updating oh_id.vw_hospital_users_admin...")
    with get_db_cursor() as cur:
        # 1. Backfill hospital_staff_memberships full_name where null or empty
        cur.execute("""
            UPDATE oh_id.hospital_staff_memberships m
            SET full_name = COALESCE(
                NULLIF(u.full_name, ''),
                NULLIF(CONCAT_WS(' ', m.first_name, m.last_name), ''),
                u.username,
                u.email,
                'Staff Member'
            )
            FROM oh_id.users u
            WHERE m.user_id = u.id AND (m.full_name IS NULL OR TRIM(m.full_name) = '');
        """)
        print(f"Updated {cur.rowcount} hospital staff membership records with missing full_name.")

        # 2. Update view oh_id.vw_hospital_users_admin with COALESCE for full_name and contact fields
        cur.execute("""
            DROP VIEW IF EXISTS oh_id.vw_hospital_users_admin CASCADE;
            CREATE OR REPLACE VIEW oh_id.vw_hospital_users_admin AS
            SELECT 
                m.id AS membership_id,
                m.user_id,
                m.hospital_id,
                h.name AS hospital_name,
                m.branch_id,
                COALESCE(b.name, 'Main Branch') AS branch_name,
                m.department_id,
                COALESCE(d.name, 'General') AS department_name,
                m.employee_id,
                m.first_name,
                m.middle_name,
                m.last_name,
                COALESCE(
                    NULLIF(m.full_name, ''),
                    NULLIF(u.full_name, ''),
                    NULLIF(CONCAT_WS(' ', m.first_name, m.last_name), ''),
                    u.username,
                    u.email,
                    'Staff Member'
                )::character varying(192) AS full_name,
                m.photo_url,
                m.gender,
                m.dob,
                COALESCE(m.mobile, u.phone, u.mobile, '') AS mobile,
                COALESCE(m.email, u.email, '') AS email,
                m.address,
                m.emergency_contact,
                m.joining_date,
                m.employment_type,
                m.designation,
                m.reporting_manager_id,
                m.reporting_manager_name,
                m.employment_status,
                m.status_reason,
                m.role_code,
                COALESCE(r.name, m.role_code) AS role_name,
                m.additional_roles,
                m.branch_ids,
                m.department_ids,
                m.custom_permissions,
                m.shift_access,
                m.login_enabled,
                m.mfa_enabled,
                m.mfa_status,
                m.failed_login_attempts,
                m.locked_until,
                m.last_login_at,
                m.last_active_at,
                m.role_metadata,
                m.credential_number,
                m.credential_authority,
                m.credential_expiry_date,
                m.verification_status,
                m.verified_by,
                m.verified_at,
                m.credential_documents,
                m.created_by,
                m.created_at,
                m.updated_at,
                u.username,
                u.is_active AS user_account_active,
                
                -- Computed Alert Flags for Access Review
                CASE 
                    WHEN m.credential_expiry_date IS NOT NULL AND m.credential_expiry_date < CURRENT_DATE THEN TRUE
                    ELSE FALSE
                END AS is_credential_expired,
                
                CASE 
                    WHEN m.credential_expiry_date IS NOT NULL 
                         AND m.credential_expiry_date >= CURRENT_DATE 
                         AND m.credential_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN TRUE
                    ELSE FALSE
                END AS is_credential_expiring_soon,
                
                CASE 
                    WHEN m.last_active_at IS NULL AND m.created_at < CURRENT_DATE - INTERVAL '90 days' THEN TRUE
                    WHEN m.last_active_at IS NOT NULL AND m.last_active_at < CURRENT_DATE - INTERVAL '90 days' THEN TRUE
                    ELSE FALSE
                END AS is_account_inactive,
                
                CASE 
                    WHEN m.failed_login_attempts >= 5 OR (m.locked_until IS NOT NULL AND m.locked_until > CURRENT_TIMESTAMP) THEN TRUE
                    ELSE FALSE
                END AS is_account_locked

            FROM oh_id.hospital_staff_memberships m
            JOIN oh_id.users u ON m.user_id = u.id
            JOIN oh_id.hospitals h ON m.hospital_id = h.id
            LEFT JOIN oh_id.hospital_branches b ON m.branch_id = b.id
            LEFT JOIN oh_id.departments d ON m.department_id = d.id
            LEFT JOIN oh_id.roles r ON m.role_code = r.code;
        """)
        print("[SUCCESS] oh_id.vw_hospital_users_admin view updated with COALESCE full_name.")

if __name__ == "__main__":
    run_migration()
