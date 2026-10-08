"""
ONEHEALTH ID (OH-ID) — Enterprise IAM, RBAC, Hospital Administration & Access Governance Migration
By Sathus Technology Pvt Ltd.

Creates and ensures normalized entities in schema oh_id:
1. organizations & hospitals (with lifecycle_status, verification_status)
2. hospital_branches, hospital_facilities, hospital_departments, hospital_specialties
3. users, user_profiles, roles, permissions, role_permissions, user_roles, user_scopes
4. hospital_staff_memberships (workforce assignments)
5. user_invitations (secure single-use expiring invitation tokens)
6. user_sessions & login_events (session management, lockout & audit)
7. professional_credentials & credential_documents (medical council, nursing council, etc.)
8. hospital_verifications (statutory license review workflow)
9. hospital_feature_entitlements (module gating per hospital)
10. saas_subscription_plans, hospital_subscriptions, saas_invoices, saas_payments
11. platform_audit_logs & user_access_audit_logs
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from backend.app.database.session import get_db_cursor
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ohid.db.migrate_enterprise_iam")

def run_migration():
    logger.info("Executing Enterprise IAM, RBAC & Hospital Administration migration...")

    with get_db_cursor() as cur:
        # Schema ensure
        cur.execute("CREATE SCHEMA IF NOT EXISTS oh_id;")

        # 1. Organizations (Healthcare Trusts, Corporate Networks, Standalone Foundations)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.organizations (
                id VARCHAR(64) PRIMARY KEY,
                name VARCHAR(128) NOT NULL,
                code VARCHAR(64) UNIQUE NOT NULL,
                org_type VARCHAR(64) NOT NULL DEFAULT 'HOSPITAL_GROUP', -- HOSPITAL_GROUP, CLINIC_CHAIN, GOVT_MISSION, STANDALONE_TRUST
                primary_contact_name VARCHAR(128),
                primary_contact_email VARCHAR(128),
                primary_contact_phone VARCHAR(32),
                technical_contact_email VARCHAR(128),
                billing_contact_email VARCHAR(128),
                compliance_contact_email VARCHAR(128),
                account_manager VARCHAR(128) DEFAULT 'Sathus Key Accounts',
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Hospitals (Facility Entity with Clean Lifecycle & Verification)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.hospitals (
                id VARCHAR(64) PRIMARY KEY,
                tenant_id VARCHAR(64) NOT NULL DEFAULT 'ten-kedar',
                organization_id VARCHAR(64) REFERENCES oh_id.organizations(id) ON DELETE SET NULL,
                client_id VARCHAR(64) REFERENCES oh_id.organizations(id) ON DELETE SET NULL,
                name VARCHAR(128) NOT NULL,
                display_name VARCHAR(128),
                code VARCHAR(64) UNIQUE NOT NULL,
                hospital_ref_id VARCHAR(64),
                hospital_type VARCHAR(64) DEFAULT 'GENERAL_HOSPITAL', -- MULTI_SPECIALTY, SINGLE_SPECIALTY, CLINIC, DIAGNOSTIC_CENTER, TERTIARY_CARE
                ownership_type VARCHAR(64) DEFAULT 'PRIVATE_LIMITED', -- PRIVATE, TRUST, CORPORATE, GOVERNMENT
                registration_number VARCHAR(128),
                registration_authority VARCHAR(128),
                registration_date DATE,
                registration_expiry DATE,
                address TEXT,
                city VARCHAR(64) NOT NULL DEFAULT 'Chennai',
                state VARCHAR(64) NOT NULL DEFAULT 'Tamil Nadu',
                country VARCHAR(64) NOT NULL DEFAULT 'India',
                pin_code VARCHAR(16),
                phone VARCHAR(32),
                email VARCHAR(128),
                website VARCHAR(256),
                emergency_contact VARCHAR(32),
                logo_url TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- PENDING, UNDER_REVIEW, ACTIVE, SUSPENDED, INACTIVE, REJECTED, ARCHIVED
                is_verified BOOLEAN NOT NULL DEFAULT TRUE,
                verification_status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED', -- PENDING, DOCUMENT_SUBMITTED, UNDER_REVIEW, VERIFIED, REJECTED, EXPIRED, SUSPENDED
                booking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                consultation_fee INT NOT NULL DEFAULT 400,
                rating NUMERIC(3, 2) DEFAULT 4.8,
                review_count INT DEFAULT 120,
                featured_badge VARCHAR(64),
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Ensure columns exist if table was previously defined
        cur.execute("""
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64) REFERENCES oh_id.organizations(id) ON DELETE SET NULL;
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS display_name VARCHAR(128);
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS hospital_type VARCHAR(64) DEFAULT 'GENERAL_HOSPITAL';
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(64) DEFAULT 'PRIVATE_LIMITED';
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS registration_number VARCHAR(128);
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS registration_authority VARCHAR(128);
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS registration_date DATE;
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS registration_expiry DATE;
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS pin_code VARCHAR(16);
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS website VARCHAR(256);
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(32);
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS logo_url TEXT;
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'ACTIVE';
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(32) DEFAULT 'ACTIVE';
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS verification_status VARCHAR(32) DEFAULT 'VERIFIED';
            ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
            UPDATE oh_id.hospitals SET status = COALESCE(status, lifecycle_status, 'ACTIVE');
        """)

        # 3. Hospital Branches
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.hospital_branches (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                name VARCHAR(128) NOT NULL,
                code VARCHAR(64) NOT NULL,
                branch_type VARCHAR(32) DEFAULT 'MAIN_CAMPUS', -- MAIN_CAMPUS, SATELLITE_CLINIC, DIAGNOSTIC_HUB, DAYCARE
                address TEXT,
                city VARCHAR(64) NOT NULL DEFAULT 'Chennai',
                state VARCHAR(64) NOT NULL DEFAULT 'Tamil Nadu',
                pin_code VARCHAR(16),
                phone VARCHAR(32),
                email VARCHAR(128),
                emergency_available BOOLEAN NOT NULL DEFAULT TRUE,
                operating_hours VARCHAR(128) DEFAULT '24x7 Emergency / 08:00 AM - 08:00 PM OPD',
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (hospital_id, code)
            );
        """)

        # 4. Hospital Facilities (OPD, IPD, ICU, OT, Blood Bank, etc.)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.hospital_facilities (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                branch_id VARCHAR(64) REFERENCES oh_id.hospital_branches(id) ON DELETE SET NULL,
                facility_code VARCHAR(64) NOT NULL, -- OPD, IPD, EMERGENCY, ICU, OT, PHARMACY, LAB, RADIOLOGY, BLOOD_BANK, AMBULANCE, PHYSIOTHERAPY, DIALYSIS
                facility_name VARCHAR(128) NOT NULL,
                is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                capacity_units INT DEFAULT 0,
                operational_hours VARCHAR(64) DEFAULT '24x7',
                contact_extension VARCHAR(32),
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (hospital_id, facility_code)
            );

            ALTER TABLE oh_id.hospital_facilities ADD COLUMN IF NOT EXISTS name VARCHAR(128);
            ALTER TABLE oh_id.hospital_facilities ADD COLUMN IF NOT EXISTS code VARCHAR(64);
            ALTER TABLE oh_id.hospital_facilities ADD COLUMN IF NOT EXISTS facility_name VARCHAR(128);
            ALTER TABLE oh_id.hospital_facilities ADD COLUMN IF NOT EXISTS facility_code VARCHAR(64);
            UPDATE oh_id.hospital_facilities SET 
                name = COALESCE(name, facility_name, 'Facility'), 
                facility_name = COALESCE(facility_name, name, 'Facility'),
                code = COALESCE(code, facility_code, 'FAC'), 
                facility_code = COALESCE(facility_code, code, 'FAC');
        """)

        # 5. Hospital Departments
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.hospital_departments (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                branch_id VARCHAR(64) REFERENCES oh_id.hospital_branches(id) ON DELETE SET NULL,
                name VARCHAR(128) NOT NULL,
                code VARCHAR(64) NOT NULL,
                category VARCHAR(64) DEFAULT 'CLINICAL', -- CLINICAL, DIAGNOSTIC, ADMINISTRATIVE, SUPPORT
                head_of_department_id VARCHAR(64),
                floor_location VARCHAR(64),
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (hospital_id, code)
            );
        """)

        # 6. Users (Unified Authentication Identity Table)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.users (
                id VARCHAR(64) PRIMARY KEY,
                user_ref_id VARCHAR(64),
                tenant_id VARCHAR(64) NOT NULL DEFAULT 'ten-kedar',
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE SET NULL,
                hospital_ref_id VARCHAR(64),
                username VARCHAR(64) UNIQUE NOT NULL,
                email VARCHAR(128) UNIQUE,
                mobile VARCHAR(32) UNIQUE,
                password_hash VARCHAR(256) NOT NULL,
                full_name VARCHAR(128) NOT NULL,
                role VARCHAR(32) NOT NULL DEFAULT 'STAFF',
                usertype_ref_id VARCHAR(64) DEFAULT 'role-staff',
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                is_verified BOOLEAN NOT NULL DEFAULT FALSE,
                mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                mfa_secret VARCHAR(128),
                failed_login_attempts INT NOT NULL DEFAULT 0,
                locked_until TIMESTAMPTZ,
                last_login_at TIMESTAMPTZ,
                password_changed_at TIMESTAMPTZ,
                must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Ensure columns exist on oh_id.users
        cur.execute("""
            ALTER TABLE oh_id.users ADD COLUMN IF NOT EXISTS mobile VARCHAR(32);
            ALTER TABLE oh_id.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
            ALTER TABLE oh_id.users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
            ALTER TABLE oh_id.users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(128);
            ALTER TABLE oh_id.users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
            ALTER TABLE oh_id.users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
            ALTER TABLE oh_id.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
            ALTER TABLE oh_id.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
            ALTER TABLE oh_id.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
        """)

        # 7. User Profiles (Personal & Extended Employment Metadata)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.user_profiles (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES oh_id.users(id) ON DELETE CASCADE,
                first_name VARCHAR(64) NOT NULL,
                middle_name VARCHAR(64),
                last_name VARCHAR(64) NOT NULL,
                preferred_name VARCHAR(64),
                photo_url TEXT,
                dob DATE,
                gender VARCHAR(16) DEFAULT 'Male',
                address TEXT,
                emergency_contact_name VARCHAR(128),
                emergency_contact_phone VARCHAR(32),
                employee_id VARCHAR(64),
                joining_date DATE,
                employment_type VARCHAR(32) DEFAULT 'FULL_TIME', -- FULL_TIME, PART_TIME, CONSULTANT, VISITING, RESIDENT, INTERN, VOLUNTEER
                designation VARCHAR(128) NOT NULL DEFAULT 'Staff Member',
                reporting_manager_id VARCHAR(64) REFERENCES oh_id.users(id) ON DELETE SET NULL,
                employment_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED, RESIGNED
                termination_date DATE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 8. Roles & Granular Permissions
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.roles (
                id VARCHAR(64) PRIMARY KEY,
                code VARCHAR(64) UNIQUE NOT NULL,
                name VARCHAR(128) NOT NULL,
                scope_type VARCHAR(32) NOT NULL DEFAULT 'HOSPITAL', -- PLATFORM, HOSPITAL, BRANCH, DEPARTMENT
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                description TEXT,
                is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE oh_id.roles ADD COLUMN IF NOT EXISTS code VARCHAR(64);
            ALTER TABLE oh_id.roles ADD COLUMN IF NOT EXISTS name VARCHAR(128);
            ALTER TABLE oh_id.roles ADD COLUMN IF NOT EXISTS scope_type VARCHAR(32) DEFAULT 'HOSPITAL';
            ALTER TABLE oh_id.roles ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(64);
            ALTER TABLE oh_id.roles ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN DEFAULT FALSE;
            ALTER TABLE oh_id.roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

            CREATE TABLE IF NOT EXISTS oh_id.permissions (
                id VARCHAR(64) PRIMARY KEY,
                code VARCHAR(64) UNIQUE NOT NULL,
                name VARCHAR(128) NOT NULL,
                category VARCHAR(64) NOT NULL, -- SYSTEM, HOSPITAL, CLINICAL, NURSING, RECEPTION, LAB, PHARMACY, RADIOLOGY, BILLING, AUDIT
                description TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE oh_id.permissions ADD COLUMN IF NOT EXISTS code VARCHAR(64);
            ALTER TABLE oh_id.permissions ADD COLUMN IF NOT EXISTS name VARCHAR(128);
            ALTER TABLE oh_id.permissions ADD COLUMN IF NOT EXISTS category VARCHAR(64);
            ALTER TABLE oh_id.permissions ADD COLUMN IF NOT EXISTS module VARCHAR(64);
            ALTER TABLE oh_id.permissions ADD COLUMN IF NOT EXISTS description TEXT;
            ALTER TABLE oh_id.permissions ALTER COLUMN module DROP NOT NULL;

            CREATE TABLE IF NOT EXISTS oh_id.role_permissions (
                id VARCHAR(64) PRIMARY KEY,
                role_id VARCHAR(64) NOT NULL REFERENCES oh_id.roles(id) ON DELETE CASCADE,
                permission_id VARCHAR(64) NOT NULL REFERENCES oh_id.permissions(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (role_id, permission_id)
            );

            ALTER TABLE oh_id.role_permissions ADD COLUMN IF NOT EXISTS id VARCHAR(64);
            ALTER TABLE oh_id.role_permissions ADD COLUMN IF NOT EXISTS usertype_ref_id VARCHAR(64);
            ALTER TABLE oh_id.role_permissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        """)

        # 9. Hospital Staff Memberships (Workforce Scope Matrix)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.hospital_staff_memberships (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) NOT NULL REFERENCES oh_id.users(id) ON DELETE CASCADE,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                branch_id VARCHAR(64) REFERENCES oh_id.hospital_branches(id) ON DELETE SET NULL,
                department_id VARCHAR(64) REFERENCES oh_id.hospital_departments(id) ON DELETE SET NULL,
                role_code VARCHAR(64) NOT NULL, -- SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, NURSE, RECEPTIONIST, LAB_STAFF, PHARMACY_STAFF, RADIOLOGY_STAFF, BILLING_STAFF, TRAINEE_INTERN, COORDINATOR, OTHER
                usertype_ref_id VARCHAR(64),
                shift_access VARCHAR(32) DEFAULT 'ALL_SHIFTS', -- ALL_SHIFTS, MORNING, EVENING, NIGHT, ROTATIONAL
                is_primary_assignment BOOLEAN NOT NULL DEFAULT TRUE,
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, INACTIVE, TERMINATED
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, hospital_id, role_code)
            );

            ALTER TABLE oh_id.hospital_staff_memberships ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
            ALTER TABLE oh_id.hospital_staff_memberships ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT TRUE;
            ALTER TABLE oh_id.hospital_staff_memberships ADD COLUMN IF NOT EXISTS designation VARCHAR(128);
            ALTER TABLE oh_id.hospital_staff_memberships ADD COLUMN IF NOT EXISTS employee_id VARCHAR(64);
            ALTER TABLE oh_id.hospital_staff_memberships ADD COLUMN IF NOT EXISTS employment_type VARCHAR(64) DEFAULT 'FULL_TIME';
            ALTER TABLE oh_id.hospital_staff_memberships ADD COLUMN IF NOT EXISTS role_code VARCHAR(64);
            UPDATE oh_id.hospital_staff_memberships SET is_active = COALESCE(is_active, TRUE), is_primary = COALESCE(is_primary, TRUE);
        """)

        # 10. User Invitations (Secure, Cryptographic, Single-Use, Expiring Tokens)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.user_invitations (
                id VARCHAR(64) PRIMARY KEY,
                invitation_token VARCHAR(128) UNIQUE NOT NULL,
                email VARCHAR(128) NOT NULL,
                mobile VARCHAR(32),
                full_name VARCHAR(128) NOT NULL,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                branch_id VARCHAR(64) REFERENCES oh_id.hospital_branches(id) ON DELETE SET NULL,
                department_id VARCHAR(64) REFERENCES oh_id.hospital_departments(id) ON DELETE SET NULL,
                role_code VARCHAR(64) NOT NULL, -- HOSPITAL_ADMIN, DOCTOR, NURSE, RECEPTIONIST, etc.
                designation VARCHAR(128),
                employment_type VARCHAR(32) DEFAULT 'FULL_TIME',
                invited_by VARCHAR(64) NOT NULL, -- admin / hospadmin user ID
                invited_by_name VARCHAR(128),
                status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, EXPIRED, REVOKED
                expires_at TIMESTAMPTZ NOT NULL,
                accepted_at TIMESTAMPTZ,
                created_user_id VARCHAR(64) REFERENCES oh_id.users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 11. Professional Credentials & Documents
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.professional_credentials (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) NOT NULL REFERENCES oh_id.users(id) ON DELETE CASCADE,
                credential_type VARCHAR(64) NOT NULL, -- MEDICAL_COUNCIL, NURSING_COUNCIL, PHARMACY_COUNCIL, LAB_TECHNOLOGIST, RADIOLOGY_TECHNOLOGIST, TRAINEE_ENROLLMENT
                qualification VARCHAR(128) NOT NULL,
                specialization VARCHAR(128),
                sub_specialization VARCHAR(128),
                registration_number VARCHAR(128) NOT NULL,
                registration_authority VARCHAR(128) NOT NULL, -- Tamil Nadu Medical Council, Medical Council of India, Indian Nursing Council, etc.
                registration_date DATE,
                expiry_date DATE,
                professional_registry_id VARCHAR(128), -- ABDM HPR ID / NMC Registry ID
                verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, DOCUMENT_SUBMITTED, UNDER_REVIEW, VERIFIED, REJECTED, EXPIRED, SUSPENDED
                hospital_verified BOOLEAN NOT NULL DEFAULT FALSE,
                hospital_verified_by VARCHAR(64),
                hospital_verified_at TIMESTAMPTZ,
                govt_registry_verified BOOLEAN NOT NULL DEFAULT FALSE,
                govt_registry_verified_at TIMESTAMPTZ,
                notes TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS oh_id.credential_documents (
                id VARCHAR(64) PRIMARY KEY,
                credential_id VARCHAR(64) REFERENCES oh_id.professional_credentials(id) ON DELETE CASCADE,
                user_id VARCHAR(64) NOT NULL REFERENCES oh_id.users(id) ON DELETE CASCADE,
                document_type VARCHAR(64) NOT NULL, -- IDENTITY_PROOF, REGISTRATION_CERTIFICATE, DEGREE_DIPLOMA, EXPERIENCE_LETTER, TRAINING_CERTIFICATE
                document_number VARCHAR(128),
                issuing_authority VARCHAR(128),
                document_url TEXT NOT NULL,
                file_name VARCHAR(256),
                file_size_bytes INT,
                mime_type VARCHAR(64),
                verification_status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, VERIFIED, REJECTED
                verified_by VARCHAR(64),
                verified_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 12. Supplementary schema alignment
        cur.execute("""
            ALTER TABLE oh_id.user_invitations ADD COLUMN IF NOT EXISTS token VARCHAR(128);
            ALTER TABLE oh_id.user_invitations ADD COLUMN IF NOT EXISTS user_id VARCHAR(64);
            ALTER TABLE oh_id.user_invitations ADD COLUMN IF NOT EXISTS role_id VARCHAR(64);
            ALTER TABLE oh_id.user_invitations ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE;
            ALTER TABLE oh_id.user_invitations ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT FALSE;

            ALTER TABLE oh_id.professional_credentials ADD COLUMN IF NOT EXISTS registration_expiry DATE;
            ALTER TABLE oh_id.professional_credentials ADD COLUMN IF NOT EXISTS consultation_type VARCHAR(64) DEFAULT 'IN_PERSON';
            ALTER TABLE oh_id.professional_credentials ADD COLUMN IF NOT EXISTS consultation_room VARCHAR(64) DEFAULT 'Room 101';
            ALTER TABLE oh_id.professional_credentials ADD COLUMN IF NOT EXISTS opd_counter VARCHAR(64) DEFAULT 'Counter 1';
            ALTER TABLE oh_id.professional_credentials ADD COLUMN IF NOT EXISTS appointment_availability VARCHAR(128) DEFAULT 'Mon-Sat 09:00-17:00';

            ALTER TABLE oh_id.user_access_audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(64);
            ALTER TABLE oh_id.user_access_audit_logs ADD COLUMN IF NOT EXISTS action_type VARCHAR(64);
            ALTER TABLE oh_id.user_access_audit_logs ADD COLUMN IF NOT EXISTS actor_name VARCHAR(128);
            ALTER TABLE oh_id.user_access_audit_logs ADD COLUMN IF NOT EXISTS actor_username VARCHAR(128);
            ALTER TABLE oh_id.user_access_audit_logs ADD COLUMN IF NOT EXISTS target_user_id VARCHAR(64);
            ALTER TABLE oh_id.user_access_audit_logs ADD COLUMN IF NOT EXISTS user_id VARCHAR(64);
            ALTER TABLE oh_id.user_access_audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT DEFAULT 'OHID-Web-Client/2026';
            ALTER TABLE oh_id.user_access_audit_logs ALTER COLUMN actor_username DROP NOT NULL;
            ALTER TABLE oh_id.user_access_audit_logs ALTER COLUMN action_type DROP NOT NULL;

            DELETE FROM oh_id.user_roles WHERE id NOT IN (SELECT min(id) FROM oh_id.user_roles GROUP BY user_id, role_id);
            DELETE FROM oh_id.professional_credentials WHERE id NOT IN (SELECT min(id) FROM oh_id.professional_credentials GROUP BY user_id);

            CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON oh_id.users (email) WHERE email IS NOT NULL;
            CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_uidx ON oh_id.user_roles (user_id, role_id);
            CREATE UNIQUE INDEX IF NOT EXISTS professional_credentials_user_id_uidx ON oh_id.professional_credentials (user_id);
        """)

        # 13. Feature Entitlements
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.hospital_feature_entitlements (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                feature_key VARCHAR(64) NOT NULL, -- patient_identity, patient_portal, doctor_workspace, hospital_admin, appointments_booking, queue_management, prescriptions, lab_reports, medical_documents, reports_analytics, ai_assistant, abdm_m1_m2_m3, teleconsultation, inventory_pharmacy
                feature_name VARCHAR(128) NOT NULL,
                category VARCHAR(64) NOT NULL DEFAULT 'CORE',
                is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                enabled_by VARCHAR(64) DEFAULT 'SUPER_ADMIN',
                configured_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                UNIQUE (hospital_id, feature_key)
            );
        """)

        # 14. SaaS Plans, Subscriptions & Invoices
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.saas_subscription_plans (
                id VARCHAR(64) PRIMARY KEY,
                code VARCHAR(64) UNIQUE NOT NULL,
                name VARCHAR(128) NOT NULL,
                tier VARCHAR(32) NOT NULL, -- STARTER, PROFESSIONAL, ENTERPRISE, CUSTOM
                monthly_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
                annual_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
                currency VARCHAR(8) NOT NULL DEFAULT 'INR',
                max_doctors INT NOT NULL DEFAULT 10,
                max_staff INT NOT NULL DEFAULT 30,
                max_storage_gb INT NOT NULL DEFAULT 50,
                monthly_patient_limit INT NOT NULL DEFAULT 5000,
                description TEXT,
                features_included JSONB NOT NULL DEFAULT '[]'::jsonb,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS oh_id.hospital_subscriptions (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE RESTRICT,
                organization_id VARCHAR(64) REFERENCES oh_id.organizations(id) ON DELETE SET NULL,
                client_id VARCHAR(64) REFERENCES oh_id.organizations(id) ON DELETE SET NULL,
                plan_id VARCHAR(64) NOT NULL REFERENCES oh_id.saas_subscription_plans(id) ON DELETE RESTRICT,
                billing_cycle VARCHAR(32) NOT NULL DEFAULT 'MONTHLY',
                mrr_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
                annual_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
                discount_percent NUMERIC(5, 2) DEFAULT 0,
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, OVERDUE, GRACE_PERIOD, RESTRICTED, SUSPENDED, CANCELLED
                current_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
                current_period_end DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
                auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
                payment_status VARCHAR(32) NOT NULL DEFAULT 'PAID', -- PAID, PENDING, OVERDUE, FAILED
                last_payment_date TIMESTAMPTZ,
                next_billing_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS oh_id.saas_invoices (
                id VARCHAR(64) PRIMARY KEY,
                invoice_number VARCHAR(64) UNIQUE NOT NULL,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE RESTRICT,
                organization_id VARCHAR(64) REFERENCES oh_id.organizations(id) ON DELETE SET NULL,
                client_id VARCHAR(64) REFERENCES oh_id.organizations(id) ON DELETE SET NULL,
                subscription_id VARCHAR(64) REFERENCES oh_id.hospital_subscriptions(id) ON DELETE SET NULL,
                subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
                gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
                gst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
                discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
                total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
                paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
                balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
                payment_status VARCHAR(32) NOT NULL DEFAULT 'PAID', -- PAID, PENDING, OVERDUE, FAILED
                due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '15 days'),
                paid_at TIMESTAMPTZ,
                payment_mode VARCHAR(64), -- RAZORPAY_GATEWAY, UPI_AUTOPAY, NEFT_RTGS, CORPORATE_CHEQUE
                transaction_ref VARCHAR(128),
                notes TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 15. User Sessions & Access Control
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.user_sessions (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) NOT NULL REFERENCES oh_id.users(id) ON DELETE CASCADE,
                session_token VARCHAR(256) UNIQUE NOT NULL,
                ip_address VARCHAR(64),
                user_agent TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                expires_at TIMESTAMPTZ NOT NULL,
                last_activity_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS oh_id.login_events (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) REFERENCES oh_id.users(id) ON DELETE SET NULL,
                username VARCHAR(64) NOT NULL,
                hospital_id VARCHAR(64),
                ip_address VARCHAR(64),
                user_agent TEXT,
                status VARCHAR(32) NOT NULL, -- SUCCESS, FAILED_CREDENTIALS, ACCOUNT_LOCKED, SESSION_EXPIRED
                failure_reason TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 16. Platform & Access Audit Logs (Append-Only)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.platform_audit_logs (
                id VARCHAR(64) PRIMARY KEY,
                admin_user_id VARCHAR(64),
                admin_username VARCHAR(64) NOT NULL,
                actor_role VARCHAR(64) NOT NULL DEFAULT 'SUPER_ADMIN',
                hospital_id VARCHAR(64),
                hospital_name VARCHAR(128),
                action VARCHAR(64) NOT NULL,
                entity_type VARCHAR(64) NOT NULL,
                entity_id VARCHAR(64),
                entity_name VARCHAR(128),
                previous_value JSONB,
                new_value JSONB,
                reason TEXT NOT NULL,
                ticket_ref VARCHAR(64),
                ip_address VARCHAR(64) DEFAULT '127.0.0.1',
                user_agent TEXT DEFAULT 'Sathus-Platform-Engine/2026',
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE oh_id.platform_audit_logs ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(64);
            ALTER TABLE oh_id.platform_audit_logs ADD COLUMN IF NOT EXISTS previous_value JSONB;
            ALTER TABLE oh_id.platform_audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB;
            ALTER TABLE oh_id.platform_audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB;

            CREATE TABLE IF NOT EXISTS oh_id.user_access_audit_logs (
                id VARCHAR(64) PRIMARY KEY,
                actor_id VARCHAR(64) NOT NULL,
                actor_username VARCHAR(64) NOT NULL,
                actor_role VARCHAR(64) NOT NULL,
                hospital_id VARCHAR(64) NOT NULL,
                target_user_id VARCHAR(64),
                target_username VARCHAR(64),
                action VARCHAR(64) NOT NULL, -- USER_CREATED, USER_UPDATED, ROLE_CHANGED, PERMISSIONS_UPDATED, USER_SUSPENDED, USER_ACTIVATED, SESSIONS_REVOKED, PASSWORD_RESET_REQUESTED
                previous_state JSONB,
                new_state JSONB,
                reason TEXT,
                ip_address VARCHAR(64),
                user_agent TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 17. Seed Standard Permissions if not existing
        permissions = [
            ('system.manage', 'Platform Super Admin Global Management', 'SYSTEM', 'Full platform-wide governance and hospital provisioning'),
            ('hospital.admin', 'Hospital Facility Administration', 'HOSPITAL', 'Manage hospital profile, staff members, branches and operations'),
            ('hospital.read', 'Hospital Read Access', 'HOSPITAL', 'View hospital information, departments and facility configurations'),
            ('hospital.update', 'Hospital Configuration Update', 'HOSPITAL', 'Update hospital operational and roster settings'),
            ('user.create', 'Create Hospital Workforce Users', 'HOSPITAL', 'Create and issue invitations for doctors, nurses, and operational staff'),
            ('user.read', 'Read Workforce Directory', 'HOSPITAL', 'View hospital user accounts, designations, and assignments'),
            ('user.manage', 'Manage User Status and Roles', 'HOSPITAL', 'Suspend, reactivate, deactivate, and assign permissions'),
            ('role.manage', 'Custom Role Management', 'HOSPITAL', 'Define custom operational roles and assign scoped permission sets'),
            ('doctor.read', 'Doctor Clinical Directory View', 'CLINICAL', 'View doctor roster, room allocation, and specialty details'),
            ('clinical.consultation', 'Doctor Clinical Consultation Pad', 'CLINICAL', 'Conduct patient consultations, clinical notes, and treatment plans'),
            ('clinical.notes.write', 'Write Clinical Notes', 'CLINICAL', 'Document diagnosis, physical exam, and clinical assessments'),
            ('clinical.notes.read', 'Read Clinical Notes', 'CLINICAL', 'Access patient clinical history and progress notes'),
            ('prescription.create', 'Create Digital Prescriptions', 'CLINICAL', 'Issue and sign digital medication prescriptions'),
            ('prescription.read', 'View Prescriptions', 'CLINICAL', 'View digital prescriptions and medication history'),
            ('lab.order', 'Order Laboratory Tests', 'CLINICAL', 'Order blood, urine, pathology and biochemistry lab investigations'),
            ('lab.read', 'View Laboratory Orders & Reports', 'LAB', 'Access test orders and patient lab history'),
            ('lab.result.entry', 'Enter Laboratory Results', 'LAB', 'Input test values, flags and reference ranges'),
            ('lab.report.finalize', 'Finalize Lab Reports', 'LAB', 'Approve and sign off on immutable diagnostic reports'),
            ('pharmacy.dispense', 'Dispense Medications', 'PHARMACY', 'Fulfill prescriptions and record dispensed batches'),
            ('pharmacy.inventory', 'Manage Pharmacy Inventory', 'PHARMACY', 'Manage stock levels, reorder thresholds and batches'),
            ('radiology.order', 'Order Radiology Scans', 'CLINICAL', 'Order X-Ray, CT, MRI and Ultrasound imaging scans'),
            ('radiology.perform', 'Perform Imaging Procedure', 'RADIOLOGY', 'Record radiology procedure and attach DICOM / image scans'),
            ('radiology.report', 'Finalize Radiology Report', 'RADIOLOGY', 'Author and sign off on radiology impression reports'),
            ('reception.queue', 'Front-Office Queue Management', 'RECEPTION', 'Issue OPD tokens, manage waiting room board and patient check-in'),
            ('appointment.view', 'View Appointments', 'RECEPTION', 'Inspect clinic appointments and doctor booking schedules'),
            ('appointment.create', 'Book Appointments', 'RECEPTION', 'Schedule patient OPD visits and consultations'),
            ('patient.search', 'Search Patient Registry', 'RECEPTION', 'Look up patient identity, ABHA pass and records'),
            ('patient.register', 'Register New Patients', 'RECEPTION', 'Create unified patient demographic profile and OH-ID card'),
            ('patient.read', 'Read Patient Profile', 'RECEPTION', 'View patient demographics and registered appointments'),
            ('patient.self.read', 'Patient Self-Service Access', 'PATIENT', 'Personal healthcare workspace access'),
            ('billing.read', 'View Invoices & Billing Records', 'BILLING', 'Inspect consultation invoices and payment statuses'),
            ('billing.create', 'Generate Patient Bills', 'BILLING', 'Create OPD / IPD invoices and collect payments'),
            ('audit.read', 'View Audit & Privacy Trails', 'AUDIT', 'Inspect access logs and statutory compliance activity')
        ]

        for p_code, p_name, p_cat, p_desc in permissions:
            cur.execute("""
                INSERT INTO oh_id.permissions (id, code, name, category, module, description)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (code) DO UPDATE SET 
                    name = EXCLUDED.name, 
                    category = EXCLUDED.category, 
                    module = EXCLUDED.module, 
                    description = EXCLUDED.description;
            """, (f"perm-{p_code.replace('.', '-')}", p_code, p_name, p_cat, p_cat.lower(), p_desc))

        # 18. Seed System Roles
        roles_data = [
            ('role-super-admin', 'SUPER_ADMIN', 'Platform Super Admin', 'PLATFORM', 'Sathus Technology Platform Administrator with global management authority'),
            ('role-hospital-admin', 'HOSPITAL_ADMIN', 'Hospital Executive Admin', 'HOSPITAL', 'Executive Clinical & Hospital Administrator with full operational workforce authority'),
            ('role-doctor', 'DOCTOR', 'Medical Doctor / Consultant', 'HOSPITAL', 'Licensed clinical physician with consultation and prescription privileges'),
            ('role-nurse', 'NURSE', 'Registered Nurse / Staff Nurse', 'HOSPITAL', 'Ward, triage and nursing care specialist'),
            ('role-receptionist', 'RECEPTIONIST', 'Front-Office Receptionist', 'HOSPITAL', 'Patient registration, appointment scheduling and queue counter coordinator'),
            ('role-lab-tech', 'LAB_STAFF', 'Laboratory Technologist', 'HOSPITAL', 'Specimen intake, diagnostic testing and laboratory result entry'),
            ('role-pharmacist', 'PHARMACY_STAFF', 'Pharmacist & Dispenser', 'HOSPITAL', 'Prescription fulfillment, medication verification and stock management'),
            ('role-radiologist', 'RADIOLOGY_STAFF', 'Radiologist / Imaging Tech', 'HOSPITAL', 'Medical imaging, scan capture and diagnostic impression authorization'),
            ('role-billing', 'BILLING_STAFF', 'Billing & Accounts Specialist', 'HOSPITAL', 'Tariff management, invoice generation and payment settlement'),
            ('role-trainee', 'TRAINEE_INTERN', 'Medical / Nursing Intern', 'HOSPITAL', 'Supervised clinical trainee with guardrailed read/assist privileges'),
            ('role-patient', 'PATIENT', 'Citizen / Patient', 'PATIENT', 'Personal healthcare beneficiary and ABHA record holder')
        ]

        for r_id, r_code, r_name, r_scope, r_desc in roles_data:
            cur.execute("""
                INSERT INTO oh_id.roles (id, code, name, scope_type, description, is_system_role, is_active)
                VALUES (%s, %s, %s, %s, %s, TRUE, TRUE)
                ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, scope_type = EXCLUDED.scope_type, description = EXCLUDED.description;
            """, (r_id, r_code, r_name, r_scope, r_desc))

        # 19. Seed Role-Permissions Mapping
        role_perm_map = {
            'role-super-admin': ['system.manage', 'hospital.admin', 'hospital.read', 'hospital.update', 'user.create', 'user.read', 'user.manage', 'role.manage', 'audit.read'],
            'role-hospital-admin': ['hospital.admin', 'hospital.read', 'hospital.update', 'user.create', 'user.read', 'user.manage', 'role.manage', 'doctor.read', 'reception.queue', 'appointment.view', 'appointment.create', 'patient.search', 'patient.register', 'patient.read', 'billing.read', 'audit.read'],
            'role-doctor': ['doctor.read', 'clinical.consultation', 'clinical.notes.write', 'clinical.notes.read', 'prescription.create', 'prescription.read', 'lab.order', 'lab.read', 'radiology.order', 'patient.search', 'patient.read', 'appointment.view'],
            'role-nurse': ['doctor.read', 'clinical.notes.read', 'prescription.read', 'lab.order', 'lab.read', 'reception.queue', 'patient.search', 'patient.read'],
            'role-receptionist': ['reception.queue', 'appointment.view', 'appointment.create', 'patient.search', 'patient.register', 'patient.read', 'billing.read'],
            'role-lab-tech': ['lab.read', 'lab.result.entry', 'lab.report.finalize', 'patient.search', 'patient.read'],
            'role-pharmacist': ['pharmacy.dispense', 'pharmacy.inventory', 'prescription.read', 'patient.search'],
            'role-radiologist': ['radiology.perform', 'radiology.report', 'patient.search', 'patient.read'],
            'role-billing': ['billing.read', 'billing.create', 'patient.search', 'patient.read'],
            'role-trainee': ['doctor.read', 'clinical.notes.read', 'patient.read', 'lab.read', 'appointment.view'],
            'role-patient': ['patient.self.read']
        }

        for role_id, perm_codes in role_perm_map.items():
            for p_code in perm_codes:
                cur.execute("""
                    INSERT INTO oh_id.role_permissions (id, role_id, usertype_ref_id, permission_id)
                    SELECT %s, %s, %s, p.id
                    FROM oh_id.permissions p
                    WHERE p.code = %s
                    ON CONFLICT DO NOTHING;
                """, (f"rp-{role_id}-{p_code.replace('.', '-')}", role_id, role_id, p_code))

        # 20. Seed Standard SaaS Subscription Plans
        plans_data = [
            ('plan-starter', 'STARTER', 'Clinic & OPD Starter', 'STARTER', 4999.00, 49990.00, 5, 10, 20, 1500, 'Ideal for private clinics, single-doctor practices, and day-care centers', json.dumps(["patient_identity", "appointments_booking", "queue_management", "prescriptions"])),
            ('plan-pro', 'PROFESSIONAL', 'Hospital Professional Tier', 'PROFESSIONAL', 14999.00, 149990.00, 25, 60, 100, 10000, 'Comprehensive package for multi-specialty nursing homes & community hospitals', json.dumps(["patient_identity", "patient_portal", "doctor_workspace", "hospital_admin", "appointments_booking", "queue_management", "prescriptions", "lab_reports", "medical_documents", "reports_analytics"])),
            ('plan-enterprise', 'ENTERPRISE', 'Enterprise Multi-Campus Network', 'ENTERPRISE', 39999.00, 399990.00, 100, 300, 500, 50000, 'Full-spectrum hospital operating system with multi-branch management, ABDM M1-M3, and AI assistance', json.dumps(["patient_identity", "patient_portal", "doctor_workspace", "hospital_admin", "appointments_booking", "queue_management", "prescriptions", "lab_reports", "medical_documents", "reports_analytics", "ai_assistant", "abdm_m1_m2_m3", "teleconsultation", "inventory_pharmacy"]))
        ]

        for p_id, p_code, p_name, p_tier, p_mo, p_ann, p_docs, p_stf, p_stor, p_pts, p_desc, p_feats in plans_data:
            cur.execute("""
                INSERT INTO oh_id.saas_subscription_plans (id, code, name, tier, monthly_price, annual_price, max_doctors, max_staff, max_storage_gb, monthly_patient_limit, description, features_included, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, TRUE)
                ON CONFLICT (id) DO UPDATE SET 
                    code = EXCLUDED.code,
                    name = EXCLUDED.name, 
                    tier = EXCLUDED.tier,
                    monthly_price = EXCLUDED.monthly_price, 
                    annual_price = EXCLUDED.annual_price,
                    max_doctors = EXCLUDED.max_doctors,
                    max_staff = EXCLUDED.max_staff,
                    max_storage_gb = EXCLUDED.max_storage_gb,
                    monthly_patient_limit = EXCLUDED.monthly_patient_limit,
                    description = EXCLUDED.description,
                    features_included = EXCLUDED.features_included;
            """, (p_id, p_code, p_name, p_tier, p_mo, p_ann, p_docs, p_stf, p_stor, p_pts, p_desc, p_feats))

        logger.info("Enterprise IAM, RBAC & Hospital Administration migration completed successfully.")

if __name__ == "__main__":
    run_migration()
