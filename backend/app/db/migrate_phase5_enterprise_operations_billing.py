"""
OH-ID PHASE 5: ENTERPRISE HOSPITAL OPERATIONS, BILLING, INSURANCE & OPERATIONAL INTELLIGENCE MIGRATION
Sathus Technology Pvt Ltd

Creates:
1. oh_id.services - Hospital service catalogue
2. oh_id.price_lists & oh_id.price_list_items - Price schedules with effective date versioning
3. oh_id.medical_packages - Clinical service packages (e.g., Surgery, Health Checkup)
4. oh_id.billing_accounts - Patient billing accounts linked to encounters
5. oh_id.charges - Clinical event charge posting
6. Upgraded oh_id.invoices & oh_id.invoice_items with full lifecycle
7. Upgraded oh_id.payments & oh_id.payment_receipts
8. oh_id.refunds & oh_id.billing_adjustments
9. oh_id.financial_reconciliations
10. oh_id.payers & oh_id.patient_insurance_policies
11. oh_id.preauthorizations
12. oh_id.insurance_claims & oh_id.claim_items
13. Analytical Views:
    - oh_id.vw_hospital_financial_analytics
    - oh_id.vw_hospital_operational_kpis
    - oh_id.vw_department_performance_summary
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from backend.app.core.config import settings

def run_migration():
    conn = psycopg2.connect(settings.DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        print("Executing Phase 5 Enterprise Operations & Billing Migration...")

        # 1. Services Catalogue
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.services (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                code VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(64) NOT NULL, -- CONSULTATION, SURGERY, PROCEDURE, LAB_TEST, RADIOLOGY, BED_WARD, NURSING, PHARMACY, PACKAGE, OTHER
                department_id VARCHAR(64),
                taxable BOOLEAN DEFAULT FALSE,
                tax_rate NUMERIC(5, 2) DEFAULT 0.00,
                base_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
                currency VARCHAR(10) DEFAULT 'INR',
                effective_from DATE DEFAULT CURRENT_DATE,
                effective_until DATE DEFAULT '2099-12-31',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_hospital_service_code UNIQUE (hospital_id, code)
            );
            CREATE INDEX IF NOT EXISTS idx_services_hosp_cat ON oh_id.services(hospital_id, category);
        """)

        # 2. Price Lists & Price List Items
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.price_lists (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                code VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                price_list_type VARCHAR(64) NOT NULL DEFAULT 'GENERAL', -- GENERAL, CORPORATE, INSURANCE, GOVERNMENT_SCHEME, EMERGENCY, PACKAGE
                currency VARCHAR(10) DEFAULT 'INR',
                is_default BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_hospital_price_list_code UNIQUE (hospital_id, code)
            );

            CREATE TABLE IF NOT EXISTS oh_id.price_list_items (
                id VARCHAR(64) PRIMARY KEY,
                price_list_id VARCHAR(64) REFERENCES oh_id.price_lists(id) ON DELETE CASCADE,
                service_id VARCHAR(64) REFERENCES oh_id.services(id) ON DELETE CASCADE,
                price NUMERIC(14, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'INR',
                effective_from DATE DEFAULT CURRENT_DATE,
                effective_until DATE DEFAULT '2099-12-31',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_price_list_service UNIQUE (price_list_id, service_id, effective_from)
            );
            CREATE INDEX IF NOT EXISTS idx_price_list_items_lookup ON oh_id.price_list_items(price_list_id, service_id);
        """)

        # 3. Medical Packages
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.medical_packages (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                code VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(64) DEFAULT 'SURGERY', -- SURGERY, HEALTH_CHECKUP, MATERNITY, CARDIOLOGY, DENTAL, OPHTHALMOLOGY
                total_package_price NUMERIC(14, 2) NOT NULL,
                validity_days INT DEFAULT 30,
                inclusions_json JSONB DEFAULT '[]'::jsonb,
                exclusions_json JSONB DEFAULT '[]'::jsonb,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_hospital_package_code UNIQUE (hospital_id, code)
            );
        """)

        # 4. Payers (Insurance, TPA, Corporate, Government)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.payers (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                payer_code VARCHAR(50) NOT NULL,
                payer_type VARCHAR(64) NOT NULL DEFAULT 'INSURANCE', -- SELF_PAY, INSURANCE, CORPORATE, GOVERNMENT_SCHEME, TPA
                contact_person VARCHAR(100),
                contact_email VARCHAR(100),
                contact_phone VARCHAR(50),
                settlement_period_days INT DEFAULT 30,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_hospital_payer_code UNIQUE (hospital_id, payer_code)
            );

            CREATE TABLE IF NOT EXISTS oh_id.patient_insurance_policies (
                id VARCHAR(64) PRIMARY KEY,
                patient_id VARCHAR(64) REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                payer_id VARCHAR(64) REFERENCES oh_id.payers(id) ON DELETE CASCADE,
                policy_number VARCHAR(100) NOT NULL,
                member_id VARCHAR(100) NOT NULL,
                group_number VARCHAR(100),
                policy_holder_name VARCHAR(150),
                relationship VARCHAR(50) DEFAULT 'SELF',
                coverage_limit NUMERIC(14, 2) DEFAULT 500000.00,
                copay_percentage NUMERIC(5, 2) DEFAULT 0.00,
                valid_from DATE DEFAULT CURRENT_DATE,
                valid_to DATE DEFAULT '2028-12-31',
                status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, SUSPENDED, CANCELLED
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_patient_policies ON oh_id.patient_insurance_policies(patient_id, status);
        """)

        # 5. Billing Accounts
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.billing_accounts (
                id VARCHAR(64) PRIMARY KEY,
                patient_id VARCHAR(64) REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                payer_id VARCHAR(64) REFERENCES oh_id.payers(id),
                encounter_id VARCHAR(64),
                admission_id VARCHAR(64),
                currency VARCHAR(10) DEFAULT 'INR',
                status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, CLOSED, SETTLED, SUSPENDED
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_billing_accounts_pat ON oh_id.billing_accounts(patient_id, hospital_id);
        """)

        # 6. Charges
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.charges (
                id VARCHAR(64) PRIMARY KEY,
                billing_account_id VARCHAR(64) REFERENCES oh_id.billing_accounts(id) ON DELETE CASCADE,
                patient_id VARCHAR(64) REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                encounter_id VARCHAR(64),
                admission_id VARCHAR(64),
                source_type VARCHAR(64) NOT NULL, -- OPD_CONSULTATION, LAB_TEST, RADIOLOGY_STUDY, PHARMACY_DISPENSE, BED_NURSING, PROCEDURE, PACKAGE, OTHER
                source_ref_id VARCHAR(64),
                service_id VARCHAR(64) REFERENCES oh_id.services(id),
                description VARCHAR(255) NOT NULL,
                quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
                unit_price NUMERIC(14, 2) NOT NULL,
                discount_amount NUMERIC(14, 2) DEFAULT 0.00,
                tax_amount NUMERIC(14, 2) DEFAULT 0.00,
                net_amount NUMERIC(14, 2) NOT NULL,
                payer_responsibility NUMERIC(14, 2) DEFAULT 0.00,
                patient_responsibility NUMERIC(14, 2) NOT NULL,
                status VARCHAR(50) DEFAULT 'POSTED', -- PENDING, POSTED, INVOICED, CANCELLED, ADJUSTED
                posted_by VARCHAR(64) DEFAULT 'usr-billing',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_charges_account ON oh_id.charges(billing_account_id, status);
            CREATE INDEX IF NOT EXISTS idx_charges_pat_hosp ON oh_id.charges(patient_id, hospital_id);
        """)

        # 7. Invoices Table Enhancements
        cur.execute("""
            -- Ensure invoices table has all Phase 5 enterprise columns
            ALTER TABLE oh_id.invoices 
            ADD COLUMN IF NOT EXISTS billing_account_id VARCHAR(64) REFERENCES oh_id.billing_accounts(id),
            ADD COLUMN IF NOT EXISTS payer_id VARCHAR(64) REFERENCES oh_id.payers(id),
            ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS admission_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '15 days'),
            ADD COLUMN IF NOT EXISTS discount_notes TEXT,
            ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
            ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
            ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

            CREATE INDEX IF NOT EXISTS idx_invoices_hosp_status ON oh_id.invoices(hospital_id, payment_status);
            CREATE INDEX IF NOT EXISTS idx_invoices_patient ON oh_id.invoices(patient_id);
        """)

        # 8. Invoice Line Items Enhancements
        cur.execute("""
            ALTER TABLE oh_id.invoice_items
            ADD COLUMN IF NOT EXISTS charge_id VARCHAR(64) REFERENCES oh_id.charges(id),
            ADD COLUMN IF NOT EXISTS service_id VARCHAR(64) REFERENCES oh_id.services(id),
            ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14, 2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14, 2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS net_amount NUMERIC(14, 2) DEFAULT 0.00;
        """)

        # 9. Payments Table Enhancements & Payment Receipts
        cur.execute("""
            ALTER TABLE oh_id.payments
            ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
            ADD COLUMN IF NOT EXISTS patient_id VARCHAR(64) REFERENCES oh_id.patients(id),
            ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
            ADD COLUMN IF NOT EXISTS gateway_name VARCHAR(50),
            ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(100),
            ADD COLUMN IF NOT EXISTS gateway_signature VARCHAR(255),
            ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100) UNIQUE,
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

            CREATE TABLE IF NOT EXISTS oh_id.payment_receipts (
                id VARCHAR(64) PRIMARY KEY,
                receipt_number VARCHAR(50) NOT NULL UNIQUE,
                payment_id VARCHAR(64) REFERENCES oh_id.payments(id) ON DELETE CASCADE,
                invoice_id VARCHAR(64) REFERENCES oh_id.invoices(id),
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
                patient_id VARCHAR(64) REFERENCES oh_id.patients(id),
                amount NUMERIC(14, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'INR',
                payment_mode VARCHAR(50) NOT NULL,
                transaction_ref VARCHAR(100),
                digital_signature_hash VARCHAR(255),
                issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_receipts_patient ON oh_id.payment_receipts(patient_id);
        """)

        # 10. Refunds & Billing Adjustments
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.refunds (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                payment_id VARCHAR(64) REFERENCES oh_id.payments(id),
                invoice_id VARCHAR(64) REFERENCES oh_id.invoices(id),
                patient_id VARCHAR(64) REFERENCES oh_id.patients(id),
                amount NUMERIC(14, 2) NOT NULL,
                reason TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'REQUESTED', -- REQUESTED, APPROVED, PROCESSED, REJECTED, CANCELLED
                requested_by VARCHAR(64) NOT NULL,
                approved_by VARCHAR(64),
                processed_by VARCHAR(64),
                requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                approved_at TIMESTAMPTZ,
                processed_at TIMESTAMPTZ
            );
            CREATE INDEX IF NOT EXISTS idx_refunds_hosp ON oh_id.refunds(hospital_id, status);

            CREATE TABLE IF NOT EXISTS oh_id.billing_adjustments (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                invoice_id VARCHAR(64) REFERENCES oh_id.invoices(id),
                charge_id VARCHAR(64) REFERENCES oh_id.charges(id),
                patient_id VARCHAR(64) REFERENCES oh_id.patients(id),
                adjustment_type VARCHAR(50) NOT NULL, -- DISCOUNT, WRITE_OFF, CREDIT_NOTE, CORRECTION
                original_amount NUMERIC(14, 2) NOT NULL,
                adjusted_amount NUMERIC(14, 2) NOT NULL,
                adjustment_delta NUMERIC(14, 2) NOT NULL,
                reason TEXT NOT NULL,
                authorized_by VARCHAR(64) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 11. Preauthorizations
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.preauthorizations (
                id VARCHAR(64) PRIMARY KEY,
                preauth_number VARCHAR(50) NOT NULL UNIQUE,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                patient_id VARCHAR(64) REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                payer_id VARCHAR(64) REFERENCES oh_id.payers(id),
                policy_id VARCHAR(64) REFERENCES oh_id.patient_insurance_policies(id),
                service_id VARCHAR(64) REFERENCES oh_id.services(id),
                diagnosis_code VARCHAR(50),
                clinical_justification TEXT NOT NULL,
                requested_amount NUMERIC(14, 2) NOT NULL,
                approved_amount NUMERIC(14, 2) DEFAULT 0.00,
                status VARCHAR(50) DEFAULT 'SUBMITTED', -- DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, PARTIALLY_APPROVED, REJECTED, EXPIRED, CANCELLED
                external_preauth_ref VARCHAR(100),
                denial_reason TEXT,
                valid_until DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
                submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                decision_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_preauth_hosp_pat ON oh_id.preauthorizations(hospital_id, patient_id);
        """)

        # 12. Insurance Claims & Claim Items
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.insurance_claims (
                id VARCHAR(64) PRIMARY KEY,
                claim_number VARCHAR(50) NOT NULL UNIQUE,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                patient_id VARCHAR(64) REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                payer_id VARCHAR(64) REFERENCES oh_id.payers(id),
                policy_id VARCHAR(64) REFERENCES oh_id.patient_insurance_policies(id),
                preauth_id VARCHAR(64) REFERENCES oh_id.preauthorizations(id),
                invoice_id VARCHAR(64) REFERENCES oh_id.invoices(id),
                encounter_id VARCHAR(64),
                admission_id VARCHAR(64),
                claimed_amount NUMERIC(14, 2) NOT NULL,
                approved_amount NUMERIC(14, 2) DEFAULT 0.00,
                settled_amount NUMERIC(14, 2) DEFAULT 0.00,
                patient_copay_amount NUMERIC(14, 2) DEFAULT 0.00,
                status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, READY, SUBMITTED, UNDER_REVIEW, APPROVED, PARTIALLY_APPROVED, REJECTED, SETTLED, APPEALED, CLOSED
                external_claim_ref VARCHAR(100),
                rejection_reason TEXT,
                submitted_at TIMESTAMPTZ,
                settled_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_claims_hosp ON oh_id.insurance_claims(hospital_id, status);

            CREATE TABLE IF NOT EXISTS oh_id.claim_items (
                id VARCHAR(64) PRIMARY KEY,
                claim_id VARCHAR(64) REFERENCES oh_id.insurance_claims(id) ON DELETE CASCADE,
                charge_id VARCHAR(64) REFERENCES oh_id.charges(id),
                service_id VARCHAR(64) REFERENCES oh_id.services(id),
                description VARCHAR(255) NOT NULL,
                quantity NUMERIC(10, 2) DEFAULT 1.00,
                unit_price NUMERIC(14, 2) NOT NULL,
                claimed_amount NUMERIC(14, 2) NOT NULL,
                approved_amount NUMERIC(14, 2) DEFAULT 0.00,
                patient_responsibility NUMERIC(14, 2) DEFAULT 0.00,
                status VARCHAR(50) DEFAULT 'SUBMITTED', -- SUBMITTED, APPROVED, REJECTED
                adjudication_notes TEXT
            );
        """)

        # 13. Financial Reconciliations
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.financial_reconciliations (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                reconciliation_date DATE DEFAULT CURRENT_DATE,
                gateway_or_bank VARCHAR(100) NOT NULL,
                total_invoices_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
                total_payments_recorded NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
                total_bank_settled NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
                discrepancy_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
                status VARCHAR(50) DEFAULT 'MATCHED', -- MATCHED, UNMATCHED, PARTIAL, EXCEPTION, RESOLVED
                exception_notes TEXT,
                reconciled_by VARCHAR(64) DEFAULT 'usr-billing',
                reconciled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 14. Analytical Views for Operational Intelligence
        cur.execute("""
            CREATE OR REPLACE VIEW oh_id.vw_hospital_financial_analytics AS
            SELECT
                h.id AS hospital_id,
                h.name AS hospital_name,
                COALESCE(SUM(i.total_amount), 0) AS gross_billed,
                COALESCE(SUM(i.discount), 0) AS total_discounts,
                COALESCE(SUM(i.tax_gst), 0) AS total_taxes,
                COALESCE(SUM(i.paid_amount), 0) AS total_collected,
                COALESCE(SUM(i.balance_amount), 0) AS total_outstanding,
                COALESCE((
                    SELECT SUM(r.amount) 
                    FROM oh_id.refunds r 
                    WHERE r.hospital_id = h.id AND r.status = 'PROCESSED'
                ), 0) AS total_refunded,
                COALESCE((
                    SELECT SUM(c.claimed_amount - c.settled_amount)
                    FROM oh_id.insurance_claims c
                    WHERE c.hospital_id = h.id AND c.status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED')
                ), 0) AS total_payer_pending,
                COUNT(i.id) AS total_invoices_count,
                COUNT(CASE WHEN i.payment_status = 'PAID' THEN 1 END) AS paid_invoices_count,
                COUNT(CASE WHEN i.payment_status = 'PENDING' THEN 1 END) AS pending_invoices_count
            FROM oh_id.hospitals h
            LEFT JOIN oh_id.invoices i ON h.id = i.hospital_id
            GROUP BY h.id, h.name;

            CREATE OR REPLACE VIEW oh_id.vw_hospital_operational_kpis AS
            SELECT
                h.id AS hospital_id,
                h.name AS hospital_name,
                -- OPD Stats
                (SELECT COUNT(*) FROM oh_id.appointments a WHERE a.hospital_id = h.id AND a.appointment_date = CURRENT_DATE) AS today_appointments_count,
                (SELECT COUNT(*) FROM oh_id.opd_consultations c JOIN oh_id.doctors d ON c.doctor_id = d.id WHERE d.hospital_id = h.id AND c.created_at::date = CURRENT_DATE) AS today_consultations_count,
                -- IPD Stats
                (SELECT COUNT(*) FROM oh_id.ipd_admissions adm WHERE adm.hospital_id = h.id AND adm.status = 'INPATIENT') AS active_inpatient_count,
                (SELECT COUNT(*) FROM oh_id.beds b JOIN oh_id.wards w ON b.ward_id = w.id WHERE w.hospital_id = h.id AND b.status != 'MAINTENANCE') AS total_operational_beds,
                (SELECT COUNT(*) FROM oh_id.beds b JOIN oh_id.wards w ON b.ward_id = w.id WHERE w.hospital_id = h.id AND (b.is_occupied = TRUE OR b.status = 'OCCUPIED')) AS occupied_beds_count,
                -- Emergency Stats
                (SELECT COUNT(*) FROM oh_id.emergency_encounters e WHERE e.hospital_id = h.id AND e.arrival_time::date = CURRENT_DATE) AS today_emergency_count,
                -- Lab & Radiology Stats
                (SELECT COUNT(*) FROM oh_id.lab_results lr WHERE lr.hospital_id = h.id AND lr.status = 'VERIFIED') AS verified_lab_results_count,
                (SELECT COUNT(*) FROM oh_id.radiology_reports rr WHERE rr.hospital_id = h.id AND rr.status = 'FINALIZED') AS finalized_radiology_reports_count
            FROM oh_id.hospitals h;

            CREATE OR REPLACE VIEW oh_id.vw_department_performance_summary AS
            SELECT
                d.id AS department_id,
                d.hospital_id,
                d.name AS department_name,
                COUNT(DISTINCT doc.id) AS active_doctors_count,
                COUNT(DISTINCT c.id) AS total_consultations_count,
                COALESCE(SUM(ch.net_amount), 0) AS total_department_revenue
            FROM oh_id.departments d
            LEFT JOIN oh_id.doctors doc ON d.id = doc.department_id
            LEFT JOIN oh_id.opd_consultations c ON doc.id = c.doctor_id
            LEFT JOIN oh_id.services s ON d.id = s.department_id
            LEFT JOIN oh_id.charges ch ON s.id = ch.service_id AND ch.status IN ('POSTED', 'INVOICED')
            GROUP BY d.id, d.hospital_id, d.name;
        """)

        # 15. Seed Standard Default Services for Active Hospitals (e.g. hosp-kedar)
        cur.execute("""
            INSERT INTO oh_id.services (
                id, hospital_id, code, name, description, category, taxable, tax_rate, base_price, is_active
            )
            SELECT 
                'srv-' || h.id || '-opd-gen',
                h.id,
                'SRV-OPD-GEN',
                'General OPD Consultation',
                'Standard Outpatient General Physician Consultation',
                'CONSULTATION',
                FALSE,
                0.00,
                500.00,
                TRUE
            FROM oh_id.hospitals h
            ON CONFLICT (hospital_id, code) DO NOTHING;

            INSERT INTO oh_id.services (
                id, hospital_id, code, name, description, category, taxable, tax_rate, base_price, is_active
            )
            SELECT 
                'srv-' || h.id || '-cbc-lab',
                h.id,
                'SRV-LAB-CBC',
                'Complete Blood Count (CBC)',
                'Automated 5-part differential hematology profile',
                'LAB_TEST',
                FALSE,
                0.00,
                350.00,
                TRUE
            FROM oh_id.hospitals h
            ON CONFLICT (hospital_id, code) DO NOTHING;

            INSERT INTO oh_id.services (
                id, hospital_id, code, name, description, category, taxable, tax_rate, base_price, is_active
            )
            SELECT 
                'srv-' || h.id || '-xray-chest',
                h.id,
                'SRV-RAD-XRAY',
                'Digital Chest X-Ray (PA View)',
                'High resolution digital radiography chest PA view',
                'RADIOLOGY',
                FALSE,
                0.00,
                650.00,
                TRUE
            FROM oh_id.hospitals h
            ON CONFLICT (hospital_id, code) DO NOTHING;

            INSERT INTO oh_id.services (
                id, hospital_id, code, name, description, category, taxable, tax_rate, base_price, is_active
            )
            SELECT 
                'srv-' || h.id || '-bed-icu',
                h.id,
                'SRV-BED-ICU',
                'Intensive Care Unit (ICU) Bed Charge / Day',
                'Standard daily ICU bed, monitoring and critical nursing charge',
                'BED_WARD',
                FALSE,
                0.00,
                4500.00,
                TRUE
            FROM oh_id.hospitals h
            ON CONFLICT (hospital_id, code) DO NOTHING;

            -- Default Price List
            INSERT INTO oh_id.price_lists (
                id, hospital_id, code, name, price_list_type, is_default, is_active
            )
            SELECT
                'plist-' || h.id || '-standard',
                h.id,
                'PLIST-STANDARD',
                'Standard General Price Schedule',
                'GENERAL',
                TRUE,
                TRUE
            FROM oh_id.hospitals h
            ON CONFLICT (hospital_id, code) DO NOTHING;

            -- Default Payer (Cash / Self-Pay)
            INSERT INTO oh_id.payers (
                id, hospital_id, name, payer_code, payer_type, is_active
            )
            SELECT
                'payer-' || h.id || '-selfpay',
                h.id,
                'Self-Pay (Direct Cash/UPI/Card)',
                'PAYER-SELFPAY',
                'SELF_PAY',
                TRUE
            FROM oh_id.hospitals h
            ON CONFLICT (hospital_id, payer_code) DO NOTHING;

            -- Default Star Health Insurance Payer
            INSERT INTO oh_id.payers (
                id, hospital_id, name, payer_code, payer_type, contact_person, contact_email, settlement_period_days, is_active
            )
            SELECT
                'payer-' || h.id || '-starhealth',
                h.id,
                'Star Health and Allied Insurance',
                'PAYER-STARHEALTH',
                'INSURANCE',
                'TPA Helpdesk',
                'claims@starhealth.in',
                15,
                TRUE
            FROM oh_id.hospitals h
            ON CONFLICT (hospital_id, payer_code) DO NOTHING;
        """)

        conn.commit()
        print("Phase 5 Enterprise Operations & Billing Migration successfully committed.")
    except Exception as e:
        conn.rollback()
        print(f"Error during Phase 5 migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
