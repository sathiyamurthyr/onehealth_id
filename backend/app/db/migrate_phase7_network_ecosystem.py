"""
OH-ID PHASE 7: HEALTHCARE NETWORK & ECOSYSTEM MIGRATION
Sathus Technology Pvt Ltd

Creates:
1. oh_id.network_providers - Multi-facility provider registry (Hospitals, Clinics, Labs, Pharmacies, Diagnostic, Specialist Centres)
2. oh_id.network_facilities - Physical branches & facilities in the connected network
3. oh_id.cross_provider_identities - External patient ID (MRN) mappings to master OH-ID
4. oh_id.network_consents - Granular multi-provider patient consent records (scoped by record type, purpose, and time)
5. oh_id.network_record_exchanges - Immutable cross-provider access & provenance exchange log
6. oh_id.network_referrals - Bi-directional digital referrals with clinical questions & response loop
7. oh_id.network_pharmacy_dispensations - E-prescription dispensation verification & tracking
8. oh_id.network_diagnostic_orders - Inter-facility lab order exchange, specimen tracking & critical flags
9. oh_id.emergency_break_glass_logs - Reason-based emergency break-glass access logs
10. oh_id.network_service_offerings - Directory/Marketplace of verified medical services & consultations
11. Analytical Views:
    - oh_id.vw_network_unified_patient_timeline
    - oh_id.vw_network_referral_analytics
    - oh_id.vw_network_provider_directory
"""

import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import psycopg2
from psycopg2.extras import RealDictCursor
from backend.app.core.config import settings

