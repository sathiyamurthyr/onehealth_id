"""
Migration: Hospital User Management, RBAC, Dynamic Role Profiles & Access Review
Authoritative Implementation for OneHealth ID (OH-ID) & Kedar Hospital.
"""

from backend.app.database.session import get_db_cursor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration.hospital_user_management")

SQL_MIGRATION = """
BEGIN;

-- 1. Hospital Staff Memberships Table
CREATE TABLE IF NOT EXISTS oh_id.hospital_staff_memberships (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES oh_id.users(id) ON DELETE CASCADE,
    hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
    branch_id VARCHAR(64),
    department_id VARCHAR(64),
    employee_id VARCHAR(64),
    
    -- Demographic / Contact
    first_name VARCHAR(64) NOT NULL,
    middle_name VARCHAR(64),
    last_name VARCHAR(64) NOT NULL,
    full_name VARCHAR(192) NOT NULL,
    photo_url TEXT,
    gender VARCHAR(16) DEFAULT 'Other',
    dob DATE,
    mobile VARCHAR(32) NOT NULL,
    email VARCHAR(128) NOT NULL,
    address TEXT,
    emergency_contact VARCHAR(64),
    
    -- Employment
    joining_date DATE DEFAULT CURRENT_DATE,
    employment_type VARCHAR(32) DEFAULT 'FULL_TIME', -- FULL_TIME, PART_TIME, VISITING, CONSULTANT, CONTRACT, INTERN, VOLUNTEER
    designation VARCHAR(128) NOT NULL,
    reporting_manager_id VARCHAR(64),
    reporting_manager_name VARCHAR(128),
    employment_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- INVITED, ACTIVE, INACTIVE, SUSPENDED, LOCKED, TERMINATED, EXPIRED
    status_reason TEXT,
    
    -- Access & Scope
    role_code VARCHAR(64) NOT NULL DEFAULT 'STAFF',
    additional_roles JSONB DEFAULT '[]'::jsonb,
    branch_ids JSONB DEFAULT '[]'::jsonb,
    department_ids JSONB DEFAULT '[]'::jsonb,
    custom_permissions JSONB DEFAULT '[]'::jsonb,
    shift_access VARCHAR(64) DEFAULT 'ALL_SHIFTS', -- ALL_SHIFTS, MORNING_ONLY, EVENING_ONLY, NIGHT_ONLY, ON_CALL
    login_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_status VARCHAR(32) DEFAULT 'NOT_CONFIGURED',
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    
    -- Dynamic Role-Specific Metadata
    role_metadata JSONB DEFAULT '{}'::jsonb,
    -- Examples:
    -- Doctor: { registration_number, registration_authority, nmr_id, qualification, specialty, consultation_type, opd_counter_id, room_number, availability }
    -- Nurse: { registration_number, registration_authority, qualification, ward, shift, supervisor }
    -- Trainee: { training_type, institution, qualification, supervisor_doctor_id, supervisor_name, start_date, end_date, access_level }
    -- Receptionist: { counter_number, allowed_workflows }
    
    -- Professional Credentials & Verification
    credential_number VARCHAR(128),
    credential_authority VARCHAR(128),
    credential_expiry_date DATE,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- VERIFIED, PENDING, REJECTED, EXPIRED, NOT_REQUIRED
    verified_by VARCHAR(64),
    verified_at TIMESTAMPTZ,
    credential_documents JSONB DEFAULT '[]'::jsonb,
    
    created_by VARCHAR(64) DEFAULT 'hospadmin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, hospital_id)
);

-- 2. Enhanced Staff Invitations Table
CREATE TABLE IF NOT EXISTS oh_id.staff_invitations (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
    branch_id VARCHAR(64),
    full_name VARCHAR(128) NOT NULL,
    email VARCHAR(128) NOT NULL,
    mobile VARCHAR(32) NOT NULL,
    role_code VARCHAR(64) NOT NULL DEFAULT 'STAFF',
    department_id VARCHAR(64),
    designation VARCHAR(128),
    employment_type VARCHAR(32) DEFAULT 'FULL_TIME',
    invitation_token VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, CANCELLED, EXPIRED
    resend_count INTEGER NOT NULL DEFAULT 0,
    invited_by VARCHAR(64) DEFAULT 'hospadmin',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2b. Nurses Table
CREATE TABLE IF NOT EXISTS oh_id.nurses (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES oh_id.users(id) ON DELETE SET NULL,
    hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
    department_id VARCHAR(64) REFERENCES oh_id.departments(id),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(128),
    phone VARCHAR(32),
    qualification VARCHAR(100) DEFAULT 'B.Sc Nursing',
    registration_number VARCHAR(100),
    ward VARCHAR(100) DEFAULT 'General Ward',
    shift VARCHAR(50) DEFAULT 'MORNING',
    status VARCHAR(32) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE oh_id.staff_invitations ADD COLUMN IF NOT EXISTS branch_id VARCHAR(64);
ALTER TABLE oh_id.staff_invitations ADD COLUMN IF NOT EXISTS designation VARCHAR(128);
ALTER TABLE oh_id.staff_invitations ADD COLUMN IF NOT EXISTS resend_count INTEGER NOT NULL DEFAULT 0;

-- 3. Dedicated User Access & Mutation Audit Log
CREATE TABLE IF NOT EXISTS oh_id.user_access_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
    target_user_id VARCHAR(64) NOT NULL,
    target_user_name VARCHAR(128) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(128) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    action_type VARCHAR(64) NOT NULL, -- ROLE_CHANGED, PERMISSIONS_UPDATED, BRANCH_ACCESS_MODIFIED, CREDENTIAL_VERIFIED, ACCOUNT_SUSPENDED, ACCOUNT_ACTIVATED, LOGIN_DISABLED, LOGIN_ENABLED, ACCOUNT_UNLOCKED, PASSWORD_RESET_TRIGGERED, SESSIONS_REVOKED, USER_CREATED, USER_UPDATED
    previous_state JSONB,
    new_state JSONB,
    reason TEXT,
    ip_address VARCHAR(64) DEFAULT '127.0.0.1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. View: Normalized Hospital Users View for Admin
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
    m.full_name,
    m.photo_url,
    m.gender,
    m.dob,
    m.mobile,
    m.email,
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

-- 5. View: Operational Access Review Dashboard Aggregates
CREATE OR REPLACE VIEW oh_id.vw_hospital_access_review AS
SELECT
    m.hospital_id,
    COUNT(*) AS total_staff_count,
    COUNT(*) FILTER (WHERE m.employment_status = 'ACTIVE') AS active_staff_count,
    COUNT(*) FILTER (WHERE m.employment_status = 'SUSPENDED') AS suspended_count,
    COUNT(*) FILTER (WHERE m.employment_status = 'INACTIVE') AS inactive_status_count,
    COUNT(*) FILTER (WHERE m.login_enabled IS FALSE) AS login_disabled_count,
    
    -- Credential alerts
    COUNT(*) FILTER (WHERE m.credential_expiry_date IS NOT NULL AND m.credential_expiry_date < CURRENT_DATE) AS expired_credentials_count,
    COUNT(*) FILTER (WHERE m.credential_expiry_date IS NOT NULL AND m.credential_expiry_date >= CURRENT_DATE AND m.credential_expiry_date <= CURRENT_DATE + INTERVAL '30 days') AS expiring_soon_credentials_count,
    COUNT(*) FILTER (WHERE m.verification_status = 'PENDING') AS pending_verifications_count,
    
    -- Inactivity & Security alerts
    COUNT(*) FILTER (WHERE (m.last_active_at IS NULL AND m.created_at < CURRENT_DATE - INTERVAL '90 days') OR (m.last_active_at IS NOT NULL AND m.last_active_at < CURRENT_DATE - INTERVAL '90 days')) AS inactive_accounts_90d_count,
    COUNT(*) FILTER (WHERE m.failed_login_attempts >= 5 OR (m.locked_until IS NOT NULL AND m.locked_until > CURRENT_TIMESTAMP)) AS locked_accounts_count,
    COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(m.custom_permissions, '[]'::jsonb)) > 5) AS excessive_permissions_count,
    
    -- Role breakdowns
    COUNT(*) FILTER (WHERE m.role_code = 'DOCTOR') AS doctors_count,
    COUNT(*) FILTER (WHERE m.role_code = 'NURSE') AS nurses_count,
    COUNT(*) FILTER (WHERE m.role_code = 'TRAINEE') AS trainees_count,
    COUNT(*) FILTER (WHERE m.role_code = 'RECEPTIONIST') AS receptionists_count,
    COUNT(*) FILTER (WHERE m.role_code IN ('LAB_TECHNICIAN', 'LAB_ADMIN')) AS lab_staff_count,
    COUNT(*) FILTER (WHERE m.role_code IN ('PHARMACIST', 'PHARMACY_STAFF')) AS pharmacy_staff_count
FROM oh_id.hospital_staff_memberships m
GROUP BY m.hospital_id;

-- 6. View: User Access Audit Logs Formatted View
CREATE OR REPLACE VIEW oh_id.vw_user_access_audit AS
SELECT 
    a.id,
    a.hospital_id,
    h.name AS hospital_name,
    a.target_user_id,
    a.target_user_name,
    a.actor_id,
    a.actor_name,
    a.actor_role,
    a.action_type,
    a.previous_state,
    a.new_state,
    a.reason,
    a.ip_address,
    a.created_at
FROM oh_id.user_access_audit_logs a
JOIN oh_id.hospitals h ON a.hospital_id = h.id
ORDER BY a.created_at DESC;

COMMIT;
"""

def migrate():
    logger.info("Executing Hospital User Management & Access Review Migration...")
    with get_db_cursor() as cur:
        cur.execute(SQL_MIGRATION)
    logger.info("Hospital User Management Migration executed successfully!")

if __name__ == "__main__":
    migrate()
