import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from backend.app.database.session import get_db_cursor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ohid.migrate_sathus_platform_super_admin")

def run_migration():
    logger.info("Starting Sathus Technology Platform Super Admin migration...")
    
    with get_db_cursor() as cur:
        # 1. Base Tables for Platform Super Admin
        cur.execute("""
        CREATE TABLE IF NOT EXISTS oh_id.platform_clients (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(64) UNIQUE NOT NULL,
            client_type VARCHAR(64) NOT NULL DEFAULT 'HOSPITAL_GROUP', -- HOSPITAL_GROUP, CLINIC_CHAIN, DIAGNOSTIC_NETWORK, GOVT_HEALTH, CORPORATE
            primary_contact_name VARCHAR(255),
            primary_contact_email VARCHAR(255),
            primary_contact_phone VARCHAR(64),
            technical_contact_email VARCHAR(255),
            billing_contact_email VARCHAR(255),
            compliance_contact_email VARCHAR(255),
            account_manager VARCHAR(255) DEFAULT 'Sathus Enterprise Team',
            contract_start_date DATE DEFAULT CURRENT_DATE,
            contract_end_date DATE,
            status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, INACTIVE, UNDER_REVIEW
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS oh_id.saas_subscription_plans (
            id VARCHAR(64) PRIMARY KEY,
            code VARCHAR(64) UNIQUE NOT NULL,
            name VARCHAR(128) NOT NULL,
            tier VARCHAR(32) NOT NULL, -- STARTER, PROFESSIONAL, ENTERPRISE, GOVERNMENT, CUSTOM
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
            client_id VARCHAR(64) REFERENCES oh_id.platform_clients(id) ON DELETE SET NULL,
            plan_id VARCHAR(64) NOT NULL REFERENCES oh_id.saas_subscription_plans(id) ON DELETE RESTRICT,
            billing_cycle VARCHAR(32) NOT NULL DEFAULT 'MONTHLY', -- MONTHLY, ANNUAL, QUARTERLY
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

        CREATE TABLE IF NOT EXISTS oh_id.hospital_feature_entitlements (
            id VARCHAR(64) PRIMARY KEY,
            hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
            feature_key VARCHAR(64) NOT NULL, -- patient_identity, patient_portal, doctor_workspace, hospital_admin, appointments_booking, queue_management, prescriptions, lab_reports, medical_documents, reports_analytics, ai_assistant, abdm_m1_m2_m3, teleconsultation, inventory_pharmacy
            feature_name VARCHAR(128) NOT NULL,
            category VARCHAR(64) NOT NULL DEFAULT 'CORE', -- CORE, CLINICAL, ADMINISTRATIVE, ADVANCED, COMPLIANCE
            is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            enabled_by VARCHAR(64) DEFAULT 'SYSTEM',
            configured_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            UNIQUE (hospital_id, feature_key)
        );

        CREATE TABLE IF NOT EXISTS oh_id.saas_invoices (
            id VARCHAR(64) PRIMARY KEY,
            invoice_number VARCHAR(64) UNIQUE NOT NULL,
            hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE RESTRICT,
            client_id VARCHAR(64) REFERENCES oh_id.platform_clients(id) ON DELETE SET NULL,
            subscription_id VARCHAR(64) REFERENCES oh_id.hospital_subscriptions(id) ON DELETE SET NULL,
            subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
            gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
            gst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
            discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
            total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
            paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
            balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
            payment_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PAID, PENDING, OVERDUE, FAILED, REFUNDED, CANCELLED
            due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '15 days'),
            paid_at TIMESTAMPTZ,
            payment_mode VARCHAR(64),
            transaction_ref VARCHAR(128),
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS oh_id.saas_payments (
            id VARCHAR(64) PRIMARY KEY,
            invoice_id VARCHAR(64) NOT NULL REFERENCES oh_id.saas_invoices(id) ON DELETE RESTRICT,
            amount NUMERIC(12, 2) NOT NULL,
            payment_mode VARCHAR(64) NOT NULL DEFAULT 'RAZORPAY_GATEWAY', -- RAZORPAY_GATEWAY, BANK_TRANSFER, CHEQUE, UPI, STRIPE
            transaction_ref VARCHAR(128) NOT NULL,
            gateway_order_id VARCHAR(128),
            gateway_payment_id VARCHAR(128),
            gateway_signature VARCHAR(256),
            status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, PENDING, FAILED, REFUNDED
            recorded_by VARCHAR(64) DEFAULT 'SATHUS_SUPER_ADMIN',
            payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS oh_id.platform_support_tickets (
            id VARCHAR(64) PRIMARY KEY,
            ticket_number VARCHAR(64) UNIQUE NOT NULL,
            hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE SET NULL,
            client_id VARCHAR(64) REFERENCES oh_id.platform_clients(id) ON DELETE SET NULL,
            category VARCHAR(64) NOT NULL DEFAULT 'GENERAL', -- LOGIN_PROBLEM, PATIENT_RECORD, APPOINTMENTS, BILLING_SAAS, SUBSCRIPTION, HOSPITAL_CONFIG, ABDM_INTEGRATION, API_INTEGRATION, SECURITY, DATA_ISSUE, FEATURE_REQUEST, OTHER
            priority VARCHAR(32) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
            status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, WAITING_FOR_CLIENT, RESOLVED, CLOSED
            subject VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            reported_by_name VARCHAR(255),
            reported_by_email VARCHAR(255),
            reported_by_phone VARCHAR(64),
            assigned_to VARCHAR(255) DEFAULT 'Unassigned',
            resolution_notes TEXT,
            sla_due_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
            resolved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS oh_id.platform_impersonation_sessions (
            id VARCHAR(64) PRIMARY KEY,
            session_token VARCHAR(256) UNIQUE NOT NULL,
            admin_user_id VARCHAR(64) NOT NULL REFERENCES oh_id.users(id) ON DELETE CASCADE,
            target_hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
            target_role VARCHAR(64) NOT NULL DEFAULT 'HOSPITAL_ADMIN',
            reason TEXT NOT NULL,
            ticket_ref VARCHAR(64),
            duration_minutes INT NOT NULL DEFAULT 30,
            expires_at TIMESTAMPTZ NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            ended_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS oh_id.platform_audit_logs (
            id VARCHAR(64) PRIMARY KEY,
            admin_user_id VARCHAR(64) REFERENCES oh_id.users(id) ON DELETE SET NULL,
            admin_username VARCHAR(128) NOT NULL,
            action VARCHAR(64) NOT NULL, -- HOSPITAL_ACTIVATED, HOSPITAL_SUSPENDED, HOSPITAL_DISABLED, CLIENT_CREATED, SUBSCRIPTION_CHANGED, FEATURE_ENABLED, FEATURE_DISABLED, PAYMENT_RECORDED, IMPERSONATION_STARTED, IMPERSONATION_ENDED
            entity_type VARCHAR(64) NOT NULL, -- HOSPITAL, CLIENT, SUBSCRIPTION, FEATURE, INVOICE, PAYMENT, SUPPORT_TICKET, IMPERSONATION
            entity_id VARCHAR(64) NOT NULL,
            entity_name VARCHAR(255),
            previous_value JSONB,
            new_value JSONB,
            reason TEXT,
            ticket_ref VARCHAR(64),
            ip_address VARCHAR(64) DEFAULT '127.0.0.1',
            user_agent VARCHAR(255) DEFAULT 'SathusPlatform/1.0',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """)
        logger.info("Base tables created successfully.")

        # 2. Add columns to hospitals table if not present for full SaaS lifecycle
        cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'oh_id' AND table_name = 'hospitals' AND column_name = 'lifecycle_status') THEN
                ALTER TABLE oh_id.hospitals ADD COLUMN lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'oh_id' AND table_name = 'hospitals' AND column_name = 'suspension_reason') THEN
                ALTER TABLE oh_id.hospitals ADD COLUMN suspension_reason TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'oh_id' AND table_name = 'hospitals' AND column_name = 'suspension_ticket_ref') THEN
                ALTER TABLE oh_id.hospitals ADD COLUMN suspension_ticket_ref VARCHAR(64);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'oh_id' AND table_name = 'hospitals' AND column_name = 'suspended_at') THEN
                ALTER TABLE oh_id.hospitals ADD COLUMN suspended_at TIMESTAMPTZ;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'oh_id' AND table_name = 'hospitals' AND column_name = 'suspended_by') THEN
                ALTER TABLE oh_id.hospitals ADD COLUMN suspended_by VARCHAR(64);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'oh_id' AND table_name = 'hospitals' AND column_name = 'client_id') THEN
                ALTER TABLE oh_id.hospitals ADD COLUMN client_id VARCHAR(64) REFERENCES oh_id.platform_clients(id) ON DELETE SET NULL;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'oh_id' AND table_name = 'hospitals' AND column_name = 'onboarded_at') THEN
                ALTER TABLE oh_id.hospitals ADD COLUMN onboarded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
            END IF;
        END $$;
        """)

        # 3. Seed Standard SaaS Subscription Plans
        cur.execute("""
        INSERT INTO oh_id.saas_subscription_plans (id, code, name, tier, monthly_price, annual_price, currency, max_doctors, max_staff, max_storage_gb, monthly_patient_limit, description, features_included)
        VALUES 
        ('plan-starter', 'STARTER', 'Starter Clinic', 'STARTER', 4999.00, 49990.00, 'INR', 3, 10, 20, 1000, 
         'Ideal for single-practitioner OPD clinics and family health centers.',
         '["patient_identity", "patient_portal", "doctor_workspace", "prescriptions", "appointments_booking", "queue_management"]'::jsonb),
        
        ('plan-pro', 'PRO', 'Professional Hospital', 'PROFESSIONAL', 14999.00, 149990.00, 'INR', 15, 50, 100, 10000,
         'Standard plan for multi-specialty hospitals with labs, billing, and full nursing staff.',
         '["patient_identity", "patient_portal", "doctor_workspace", "hospital_admin", "appointments_booking", "queue_management", "prescriptions", "lab_reports", "medical_documents", "reports_analytics"]'::jsonb),
        
        ('plan-enterprise', 'ENTERPRISE', 'Enterprise Multi-Branch Health System', 'ENTERPRISE', 39999.00, 399990.00, 'INR', 100, 500, 1000, 100000,
         'Full multi-branch hospital network operating system with ABDM M1/M2/M3 compliance and AI clinical assistance.',
         '["patient_identity", "patient_portal", "doctor_workspace", "hospital_admin", "appointments_booking", "queue_management", "prescriptions", "lab_reports", "medical_documents", "reports_analytics", "ai_assistant", "abdm_m1_m2_m3", "teleconsultation", "inventory_pharmacy"]'::jsonb),
        
        ('plan-govt', 'GOVERNMENT', 'Government Health Mission & District Care', 'GOVERNMENT', 75000.00, 750000.00, 'INR', 500, 2000, 5000, 1000000,
         'Dedicated high-throughput public healthcare infrastructure with state-wide ABHA/ABDM linkage.',
         '["patient_identity", "patient_portal", "doctor_workspace", "hospital_admin", "appointments_booking", "queue_management", "prescriptions", "lab_reports", "medical_documents", "reports_analytics", "abdm_m1_m2_m3"]'::jsonb),
        
        ('plan-custom', 'CUSTOM', 'Custom Healthcare Network Tier', 'CUSTOM', 25000.00, 250000.00, 'INR', 50, 200, 500, 50000,
         'Bespoke SLA, custom integrations, dedicated account management, and tailored compliance packages.',
         '["patient_identity", "patient_portal", "doctor_workspace", "hospital_admin", "appointments_booking", "queue_management", "prescriptions", "lab_reports", "medical_documents", "reports_analytics", "abdm_m1_m2_m3"]'::jsonb)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            monthly_price = EXCLUDED.monthly_price,
            annual_price = EXCLUDED.annual_price,
            features_included = EXCLUDED.features_included;
        """)

        # 4. Seed Platform Clients
        cur.execute("""
        INSERT INTO oh_id.platform_clients (id, name, code, client_type, primary_contact_name, primary_contact_email, primary_contact_phone, technical_contact_email, billing_contact_email, compliance_contact_email, account_manager, status)
        VALUES
        ('client-kedar-group', 'Kedar Healthcare Group', 'KEDAR-GRP', 'HOSPITAL_GROUP', 'Dr. Kedar Administrator', 'admin@kedarhospital.org', '+91 98401 23456', 'tech@kedarhospital.org', 'billing@kedarhospital.org', 'compliance@kedarhospital.org', 'Sathus Key Accounts', 'ACTIVE'),
        ('client-apollo-reach', 'Apollo Reach Diagnostic Network', 'APOLLO-RCH', 'DIAGNOSTIC_NETWORK', 'Dr. Ramesh Sundar', 'contact@apolloreach.in', '+91 98402 34567', 'it@apolloreach.in', 'finance@apolloreach.in', 'legal@apolloreach.in', 'Sathus Enterprise Team', 'ACTIVE'),
        ('client-madurai-clinics', 'City Care Clinic Chain', 'CITY-CARE-MDU', 'CLINIC_CHAIN', 'Dr. Meenakshi S', 'admin@citycareclinics.in', '+91 98403 45678', 'support@citycareclinics.in', 'accounts@citycareclinics.in', 'admin@citycareclinics.in', 'Sathus Growth Team', 'SUSPENDED'),
        ('client-tn-health-dept', 'Tamil Nadu District Health Mission', 'TNDHM-GOV', 'GOVT_HEALTH', 'Director of Public Health', 'dph@tn.gov.in', '+91 44 2854 1234', 'nic.health@tn.gov.in', 'treasury@tn.gov.in', 'governance@tn.gov.in', 'Sathus Gov Team', 'ACTIVE'),
        ('client-coimbatore-ortho', 'Kovai Ortho & Trauma Specialty Center', 'KOVAI-ORTHO', 'HOSPITAL_GROUP', 'Dr. Arunachalam K', 'dr.arun@kovaiortho.com', '+91 98404 56789', 'admin@kovaiortho.com', 'accounts@kovaiortho.com', 'dr.arun@kovaiortho.com', 'Sathus Enterprise Team', 'ACTIVE')
        ON CONFLICT (id) DO NOTHING;
        """)

        # 5. Link existing hospitals to clients and seed additional demo hospitals across Tamil Nadu
        cur.execute("""
        UPDATE oh_id.hospitals SET client_id = 'client-kedar-group', lifecycle_status = 'ACTIVE' WHERE id = 'hosp-kedar';

        INSERT INTO oh_id.hospitals (id, tenant_id, client_id, name, code, hospital_ref_id, address, city, state, country, phone, email, is_active, lifecycle_status, is_verified, verification_status, booking_enabled, consultation_fee, rating, review_count, featured_badge)
        VALUES
        ('hosp-kedar-iyyappanthangal', 'ten-kedar', 'client-kedar-group', 'Kedar Hospital (Iyyappanthangal Branch)', 'KEDAR-IYY-02', 'hosp-kedar-iyyappanthangal', '14 Mount Poonamallee Road, Iyyappanthangal', 'Chennai', 'Tamil Nadu', 'India', '+91 44 2476 1122', 'iyyappanthangal@kedarhospital.org', TRUE, 'ACTIVE', TRUE, 'VERIFIED', TRUE, 400, 4.8, 184, 'ABDM Ready'),
        ('hosp-kovai-ortho', 'ten-kedar', 'client-coimbatore-ortho', 'Kovai Ortho & Trauma Center', 'KOVAI-ORTHO-01', 'hosp-kovai-ortho', '102 Avinashi Road', 'Coimbatore', 'Tamil Nadu', 'India', '+91 422 256 7890', 'info@kovaiortho.com', TRUE, 'ACTIVE', TRUE, 'VERIFIED', TRUE, 500, 4.9, 312, 'NABH Accredited'),
        ('hosp-madurai-care', 'ten-kedar', 'client-madurai-clinics', 'City Care Clinic (Madurai South)', 'CITY-MDU-01', 'hosp-madurai-care', '45 West Veli Street', 'Madurai', 'Tamil Nadu', 'India', '+91 452 234 5678', 'maduraisouth@citycareclinics.in', FALSE, 'SUSPENDED', TRUE, 'VERIFIED', FALSE, 300, 4.3, 89, NULL),
        ('hosp-trichy-mission', 'ten-kedar', 'client-tn-health-dept', 'Trichy District Community Health Center', 'DHM-TRI-01', 'hosp-trichy-mission', 'Government Hospital Road, Cantonment', 'Tiruchirappalli', 'Tamil Nadu', 'India', '+91 431 241 2345', 'chc.trichy@tn.gov.in', TRUE, 'ACTIVE', TRUE, 'VERIFIED', TRUE, 0, 4.6, 540, 'Govt Health Mission'),
        ('hosp-salem-pediatric', 'ten-kedar', 'client-kedar-group', 'Little Smiles Childrens Hospital', 'SMILES-SLM-01', 'hosp-salem-pediatric', '88 Cherry Road', 'Salem', 'Tamil Nadu', 'India', '+91 427 233 4455', 'care@littlesmiles.in', TRUE, 'ACTIVE', FALSE, 'PENDING_AUDIT', TRUE, 450, 4.7, 142, NULL),
        ('hosp-vels-clinic', 'ten-kedar', 'client-madurai-clinics', 'Vels Family Healthcare Clinic', 'VELS-MDU-02', 'hosp-vels-clinic', '22 Bypass Road, Ponmeni', 'Madurai', 'Tamil Nadu', 'India', '+91 452 260 1122', 'vels@citycareclinics.in', FALSE, 'INACTIVE', FALSE, 'UNVERIFIED', FALSE, 250, 4.1, 45, NULL)
        ON CONFLICT (id) DO UPDATE SET
            client_id = EXCLUDED.client_id,
            lifecycle_status = EXCLUDED.lifecycle_status;
        """)

        # 6. Seed Hospital Subscriptions
        cur.execute("""
        INSERT INTO oh_id.hospital_subscriptions (id, hospital_id, client_id, plan_id, billing_cycle, mrr_amount, annual_amount, discount_percent, status, current_period_start, current_period_end, auto_renew, payment_status, last_payment_date, next_billing_date)
        VALUES
        ('sub-kedar-main', 'hosp-kedar', 'client-kedar-group', 'plan-enterprise', 'MONTHLY', 39999.00, 479988.00, 0, 'ACTIVE', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', TRUE, 'PAID', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days'),
        ('sub-kedar-iyy', 'hosp-kedar-iyyappanthangal', 'client-kedar-group', 'plan-pro', 'MONTHLY', 14999.00, 179988.00, 10.0, 'ACTIVE', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', TRUE, 'PAID', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days'),
        ('sub-kovai-ortho', 'hosp-kovai-ortho', 'client-coimbatore-ortho', 'plan-pro', 'ANNUAL', 12499.00, 149990.00, 0, 'ACTIVE', CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE + INTERVAL '10 months', TRUE, 'PAID', CURRENT_TIMESTAMP - INTERVAL '2 months', CURRENT_DATE + INTERVAL '10 months'),
        ('sub-madurai-care', 'hosp-madurai-care', 'client-madurai-clinics', 'plan-starter', 'MONTHLY', 4999.00, 59988.00, 0, 'SUSPENDED', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '15 days', FALSE, 'OVERDUE', CURRENT_TIMESTAMP - INTERVAL '75 days', CURRENT_DATE - INTERVAL '15 days'),
        ('sub-trichy-mission', 'hosp-trichy-mission', 'client-tn-health-dept', 'plan-govt', 'ANNUAL', 62500.00, 750000.00, 0, 'ACTIVE', CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE + INTERVAL '8 months', TRUE, 'PAID', CURRENT_TIMESTAMP - INTERVAL '4 months', CURRENT_DATE + INTERVAL '8 months'),
        ('sub-salem-pediatric', 'hosp-salem-pediatric', 'client-kedar-group', 'plan-starter', 'MONTHLY', 4999.00, 59988.00, 0, 'ACTIVE', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', TRUE, 'PAID', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days')
        ON CONFLICT (id) DO NOTHING;
        """)

        # 7. Seed Feature Entitlements for all hospitals
        standard_features = [
            ('patient_identity', 'OneHealth Patient Identity & ABHA Pass', 'CORE'),
            ('patient_portal', 'Patient Self-Service Web & Mobile Portal', 'CORE'),
            ('doctor_workspace', 'Doctor Clinical Consultation Workspace', 'CLINICAL'),
            ('hospital_admin', 'Hospital User Management & Role Administration', 'ADMINISTRATIVE'),
            ('appointments_booking', 'Multi-channel Appointment Discovery & Booking', 'CORE'),
            ('queue_management', 'Real-time OPD Token Queue Board & Calling', 'CLINICAL'),
            ('prescriptions', 'Digital Rx & Medication Formulary Pad', 'CLINICAL'),
            ('lab_reports', 'Laboratory Investigations & Digital Test Reports', 'CLINICAL'),
            ('medical_documents', 'Medical Records, Scans, & Doctor Request Inbox', 'CLINICAL'),
            ('reports_analytics', 'Hospital Operations, Roster & Revenue Reports', 'ADMINISTRATIVE'),
            ('ai_assistant', 'Clinical AI Diagnostic & Intake Assistant', 'ADVANCED'),
            ('abdm_m1_m2_m3', 'Ayushman Bharat Digital Mission (M1/M2/M3)', 'COMPLIANCE'),
            ('teleconsultation', 'Encrypted Video Teleconsultation Room', 'ADVANCED'),
            ('inventory_pharmacy', 'Hospital Pharmacy & Drug Dispensary Inventory', 'ADMINISTRATIVE')
        ]

        hospitals = ['hosp-kedar', 'hosp-kedar-iyyappanthangal', 'hosp-kovai-ortho', 'hosp-madurai-care', 'hosp-trichy-mission', 'hosp-salem-pediatric', 'hosp-vels-clinic']
        for hid in hospitals:
            for f_key, f_name, f_cat in standard_features:
                # Disable AI & Teleconsult for starter clinics by default
                is_en = True
                if hid in ['hosp-madurai-care', 'hosp-vels-clinic', 'hosp-salem-pediatric'] and f_key in ['ai_assistant', 'teleconsultation', 'abdm_m1_m2_m3']:
                    is_en = False
                if hid == 'hosp-madurai-care':
                    # Suspended hospital
                    is_en = False

                cur.execute("""
                INSERT INTO oh_id.hospital_feature_entitlements (id, hospital_id, feature_key, feature_name, category, is_enabled, enabled_by)
                VALUES (%s, %s, %s, %s, %s, %s, 'SATHUS_SUPER_ADMIN')
                ON CONFLICT (hospital_id, feature_key) DO UPDATE SET
                    is_enabled = EXCLUDED.is_enabled;
                """, (f"feat-{hid}-{f_key}", hid, f_key, f_name, f_cat, is_en))

        # 8. Seed SaaS Invoices & Payments
        cur.execute("""
        INSERT INTO oh_id.saas_invoices (id, invoice_number, hospital_id, client_id, subscription_id, subtotal, gst_rate, gst_amount, discount_amount, total_amount, paid_amount, balance_amount, payment_status, due_date, paid_at, payment_mode, transaction_ref, notes)
        VALUES
        ('inv-saas-101', 'INV-SATHUS-2026-001', 'hosp-kedar', 'client-kedar-group', 'sub-kedar-main', 39999.00, 18.00, 7199.82, 0, 47198.82, 47198.82, 0, 'PAID', CURRENT_DATE - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days', 'RAZORPAY_GATEWAY', 'pay_sathus_rzp_8849201', 'Enterprise Monthly License - 100 Doctors & ABDM Suite'),
        ('inv-saas-102', 'INV-SATHUS-2026-002', 'hosp-kedar-iyyappanthangal', 'client-kedar-group', 'sub-kedar-iyy', 13499.10, 18.00, 2429.84, 1499.90, 15928.94, 15928.94, 0, 'PAID', CURRENT_DATE - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days', 'RAZORPAY_GATEWAY', 'pay_sathus_rzp_8849202', 'Pro Monthly License - Branch Multi-Specialty'),
        ('inv-saas-103', 'INV-SATHUS-2026-003', 'hosp-kovai-ortho', 'client-coimbatore-ortho', 'sub-kovai-ortho', 149990.00, 18.00, 26998.20, 0, 176988.20, 176988.20, 0, 'PAID', CURRENT_DATE - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '60 days', 'BANK_TRANSFER', 'NEFT-HDFC-9948201', 'Annual Professional License Prepaid'),
        ('inv-saas-104', 'INV-SATHUS-2026-004', 'hosp-madurai-care', 'client-madurai-clinics', 'sub-madurai-care', 4999.00, 18.00, 899.82, 0, 5898.82, 0, 5898.82, 'OVERDUE', CURRENT_DATE - INTERVAL '30 days', NULL, NULL, NULL, 'Payment overdue by 30 days - Account suspended'),
        ('inv-saas-105', 'INV-SATHUS-2026-005', 'hosp-trichy-mission', 'client-tn-health-dept', 'sub-trichy-mission', 750000.00, 18.00, 135000.00, 0, 885000.00, 885000.00, 0, 'PAID', CURRENT_DATE - INTERVAL '120 days', CURRENT_TIMESTAMP - INTERVAL '120 days', 'GOVT_TREASURY_CHALLAN', 'TR-TN-2026-88371', 'Govt Health Mission Annual State License'),
        ('inv-saas-106', 'INV-SATHUS-2026-006', 'hosp-salem-pediatric', 'client-kedar-group', 'sub-salem-pediatric', 4999.00, 18.00, 899.82, 0, 5898.82, 5898.82, 0, 'PAID', CURRENT_DATE - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days', 'UPI_AUTOPAY', 'UPI-ICICI-8849102', 'Starter Monthly Auto-Pay')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO oh_id.saas_payments (id, invoice_id, amount, payment_mode, transaction_ref, gateway_payment_id, status, recorded_by)
        VALUES
        ('pay-saas-01', 'inv-saas-101', 47198.82, 'RAZORPAY_GATEWAY', 'pay_sathus_rzp_8849201', 'pay_rzp_8849201', 'SUCCESS', 'SATHUS_PAYMENT_GATEWAY'),
        ('pay-saas-02', 'inv-saas-102', 15928.94, 'RAZORPAY_GATEWAY', 'pay_sathus_rzp_8849202', 'pay_rzp_8849202', 'SUCCESS', 'SATHUS_PAYMENT_GATEWAY'),
        ('pay-saas-03', 'inv-saas-103', 176988.20, 'BANK_TRANSFER', 'NEFT-HDFC-9948201', NULL, 'SUCCESS', 'SATHUS_TREASURY'),
        ('pay-saas-04', 'inv-saas-105', 885000.00, 'GOVT_TREASURY_CHALLAN', 'TR-TN-2026-88371', NULL, 'SUCCESS', 'SATHUS_TREASURY'),
        ('pay-saas-05', 'inv-saas-106', 5898.82, 'UPI_AUTOPAY', 'UPI-ICICI-8849102', 'upi_8849102', 'SUCCESS', 'SATHUS_PAYMENT_GATEWAY')
        ON CONFLICT (id) DO NOTHING;
        """)

        # 9. Seed Platform Support Tickets
        cur.execute("""
        INSERT INTO oh_id.platform_support_tickets (id, ticket_number, hospital_id, client_id, category, priority, status, subject, description, reported_by_name, reported_by_email, reported_by_phone, assigned_to)
        VALUES
        ('tkt-101', 'TKT-2026-801', 'hosp-kedar', 'client-kedar-group', 'ABDM_INTEGRATION', 'HIGH', 'IN_PROGRESS', 'ABHA Milestones 2 & 3 Sandbox Verification Request', 'Need Sathus tech team assistance to finalize M2 Health Information Provider (HIP) token handshake for Mugalivakkam branch.', 'Kedar Hospital Admin', 'hospadmin@kedarhospital.org', '+91 98401 23456', 'Vijay Sathus (Integrations)'),
        ('tkt-102', 'TKT-2026-802', 'hosp-kovai-ortho', 'client-coimbatore-ortho', 'SUBSCRIPTION', 'LOW', 'OPEN', 'Request for adding 5 additional consulting doctor seats', 'Our orthopedic department is expanding with 5 visiting surgeons. Please upgrade our max doctor quota.', 'Dr. Arunachalam K', 'dr.arun@kovaiortho.com', '+91 98404 56789', 'Deepak Sathus (Billing)'),
        ('tkt-103', 'TKT-2026-803', 'hosp-madurai-care', 'client-madurai-clinics', 'BILLING_SAAS', 'CRITICAL', 'OPEN', 'Payment invoice retry & suspension review', 'We updated our company debit card for invoice INV-SATHUS-2026-004. Please process reactivation.', 'Dr. Meenakshi S', 'admin@citycareclinics.in', '+91 98403 45678', 'Anand Sathus (Accounts)'),
        ('tkt-104', 'TKT-2026-804', 'hosp-trichy-mission', 'client-tn-health-dept', 'FEATURE_REQUEST', 'MEDIUM', 'RESOLVED', 'Custom Tamil language OPD token print format', 'Requesting Tamil language header on thermal token slips for rural OPD counters.', 'DPH Tech Cell', 'dph@tn.gov.in', '+91 44 2854 1234', 'Karthik Sathus (Core)')
        ON CONFLICT (id) DO NOTHING;
        """)

        # 10. Create Database Views for Super Admin
        cur.execute("""
        DROP VIEW IF EXISTS oh_id.vw_platform_super_admin_metrics CASCADE;
        CREATE OR REPLACE VIEW oh_id.vw_platform_super_admin_metrics AS
        SELECT
            (SELECT COUNT(*) FROM oh_id.hospitals) AS total_hospitals,
            (SELECT COUNT(*) FROM oh_id.hospitals WHERE lifecycle_status = 'ACTIVE' OR (lifecycle_status IS NULL AND is_active = TRUE)) AS active_hospitals,
            (SELECT COUNT(*) FROM oh_id.hospitals WHERE lifecycle_status = 'PENDING' OR verification_status = 'PENDING_AUDIT') AS pending_hospitals,
            (SELECT COUNT(*) FROM oh_id.hospitals WHERE lifecycle_status = 'SUSPENDED') AS suspended_hospitals,
            (SELECT COUNT(*) FROM oh_id.hospitals WHERE lifecycle_status = 'INACTIVE' OR is_active = FALSE) AS inactive_hospitals,
            (SELECT COUNT(*) FROM oh_id.platform_clients) AS total_clients,
            (SELECT COUNT(*) FROM oh_id.patients) AS total_patients,
            (SELECT COUNT(*) FROM oh_id.doctors) AS total_doctors,
            (SELECT COUNT(*) FROM oh_id.users WHERE usertype_ref_id IN ('role-nurse', 'role-receptionist', 'role-employee', 'role-other') OR role IN ('NURSE', 'RECEPTIONIST', 'STAFF', 'EMPLOYEE')) AS total_staff,
            (SELECT COUNT(*) FROM oh_id.appointments WHERE appointment_date::date = CURRENT_DATE OR created_at::date = CURRENT_DATE) AS today_appointments,
            (SELECT COUNT(*) FROM oh_id.saas_payments WHERE payment_date::date = CURRENT_DATE) + (SELECT COUNT(*) FROM oh_id.payments WHERE payment_date::date = CURRENT_DATE) AS today_transactions,
            COALESCE((SELECT SUM(mrr_amount) FROM oh_id.hospital_subscriptions WHERE status = 'ACTIVE'), 0) AS mrr,
            COALESCE((SELECT SUM(total_amount) FROM oh_id.saas_invoices WHERE payment_status = 'PAID' AND created_at >= (CURRENT_DATE - INTERVAL '30 days')), 0) AS monthly_revenue,
            COALESCE((SELECT SUM(balance_amount) FROM oh_id.saas_invoices WHERE payment_status IN ('PENDING', 'OVERDUE')), 0) AS pending_payments_amount,
            (SELECT COUNT(*) FROM oh_id.saas_invoices WHERE payment_status = 'FAILED') AS failed_payments_count,
            (SELECT COUNT(*) FROM oh_id.hospital_subscriptions WHERE status = 'ACTIVE') AS active_subscriptions_count,
            (SELECT COUNT(*) FROM oh_id.platform_support_tickets WHERE status IN ('OPEN', 'IN_PROGRESS')) AS open_support_tickets_count;

        DROP VIEW IF EXISTS oh_id.vw_platform_hospitals_full CASCADE;
        CREATE OR REPLACE VIEW oh_id.vw_platform_hospitals_full AS
        SELECT
            h.id,
            h.name,
            h.code,
            h.hospital_ref_id,
            h.city,
            h.state,
            h.country,
            h.address,
            h.phone,
            h.email,
            h.is_active,
            COALESCE(h.lifecycle_status, CASE WHEN h.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END) AS lifecycle_status,
            h.is_verified,
            h.verification_status,
            h.rating,
            h.review_count,
            h.featured_badge,
            h.suspension_reason,
            h.suspension_ticket_ref,
            h.suspended_at,
            h.suspended_by,
            h.onboarded_at,
            h.created_at,
            h.client_id,
            c.name AS client_name,
            c.code AS client_code,
            c.client_type,
            s.id AS subscription_id,
            p.name AS plan_name,
            p.tier AS plan_tier,
            p.code AS plan_code,
            s.billing_cycle,
            s.mrr_amount,
            s.status AS subscription_status,
            s.payment_status,
            s.current_period_end,
            (SELECT COUNT(*) FROM oh_id.doctors d WHERE d.hospital_id = h.id OR d.hospital_id = h.hospital_ref_id) AS doctor_count,
            (SELECT COUNT(*) FROM oh_id.hospital_staff_memberships m WHERE m.hospital_id = h.id) AS staff_count,
            (SELECT COUNT(*) FROM oh_id.departments dept WHERE dept.hospital_id = h.id) AS department_count,
            (SELECT COUNT(*) FROM oh_id.hospital_feature_entitlements feat WHERE feat.hospital_id = h.id AND feat.is_enabled = TRUE) AS enabled_features_count
        FROM oh_id.hospitals h
        LEFT JOIN oh_id.platform_clients c ON h.client_id = c.id
        LEFT JOIN oh_id.hospital_subscriptions s ON h.id = s.hospital_id
        LEFT JOIN oh_id.saas_subscription_plans p ON s.plan_id = p.id;

        DROP VIEW IF EXISTS oh_id.vw_platform_clients_full CASCADE;
        CREATE OR REPLACE VIEW oh_id.vw_platform_clients_full AS
        SELECT
            c.*,
            (SELECT COUNT(*) FROM oh_id.hospitals h WHERE h.client_id = c.id) AS hospital_count,
            (SELECT COUNT(*) FROM oh_id.hospitals h WHERE h.client_id = c.id AND (h.lifecycle_status = 'ACTIVE' OR (h.lifecycle_status IS NULL AND h.is_active = TRUE))) AS active_hospital_count,
            COALESCE((SELECT SUM(s.mrr_amount) FROM oh_id.hospital_subscriptions s WHERE s.client_id = c.id AND s.status = 'ACTIVE'), 0) AS total_mrr,
            COALESCE((SELECT SUM(inv.total_amount) FROM oh_id.saas_invoices inv WHERE inv.client_id = c.id AND inv.payment_status = 'PAID'), 0) AS total_revenue_paid,
            COALESCE((SELECT SUM(inv.balance_amount) FROM oh_id.saas_invoices inv WHERE inv.client_id = c.id AND inv.payment_status IN ('PENDING', 'OVERDUE')), 0) AS outstanding_amount,
            (SELECT COUNT(*) FROM oh_id.platform_support_tickets tkt WHERE tkt.client_id = c.id AND tkt.status IN ('OPEN', 'IN_PROGRESS')) AS open_tickets_count
        FROM oh_id.platform_clients c;

        DROP VIEW IF EXISTS oh_id.vw_platform_subscriptions_full CASCADE;
        CREATE OR REPLACE VIEW oh_id.vw_platform_subscriptions_full AS
        SELECT
            s.*,
            h.name AS hospital_name,
            h.code AS hospital_code,
            h.city AS hospital_city,
            h.lifecycle_status AS hospital_lifecycle_status,
            c.name AS client_name,
            c.code AS client_code,
            p.name AS plan_name,
            p.tier AS plan_tier,
            p.code AS plan_code,
            p.monthly_price AS plan_base_monthly,
            p.annual_price AS plan_base_annual,
            p.max_doctors,
            p.max_staff,
            p.max_storage_gb,
            p.monthly_patient_limit
        FROM oh_id.hospital_subscriptions s
        JOIN oh_id.hospitals h ON s.hospital_id = h.id
        LEFT JOIN oh_id.platform_clients c ON s.client_id = c.id
        JOIN oh_id.saas_subscription_plans p ON s.plan_id = p.id;

        DROP VIEW IF EXISTS oh_id.vw_platform_saas_invoices CASCADE;
        CREATE OR REPLACE VIEW oh_id.vw_platform_saas_invoices AS
        SELECT
            inv.*,
            h.name AS hospital_name,
            h.code AS hospital_code,
            h.city AS hospital_city,
            c.name AS client_name,
            c.code AS client_code
        FROM oh_id.saas_invoices inv
        JOIN oh_id.hospitals h ON inv.hospital_id = h.id
        LEFT JOIN oh_id.platform_clients c ON inv.client_id = c.id;

        DROP VIEW IF EXISTS oh_id.vw_platform_support_tickets CASCADE;
        CREATE OR REPLACE VIEW oh_id.vw_platform_support_tickets AS
        SELECT
            tkt.*,
            h.name AS hospital_name,
            h.code AS hospital_code,
            h.city AS hospital_city,
            c.name AS client_name,
            c.code AS client_code
        FROM oh_id.platform_support_tickets tkt
        LEFT JOIN oh_id.hospitals h ON tkt.hospital_id = h.id
        LEFT JOIN oh_id.platform_clients c ON tkt.client_id = c.id;

        DROP VIEW IF EXISTS oh_id.vw_platform_feature_entitlements CASCADE;
        CREATE OR REPLACE VIEW oh_id.vw_platform_feature_entitlements AS
        SELECT
            f.*,
            h.name AS hospital_name,
            h.code AS hospital_code,
            h.city AS hospital_city,
            h.lifecycle_status AS hospital_lifecycle_status
        FROM oh_id.hospital_feature_entitlements f
        JOIN oh_id.hospitals h ON f.hospital_id = h.id;

        DROP VIEW IF EXISTS oh_id.vw_platform_audit_logs CASCADE;
        CREATE OR REPLACE VIEW oh_id.vw_platform_audit_logs AS
        SELECT
            a.*,
            u.full_name AS admin_full_name,
            u.email AS admin_email
        FROM oh_id.platform_audit_logs a
        LEFT JOIN oh_id.users u ON a.admin_user_id = u.id;
        """)
        logger.info("Views created successfully.")

        # 11. Stored Procedures for Platform Super Admin
        cur.execute("""
        CREATE OR REPLACE PROCEDURE oh_id.sp_platform_update_hospital_status(
            IN p_hospital_id VARCHAR(64),
            IN p_new_status VARCHAR(32), -- ACTIVE, SUSPENDED, INACTIVE, UNDER_REVIEW, TERMINATED, ARCHIVED
            IN p_reason TEXT,
            IN p_ticket_ref VARCHAR(64),
            IN p_admin_user_id VARCHAR(64),
            OUT p_success BOOLEAN,
            OUT p_message TEXT
        )
        LANGUAGE plpgsql
        AS $$
        DECLARE
            v_old_status VARCHAR(32);
            v_hosp_name VARCHAR(255);
            v_admin_username VARCHAR(128);
        BEGIN
            SELECT lifecycle_status, name INTO v_old_status, v_hosp_name FROM oh_id.hospitals WHERE id = p_hospital_id;
            IF NOT FOUND THEN
                p_success := FALSE;
                p_message := 'Hospital not found: ' || p_hospital_id;
                RETURN;
            END IF;

            SELECT username INTO v_admin_username FROM oh_id.users WHERE id = p_admin_user_id;
            IF v_admin_username IS NULL THEN
                v_admin_username := 'superadmin';
            END IF;

            -- Update hospital status
            UPDATE oh_id.hospitals
            SET 
                lifecycle_status = p_new_status,
                is_active = CASE WHEN p_new_status = 'ACTIVE' THEN TRUE ELSE FALSE END,
                suspension_reason = CASE WHEN p_new_status IN ('SUSPENDED', 'INACTIVE', 'TERMINATED') THEN p_reason ELSE NULL END,
                suspension_ticket_ref = CASE WHEN p_new_status IN ('SUSPENDED', 'INACTIVE', 'TERMINATED') THEN p_ticket_ref ELSE NULL END,
                suspended_at = CASE WHEN p_new_status IN ('SUSPENDED', 'INACTIVE', 'TERMINATED') THEN CURRENT_TIMESTAMP ELSE NULL END,
                suspended_by = CASE WHEN p_new_status IN ('SUSPENDED', 'INACTIVE', 'TERMINATED') THEN v_admin_username ELSE NULL END
            WHERE id = p_hospital_id;

            -- Update linked subscription status if suspended/active
            IF p_new_status = 'SUSPENDED' THEN
                UPDATE oh_id.hospital_subscriptions SET status = 'SUSPENDED' WHERE hospital_id = p_hospital_id;
                -- Restrict feature entitlements
                UPDATE oh_id.hospital_feature_entitlements SET is_enabled = FALSE WHERE hospital_id = p_hospital_id;
            ELSIF p_new_status = 'ACTIVE' THEN
                UPDATE oh_id.hospital_subscriptions SET status = 'ACTIVE' WHERE hospital_id = p_hospital_id;
                -- Re-enable core features
                UPDATE oh_id.hospital_feature_entitlements SET is_enabled = TRUE WHERE hospital_id = p_hospital_id AND category IN ('CORE', 'CLINICAL', 'ADMINISTRATIVE');
            END IF;

            -- Audit log
            INSERT INTO oh_id.platform_audit_logs (
                id, admin_user_id, admin_username, action, entity_type, entity_id, entity_name,
                previous_value, new_value, reason, ticket_ref
            ) VALUES (
                'audit-' || gen_random_uuid()::text,
                p_admin_user_id,
                v_admin_username,
                'HOSPITAL_STATUS_CHANGED_' || p_new_status,
                'HOSPITAL',
                p_hospital_id,
                v_hosp_name,
                jsonb_build_object('status', v_old_status),
                jsonb_build_object('status', p_new_status),
                p_reason,
                p_ticket_ref
            );

            p_success := TRUE;
            p_message := 'Hospital ' || v_hosp_name || ' status changed from ' || v_old_status || ' to ' || p_new_status;
        END;
        $$;

        CREATE OR REPLACE PROCEDURE oh_id.sp_platform_update_feature_entitlement(
            IN p_hospital_id VARCHAR(64),
            IN p_feature_key VARCHAR(64),
            IN p_is_enabled BOOLEAN,
            IN p_admin_user_id VARCHAR(64),
            OUT p_success BOOLEAN,
            OUT p_message TEXT
        )
        LANGUAGE plpgsql
        AS $$
        DECLARE
            v_admin_username VARCHAR(128);
            v_hosp_name VARCHAR(255);
            v_old_enabled BOOLEAN;
        BEGIN
            SELECT name INTO v_hosp_name FROM oh_id.hospitals WHERE id = p_hospital_id;
            IF NOT FOUND THEN
                p_success := FALSE;
                p_message := 'Hospital not found: ' || p_hospital_id;
                RETURN;
            END IF;

            SELECT username INTO v_admin_username FROM oh_id.users WHERE id = p_admin_user_id;
            IF v_admin_username IS NULL THEN
                v_admin_username := 'superadmin';
            END IF;

            SELECT is_enabled INTO v_old_enabled FROM oh_id.hospital_feature_entitlements 
            WHERE hospital_id = p_hospital_id AND feature_key = p_feature_key;

            UPDATE oh_id.hospital_feature_entitlements
            SET is_enabled = p_is_enabled, enabled_by = v_admin_username, configured_at = CURRENT_TIMESTAMP
            WHERE hospital_id = p_hospital_id AND feature_key = p_feature_key;

            -- Audit log
            INSERT INTO oh_id.platform_audit_logs (
                id, admin_user_id, admin_username, action, entity_type, entity_id, entity_name,
                previous_value, new_value, reason
            ) VALUES (
                'audit-' || gen_random_uuid()::text,
                p_admin_user_id,
                v_admin_username,
                CASE WHEN p_is_enabled THEN 'FEATURE_ENABLED' ELSE 'FEATURE_DISABLED' END,
                'FEATURE',
                p_hospital_id || ':' || p_feature_key,
                v_hosp_name || ' (' || p_feature_key || ')',
                jsonb_build_object('is_enabled', v_old_enabled),
                jsonb_build_object('is_enabled', p_is_enabled),
                'Manual feature toggle by platform admin'
            );

            p_success := TRUE;
            p_message := 'Feature ' || p_feature_key || ' updated for ' || v_hosp_name;
        END;
        $$;

        CREATE OR REPLACE PROCEDURE oh_id.sp_platform_record_saas_payment(
            IN p_invoice_id VARCHAR(64),
            IN p_amount NUMERIC(12, 2),
            IN p_payment_mode VARCHAR(64),
            IN p_transaction_ref VARCHAR(128),
            IN p_admin_user_id VARCHAR(64),
            OUT p_success BOOLEAN,
            OUT p_message TEXT
        )
        LANGUAGE plpgsql
        AS $$
        DECLARE
            v_admin_username VARCHAR(128);
            v_inv_total NUMERIC(12, 2);
            v_inv_paid NUMERIC(12, 2);
            v_new_paid NUMERIC(12, 2);
            v_new_balance NUMERIC(12, 2);
            v_hosp_id VARCHAR(64);
        BEGIN
            SELECT total_amount, paid_amount, hospital_id INTO v_inv_total, v_inv_paid, v_hosp_id
            FROM oh_id.saas_invoices WHERE id = p_invoice_id;

            IF NOT FOUND THEN
                p_success := FALSE;
                p_message := 'SaaS invoice not found: ' || p_invoice_id;
                RETURN;
            END IF;

            SELECT username INTO v_admin_username FROM oh_id.users WHERE id = p_admin_user_id;
            IF v_admin_username IS NULL THEN
                v_admin_username := 'superadmin';
            END IF;

            v_new_paid := v_inv_paid + p_amount;
            v_new_balance := GREATEST(0, v_inv_total - v_new_paid);

            -- Update invoice
            UPDATE oh_id.saas_invoices
            SET 
                paid_amount = v_new_paid,
                balance_amount = v_new_balance,
                payment_status = CASE WHEN v_new_balance = 0 THEN 'PAID' ELSE 'PARTIAL' END,
                paid_at = CURRENT_TIMESTAMP,
                payment_mode = p_payment_mode,
                transaction_ref = p_transaction_ref
            WHERE id = p_invoice_id;

            -- Record payment transaction
            INSERT INTO oh_id.saas_payments (
                id, invoice_id, amount, payment_mode, transaction_ref, status, recorded_by, payment_date
            ) VALUES (
                'pay-saas-' || gen_random_uuid()::text,
                p_invoice_id,
                p_amount,
                p_payment_mode,
                p_transaction_ref,
                'SUCCESS',
                v_admin_username,
                CURRENT_TIMESTAMP
            );

            -- If hospital was suspended due to overdue invoice and now paid, automatically re-activate
            IF v_new_balance = 0 THEN
                UPDATE oh_id.hospital_subscriptions 
                SET payment_status = 'PAID', status = 'ACTIVE', last_payment_date = CURRENT_TIMESTAMP
                WHERE hospital_id = v_hosp_id;
            END IF;

            -- Audit log
            INSERT INTO oh_id.platform_audit_logs (
                id, admin_user_id, admin_username, action, entity_type, entity_id, entity_name,
                new_value, reason
            ) VALUES (
                'audit-' || gen_random_uuid()::text,
                p_admin_user_id,
                v_admin_username,
                'SAAS_PAYMENT_RECORDED',
                'INVOICE',
                p_invoice_id,
                'SaaS Invoice ' || p_invoice_id,
                jsonb_build_object('amount', p_amount, 'mode', p_payment_mode, 'ref', p_transaction_ref),
                'Payment collection recorded by platform super admin'
            );

            p_success := TRUE;
            p_message := 'Payment of ₹' || p_amount || ' recorded successfully for invoice ' || p_invoice_id;
        END;
        $$;
        """)
        logger.info("Stored procedures created successfully.")

        # 12. Update Role Navigation & Default Route for SUPER_ADMIN to /super-admin
        cur.execute("""
        UPDATE oh_id.roles
        SET 
            default_route = '/super-admin',
            name = 'Sathus Platform Super Administrator',
            navigation_config = '[
                {"title": "Platform Dashboard", "href": "/super-admin", "icon": "LayoutDashboard", "section": "Overview"},
                {"title": "Hospitals & Clinics", "href": "/super-admin/hospitals", "icon": "Hospital", "section": "Tenant Management"},
                {"title": "Clients & Groups", "href": "/super-admin/clients", "icon": "Building2", "section": "Tenant Management"},
                {"title": "Subscriptions & Plans", "href": "/super-admin/subscriptions", "icon": "Receipt", "section": "SaaS & Monetization"},
                {"title": "Payments & Billing", "href": "/super-admin/payments", "icon": "CreditCard", "section": "SaaS & Monetization"},
                {"title": "Feature Entitlements", "href": "/super-admin/features", "icon": "ShieldCheck", "section": "SaaS & Monetization"},
                {"title": "Customer Support Desk", "href": "/super-admin/support", "icon": "HeartPulse", "section": "Support & Operations"},
                {"title": "Security & Impersonation", "href": "/super-admin/security", "icon": "Lock", "section": "Governance & Security"},
                {"title": "Platform Audit Logs", "href": "/super-admin/audit", "icon": "FileText", "section": "Governance & Security"},
                {"title": "System Health & Telemetry", "href": "/super-admin/health", "icon": "Activity", "section": "System"}
            ]'::jsonb
        WHERE code IN ('SUPER_ADMIN', 'PLATFORM_ADMIN') OR usertype_ref_id IN ('role-super-admin', 'role-platform-admin');
        """)
        logger.info("Updated SUPER_ADMIN default_route to /super-admin with enriched navigation.")
        
    logger.info("Sathus Technology Platform Super Admin migration completed successfully!")

if __name__ == "__main__":
    run_migration()