def run_migration():
    conn = psycopg2.connect(settings.DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        print("Executing Phase 7 Healthcare Network & Ecosystem Migration...")

        # 1. Network Providers Registry
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.network_providers (
                id VARCHAR(64) PRIMARY KEY,
                organization_name VARCHAR(255) NOT NULL,
                provider_type VARCHAR(64) NOT NULL, -- HOSPITAL, CLINIC, LAB, PHARMACY, DIAGNOSTIC, SPECIALIST, EMERGENCY
                registration_number VARCHAR(128) NOT NULL,
                tax_id VARCHAR(64),
                primary_contact_name VARCHAR(128) NOT NULL,
                primary_email VARCHAR(255) NOT NULL,
                primary_phone VARCHAR(32) NOT NULL,
                city VARCHAR(128) NOT NULL,
                state VARCHAR(128) NOT NULL,
                country VARCHAR(64) DEFAULT 'India',
                onboarding_stage VARCHAR(64) DEFAULT 'ACTIVE', -- PENDING, UNDER_REVIEW, VERIFIED, ACTIVE, SUSPENDED, INACTIVE
                verification_documents JSONB DEFAULT '[]'::jsonb,
                verified_by VARCHAR(64),
                verified_at TIMESTAMPTZ,
                rating NUMERIC(3, 2) DEFAULT 4.8,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Network Facilities / Branches
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.network_facilities (
                id VARCHAR(64) PRIMARY KEY,
                provider_id VARCHAR(64) NOT NULL REFERENCES oh_id.network_providers(id) ON DELETE CASCADE,
                facility_name VARCHAR(255) NOT NULL,
                facility_type VARCHAR(64) NOT NULL,
                address_line VARCHAR(255),
                city VARCHAR(128) NOT NULL,
                pincode VARCHAR(16),
                geo_latitude NUMERIC(10, 7),
                geo_longitude NUMERIC(10, 7),
                emergency_capable BOOLEAN DEFAULT FALSE,
                operating_hours JSONB DEFAULT '{"monday_friday": "08:00 - 20:00", "saturday_sunday": "08:00 - 14:00"}'::jsonb,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 3. Cross-Provider Patient Identity Mappings
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.cross_provider_identities (
                id VARCHAR(64) PRIMARY KEY,
                master_patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                onehealth_id VARCHAR(32) NOT NULL,
                provider_id VARCHAR(64) NOT NULL REFERENCES oh_id.network_providers(id) ON DELETE CASCADE,
                external_mrn VARCHAR(128) NOT NULL,
                match_confidence NUMERIC(5, 2) DEFAULT 100.0,
                match_method VARCHAR(64) DEFAULT 'EXACT_OHID_QR', -- EXACT_OHID_QR, MOBILE_DEMO_MATCH, MANUAL_MERGE
                is_verified BOOLEAN DEFAULT TRUE,
                linked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_provider_mrn UNIQUE(provider_id, external_mrn)
            );
        """)

        # 4. Granular Multi-Provider Patient Consents
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.network_consents (
                id VARCHAR(64) PRIMARY KEY,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                grantee_provider_id VARCHAR(64) NOT NULL REFERENCES oh_id.network_providers(id) ON DELETE CASCADE,
                grantee_doctor_id VARCHAR(64),
                grantor_provider_id VARCHAR(64), -- specific source provider or NULL for all
                consent_scope VARCHAR(64) NOT NULL DEFAULT 'ALL_RECORDS', -- ALL_RECORDS, LABS_ONLY, PRESCRIPTIONS_ONLY, CONSULTATIONS_ONLY, EPISODE_ONLY
                purpose VARCHAR(64) NOT NULL DEFAULT 'CARE_TREATMENT', -- CARE_TREATMENT, SECOND_OPINION, DIAGNOSTIC_REVIEW, EMERGENCY
                status VARCHAR(32) NOT NULL DEFAULT 'GRANTED', -- GRANTED, EXPIRED, REVOKED, DENIED
                valid_from TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                valid_until TIMESTAMPTZ NOT NULL,
                revoked_at TIMESTAMPTZ,
                revoked_reason VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 5. Cross-Provider Health Record Exchange & Provenance Log
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.network_record_exchanges (
                id VARCHAR(64) PRIMARY KEY,
                consent_id VARCHAR(64) REFERENCES oh_id.network_consents(id),
                patient_id VARCHAR(64) NOT NULL,
                source_provider_id VARCHAR(64) NOT NULL,
                requester_provider_id VARCHAR(64) NOT NULL,
                requester_user_id VARCHAR(64) NOT NULL,
                record_type VARCHAR(64) NOT NULL, -- CONSULTATION, PRESCRIPTION, LAB_REPORT, RADIOLOGY, DISCHARGE
                record_id VARCHAR(64) NOT NULL,
                provenance_hash VARCHAR(128) NOT NULL,
                purpose VARCHAR(64) NOT NULL,
                is_emergency_break_glass BOOLEAN DEFAULT FALSE,
                accessed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 6. Inter-Provider Referrals
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.network_referrals (
                id VARCHAR(64) PRIMARY KEY,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                referring_provider_id VARCHAR(64) NOT NULL REFERENCES oh_id.network_providers(id),
                referring_doctor_id VARCHAR(64) NOT NULL,
                referring_doctor_name VARCHAR(128),
                target_provider_id VARCHAR(64) NOT NULL REFERENCES oh_id.network_providers(id),
                target_specialty VARCHAR(128) NOT NULL,
                urgency VARCHAR(32) DEFAULT 'ROUTINE', -- ROUTINE, URGENT, STAT_EMERGENCY
                clinical_summary TEXT NOT NULL,
                referral_question TEXT,
                attached_record_ids JSONB DEFAULT '[]'::jsonb,
                status VARCHAR(32) DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED, COMPLETED, CANCELLED
                target_appointment_id VARCHAR(64),
                response_notes TEXT,
                completed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 7. Network Pharmacy Dispensations
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.network_pharmacy_dispensations (
                id VARCHAR(64) PRIMARY KEY,
                prescription_id VARCHAR(64) NOT NULL,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id),
                prescribing_hospital_id VARCHAR(64) NOT NULL,
                dispensing_pharmacy_id VARCHAR(64) NOT NULL REFERENCES oh_id.network_providers(id),
                dispensing_pharmacist_id VARCHAR(64),
                dispensing_pharmacist_name VARCHAR(128),
                dispensed_items JSONB NOT NULL DEFAULT '[]'::jsonb,
                dispensing_status VARCHAR(32) DEFAULT 'DISPENSED', -- VERIFIED, PARTIALLY_DISPENSED, DISPENSED, REJECTED
                batch_numbers JSONB DEFAULT '{}'::jsonb,
                notes TEXT,
                dispensed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 8. Network Diagnostic Lab Orders & Results
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.network_diagnostic_orders (
                id VARCHAR(64) PRIMARY KEY,
                order_id VARCHAR(64) NOT NULL,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id),
                ordering_provider_id VARCHAR(64) NOT NULL,
                diagnostic_lab_id VARCHAR(64) NOT NULL REFERENCES oh_id.network_providers(id),
                test_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
                specimen_status VARCHAR(32) DEFAULT 'ORDERED', -- ORDERED, SPECIMEN_COLLECTED, PROCESSING, REPORT_READY, CANCELLED
                specimen_collected_at TIMESTAMPTZ,
                critical_flag BOOLEAN DEFAULT FALSE,
                result_report_id VARCHAR(64),
                turnaround_minutes INTEGER,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMPTZ
            );
        """)

        # 9. Emergency Break-Glass Access Logs
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.emergency_break_glass_logs (
                id VARCHAR(64) PRIMARY KEY,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id),
                provider_id VARCHAR(64) NOT NULL REFERENCES oh_id.network_providers(id),
                clinician_id VARCHAR(64) NOT NULL,
                clinician_name VARCHAR(128) NOT NULL,
                reason VARCHAR(255) NOT NULL,
                triage_level VARCHAR(32) NOT NULL, -- RESUSCITATION, EMERGENT, URGENT
                accessed_records JSONB NOT NULL DEFAULT '[]'::jsonb,
                patient_notified BOOLEAN DEFAULT TRUE,
                authorized_window_minutes INTEGER DEFAULT 120,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 10. Network Marketplace Service Offerings
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.network_service_offerings (
                id VARCHAR(64) PRIMARY KEY,
                provider_id VARCHAR(64) NOT NULL REFERENCES oh_id.network_providers(id) ON DELETE CASCADE,
                facility_id VARCHAR(64) REFERENCES oh_id.network_facilities(id),
                service_name VARCHAR(255) NOT NULL,
                specialty VARCHAR(128) NOT NULL,
                category VARCHAR(64) NOT NULL, -- OPD_CONSULTATION, DIAGNOSTIC_SCAN, LAB_TEST, SURGERY_PACKAGE, PHARMACY
                standard_rate NUMERIC(12, 2) NOT NULL,
                is_bookable_online BOOLEAN DEFAULT TRUE,
                average_wait_days INTEGER DEFAULT 0,
                rating NUMERIC(3, 2) DEFAULT 4.8,
                is_active BOOLEAN DEFAULT TRUE
            );
        """)

        # 11. Authoritative Views
        cur.execute("""
            CREATE OR REPLACE VIEW oh_id.vw_network_unified_patient_timeline AS
            SELECT 
                e.event_id,
                e.patient_id,
                p.onehealth_id,
                e.event_type AS record_type,
                e.title,
                e.summary AS subtitle,
                e.hospital_id AS provider_id,
                COALESCE(np.organization_name, e.hospital_name, 'Healthcare Provider') AS provider_name,
                COALESCE(np.provider_type, 'HOSPITAL') AS facility_type,
                e.event_timestamp AS event_date,
                e.event_timestamp AS created_at
            FROM oh_id.vw_health_timeline_events e
            JOIN oh_id.patients p ON e.patient_id = p.id
            LEFT JOIN oh_id.network_providers np ON e.hospital_id = np.id;
        """)

        cur.execute("""
            CREATE OR REPLACE VIEW oh_id.vw_network_referral_analytics AS
            SELECT 
                target_provider_id,
                COUNT(*) AS total_referrals_received,
                COUNT(CASE WHEN status = 'ACCEPTED' THEN 1 END) AS accepted_count,
                COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed_count,
                ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, CURRENT_TIMESTAMP) - created_at))/3600)::numeric, 1) AS avg_turnaround_hours
            FROM oh_id.network_referrals
            GROUP BY target_provider_id;
        """)

        cur.execute("""
            CREATE OR REPLACE VIEW oh_id.vw_network_provider_directory AS
            SELECT 
                np.id AS provider_id,
                np.organization_name,
                np.provider_type,
                np.city,
                np.state,
                np.rating,
                np.onboarding_stage,
                COUNT(DISTINCT nf.id) AS active_facilities_count,
                COUNT(DISTINCT nso.id) AS published_services_count
            FROM oh_id.network_providers np
            LEFT JOIN oh_id.network_facilities nf ON np.id = nf.provider_id AND nf.is_active = TRUE
            LEFT JOIN oh_id.network_service_offerings nso ON np.id = nso.provider_id AND nso.is_active = TRUE
            WHERE np.is_active = TRUE
            GROUP BY np.id, np.organization_name, np.provider_type, np.city, np.state, np.rating, np.onboarding_stage;
        """)

        # ---------------------------------------------------------------------
        # SEED PARTICIPATING NETWORK PROVIDERS & FACILITIES
        # ---------------------------------------------------------------------
        seed_providers = [
            ("hosp-kedar", "Kedar Multi-Speciality Hospital", "HOSPITAL", "REG-HOSP-KA-0842", "29AAAAA0000A1Z5", "Dr. Senthil Nathan", "admin@kedarhospital.com", "+91-9840123456", "Bangalore", "Karnataka", "ACTIVE", 4.9),
            ("hosp-apollo", "Apollo Health City", "HOSPITAL", "REG-HOSP-TN-1102", "33AAAAA1111B1Z2", "Dr. Rajesh Kumar", "connect@apollohealth.org", "+91-9840001122", "Chennai", "Tamil Nadu", "ACTIVE", 4.8),
            ("lab-thyrocare", "Thyrocare Diagnostic Technologies", "LABORATORY", "REG-LAB-MH-5521", "27AAAAA2222C1Z9", "Dr. A. Velumani", "support@thyrocare.com", "+91-9820003344", "Mumbai", "Maharashtra", "ACTIVE", 4.7),
            ("pharm-medplus", "MedPlus Health Services Pharmacy", "PHARMACY", "REG-PHARM-TS-9988", "36AAAAA3333D1Z1", "Madhukar Gangadi", "rx@medplusindia.com", "+91-9885005566", "Hyderabad", "Telangana", "ACTIVE", 4.6),
            ("clinic-carepoint", "CarePoint Family Clinic & Daycare", "CLINIC", "REG-CLN-KA-4412", "29AAAAA4444E1Z3", "Dr. Priya Ramesh", "care@carepointclinic.in", "+91-9980112233", "Bangalore", "Karnataka", "ACTIVE", 4.9),
            ("spec-neuro-centre", "National Institute of Neuro Sciences", "SPECIALIST", "REG-SPEC-DL-7733", "07AAAAA5555F1Z4", "Dr. Manmohan Sharma", "referrals@neuroinstitute.org", "+91-9811009988", "New Delhi", "Delhi", "ACTIVE", 4.9),
            ("emerg-metro", "Metro City Trauma & Emergency Center", "EMERGENCY", "REG-EMERG-KA-1199", "29AAAAA6666G1Z7", "Dr. Vikram Seth", "emergency@metrotrauma.org", "+91-9900998877", "Bangalore", "Karnataka", "ACTIVE", 4.8)
        ]

        for p_id, org_name, p_type, reg_num, tax, contact, email, phone, city, state, stage, rating in seed_providers:
            cur.execute("""
                INSERT INTO oh_id.network_providers 
                    (id, organization_name, provider_type, registration_number, tax_id, primary_contact_name, primary_email, primary_phone, city, state, onboarding_stage, rating, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                ON CONFLICT (id) DO UPDATE SET
                    organization_name = EXCLUDED.organization_name,
                    provider_type = EXCLUDED.provider_type,
                    onboarding_stage = EXCLUDED.onboarding_stage,
                    rating = EXCLUDED.rating;
            """, (p_id, org_name, p_type, reg_num, tax, contact, email, phone, city, state, stage, rating))

        # Seed Facilities
        seed_facilities = [
            ("fac-kedar-main", "hosp-kedar", "Kedar Hospital - Indiranagar Main", "HOSPITAL", "100ft Road, Indiranagar", "Bangalore", "560038", 12.9716, 77.5946, True),
            ("fac-apollo-greams", "hosp-apollo", "Apollo Hospitals - Greams Lane", "HOSPITAL", "21 Greams Lane, Thousand Lights", "Chennai", "600006", 13.0569, 80.2525, True),
            ("fac-thyrocare-blr", "lab-thyrocare", "Thyrocare Central Processing Lab Bangalore", "LABORATORY", "Koramangala 5th Block", "Bangalore", "560095", 12.9352, 77.6245, False),
            ("fac-medplus-indiranagar", "pharm-medplus", "MedPlus Pharmacy 24/7 Store", "PHARMACY", "CMH Road, Indiranagar", "Bangalore", "560038", 12.9784, 77.6408, True),
            ("fac-carepoint-koramangala", "clinic-carepoint", "CarePoint Clinic Koramangala", "CLINIC", "80ft Road, Koramangala", "Bangalore", "560034", 12.9279, 77.6271, False),
            ("fac-neuro-delhi", "spec-neuro-centre", "Neuro Sciences Apex Hospital", "SPECIALIST", "Ring Road, South Ext.", "New Delhi", "110049", 28.5672, 77.2100, True),
            ("fac-metro-emerg", "emerg-metro", "Metro Trauma Care Unit", "EMERGENCY", "Outer Ring Road, Marathahalli", "Bangalore", "560037", 12.9591, 77.6974, True)
        ]

        for f_id, p_id, f_name, f_type, addr, city, pin, lat, lon, emerg in seed_facilities:
            cur.execute("""
                INSERT INTO oh_id.network_facilities 
                    (id, provider_id, facility_name, facility_type, address_line, city, pincode, geo_latitude, geo_longitude, emergency_capable, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                ON CONFLICT (id) DO UPDATE SET
                    facility_name = EXCLUDED.facility_name,
                    emergency_capable = EXCLUDED.emergency_capable;
            """, (f_id, p_id, f_name, f_type, addr, city, pin, lat, lon, emerg))

        # Seed Marketplace Services
        seed_services = [
            ("srv-kedar-cardio", "hosp-kedar", "fac-kedar-main", "Comprehensive Cardiology Consultation", "Cardiology", "OPD_CONSULTATION", 800.00, True, 0, 4.9),
            ("srv-apollo-neuro", "hosp-apollo", "fac-apollo-greams", "Super Specialist Neurology Evaluation", "Neurology", "OPD_CONSULTATION", 1200.00, True, 1, 4.8),
            ("srv-thyrocare-lft", "lab-thyrocare", "fac-thyrocare-blr", "Complete Liver Function & Lipid Profile", "Diagnostic Pathology", "LAB_TEST", 499.00, True, 0, 4.7),
            ("srv-carepoint-general", "clinic-carepoint", "fac-carepoint-koramangala", "General Family Physician OPD", "General Medicine", "OPD_CONSULTATION", 400.00, True, 0, 4.9),
            ("srv-neuro-mri", "spec-neuro-centre", "fac-neuro-delhi", "High-Resolution Brain 3T MRI Scan", "Radiology", "DIAGNOSTIC_SCAN", 4500.00, True, 0, 4.9),
            ("srv-medplus-dispense", "pharm-medplus", "fac-medplus-indiranagar", "Digital Prescription Fulfillment & Home Delivery", "Pharmacy", "PHARMACY", 0.00, True, 0, 4.6)
        ]

        for s_id, p_id, f_id, s_name, spec, cat, rate, bookable, wait_d, rat in seed_services:
            cur.execute("""
                INSERT INTO oh_id.network_service_offerings
                    (id, provider_id, facility_id, service_name, specialty, category, standard_rate, is_bookable_online, average_wait_days, rating, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                ON CONFLICT (id) DO UPDATE SET
                    service_name = EXCLUDED.service_name,
                    standard_rate = EXCLUDED.standard_rate;
            """, (s_id, p_id, f_id, s_name, spec, cat, rate, bookable, wait_d, rat))

        # Seed Cross-Provider Identities for Demo Patients
        cur.execute("""
            SELECT id, onehealth_id FROM oh_id.patients LIMIT 5;
        """)
        patients = cur.fetchall()
        for idx, (pat_id, hid) in enumerate(patients):
            # Map to Apollo and Thyrocare
            cur.execute("""
                INSERT INTO oh_id.cross_provider_identities
                    (id, master_patient_id, onehealth_id, provider_id, external_mrn, match_confidence, match_method, is_verified)
                VALUES 
                    (%s, %s, %s, %s, %s, 100.0, 'EXACT_OHID_QR', TRUE),
                    (%s, %s, %s, %s, %s, 98.5, 'MOBILE_DEMO_MATCH', TRUE)
                ON CONFLICT (provider_id, external_mrn) DO NOTHING;
            """, (
                f"cpi-apollo-{pat_id}", pat_id, hid, "hosp-apollo", f"APOLLO-MRN-{idx+1001}",
                f"cpi-thyro-{pat_id}", pat_id, hid, "lab-thyrocare", f"THYRO-REG-{idx+5001}"
            ))

        conn.commit()
        print("Phase 7 Healthcare Network & Ecosystem Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"Error during Phase 7 migration: {e}")
        raise e
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
