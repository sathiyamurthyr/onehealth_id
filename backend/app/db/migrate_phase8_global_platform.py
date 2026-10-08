import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import psycopg2
from psycopg2.extras import RealDictCursor
from backend.app.core.config import settings

def run_phase8_migration():
    print("[PHASE 8] Starting Global Healthcare Platform & Ecosystem Migration...")
    conn = psycopg2.connect(settings.DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cur.execute("SET search_path TO oh_id, public;")

        # ---------------------------------------------------------------------
        # 1. Country Configurations & Regional Residency Framework
        # ---------------------------------------------------------------------
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.country_configs (
                country_code VARCHAR(10) PRIMARY KEY, -- 'IND', 'ARE', 'GBR', 'SGP', 'USA'
                country_name VARCHAR(100) NOT NULL,
                currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
                currency_symbol VARCHAR(10) NOT NULL DEFAULT '₹',
                default_timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
                supported_languages JSONB NOT NULL DEFAULT '["en", "ta", "hi"]'::jsonb,
                date_format VARCHAR(30) NOT NULL DEFAULT 'DD/MM/YYYY',
                phone_prefix VARCHAR(10) NOT NULL DEFAULT '+91',
                national_health_id_name VARCHAR(100) NOT NULL DEFAULT 'ABHA / OH-ID',
                interop_standard VARCHAR(50) NOT NULL DEFAULT 'FHIR_R4_ABDM',
                data_residency_region VARCHAR(50) NOT NULL DEFAULT 'INDIA_CENTRAL',
                tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # ---------------------------------------------------------------------
        # 2. Global Sovereign Identity & Cross-Border Identifier Mappings
        # ---------------------------------------------------------------------
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.global_identities (
                id VARCHAR(64) PRIMARY KEY,
                master_patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                country_code VARCHAR(10) NOT NULL REFERENCES oh_id.country_configs(country_code),
                identifier_type VARCHAR(50) NOT NULL, -- 'PASSPORT', 'NATIONAL_ID', 'EMIRATES_ID', 'NHS_NUMBER', 'SINGPASS_NRIC', 'SSN'
                identifier_value VARCHAR(100) NOT NULL,
                issuing_authority VARCHAR(150),
                is_verified BOOLEAN NOT NULL DEFAULT TRUE,
                verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_country_identifier UNIQUE(country_code, identifier_type, identifier_value)
            );
        """)

        # ---------------------------------------------------------------------
        # 3. Developer Platform: OAuth2 Applications & API Keys
        # ---------------------------------------------------------------------
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.developer_apps (
                id VARCHAR(64) PRIMARY KEY,
                app_name VARCHAR(150) NOT NULL,
                organization_name VARCHAR(150) NOT NULL,
                developer_email VARCHAR(150) NOT NULL,
                client_id VARCHAR(64) UNIQUE NOT NULL,
                client_secret_hash VARCHAR(256) NOT NULL,
                app_category VARCHAR(50) NOT NULL DEFAULT 'HOSPITAL_INTEGRATION', -- 'HOSPITAL_INTEGRATION', 'TELEMEDICINE', 'WEARABLE_APP', 'INSURANCE_PAYER', 'AI_INTELLIGENCE'
                permission_scopes JSONB NOT NULL DEFAULT '["patient.read", "records.read"]'::jsonb,
                environment VARCHAR(20) NOT NULL DEFAULT 'SANDBOX', -- 'SANDBOX', 'PRODUCTION'
                status VARCHAR(30) NOT NULL DEFAULT 'APPROVED', -- 'PENDING_REVIEW', 'APPROVED', 'SUSPENDED', 'REVOKED'
                rate_limit_per_minute INT NOT NULL DEFAULT 120,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS oh_id.developer_api_keys (
                id VARCHAR(64) PRIMARY KEY,
                app_id VARCHAR(64) NOT NULL REFERENCES oh_id.developer_apps(id) ON DELETE CASCADE,
                key_prefix VARCHAR(16) NOT NULL, -- 'oh_live_...', 'oh_test_...'
                api_key_hash VARCHAR(256) NOT NULL,
                name VARCHAR(100) NOT NULL DEFAULT 'Default API Key',
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                last_used_at TIMESTAMP WITH TIME ZONE,
                expires_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # ---------------------------------------------------------------------
        # 4. Webhook Subscriptions & Event Hub
        # ---------------------------------------------------------------------
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.webhook_subscriptions (
                id VARCHAR(64) PRIMARY KEY,
                app_id VARCHAR(64) NOT NULL REFERENCES oh_id.developer_apps(id) ON DELETE CASCADE,
                target_url TEXT NOT NULL,
                subscribed_events JSONB NOT NULL DEFAULT '["encounter.created", "prescription.finalized", "lab_report.published", "referral.received"]'::jsonb,
                secret_signature_key VARCHAR(128) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                failure_count INT NOT NULL DEFAULT 0,
                last_triggered_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # ---------------------------------------------------------------------
        # 5. Global Telehealth & Virtual Consultations
        # ---------------------------------------------------------------------
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.telehealth_sessions (
                id VARCHAR(64) PRIMARY KEY,
                session_token VARCHAR(128) UNIQUE NOT NULL,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                doctor_id VARCHAR(64) NOT NULL REFERENCES oh_id.doctors(id) ON DELETE CASCADE,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
                actual_start TIMESTAMP WITH TIME ZONE,
                actual_end TIMESTAMP WITH TIME ZONE,
                duration_minutes INT,
                session_status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
                room_url TEXT,
                recording_consent_granted BOOLEAN NOT NULL DEFAULT FALSE,
                clinical_notes_draft TEXT,
                associated_prescription_id VARCHAR(64),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # ---------------------------------------------------------------------
        # 6. Wearables & Remote Patient Monitoring (RPM)
        # ---------------------------------------------------------------------
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.wearable_observations (
                id VARCHAR(64) PRIMARY KEY,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                device_type VARCHAR(50) NOT NULL, -- 'APPLE_WATCH', 'FITBIT', 'CONTINUOUS_GLUCOSE_MONITOR', 'OMRON_BP', 'PULSE_OXIMETER'
                device_model VARCHAR(100),
                metric_type VARCHAR(50) NOT NULL, -- 'HEART_RATE', 'SPO2', 'BLOOD_GLUCOSE', 'BLOOD_PRESSURE_SYS', 'BLOOD_PRESSURE_DIA', 'STEPS', 'SLEEP_MINUTES'
                value_numeric NUMERIC(10, 2) NOT NULL,
                unit VARCHAR(20) NOT NULL,
                is_abnormal BOOLEAN NOT NULL DEFAULT FALSE,
                recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
                synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                source_provenance VARCHAR(100) NOT NULL DEFAULT 'DEVICE_STREAM'
            );
        """)

        # ---------------------------------------------------------------------
        # 7. Global Insurance & Payer Clearinghouse
        # ---------------------------------------------------------------------
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.global_payer_claims (
                id VARCHAR(64) PRIMARY KEY,
                claim_number VARCHAR(64) UNIQUE NOT NULL,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                payer_code VARCHAR(50) NOT NULL, -- 'BUPA_GLOBAL', 'CIGNA_INTL', 'ALLIANZ_CARE', 'STAR_HEALTH_IND', 'DAMAN_UAE'
                payer_name VARCHAR(150) NOT NULL,
                currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
                billed_amount NUMERIC(12, 2) NOT NULL,
                approved_amount NUMERIC(12, 2),
                copay_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                claim_status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED', -- 'SUBMITTED', 'PREAUTH_APPROVED', 'ADJUDICATED', 'PAID', 'REJECTED'
                preauth_reference VARCHAR(64),
                adjudication_notes TEXT,
                submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                settled_at TIMESTAMP WITH TIME ZONE
            );
        """)

        # ---------------------------------------------------------------------
        # 8. Population Health & De-Identified Research Cohorts
        # ---------------------------------------------------------------------
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.research_cohorts (
                id VARCHAR(64) PRIMARY KEY,
                cohort_name VARCHAR(150) NOT NULL,
                principal_investigator VARCHAR(150) NOT NULL,
                institution_name VARCHAR(150) NOT NULL,
                irb_approval_number VARCHAR(100) NOT NULL,
                inclusion_criteria JSONB NOT NULL DEFAULT '{"disease": "Hypertension", "age_min": 18}'::jsonb,
                anonymization_method VARCHAR(50) NOT NULL DEFAULT 'K_ANONYMITY_AND_DIFFERENTIAL_PRIVACY',
                patient_count INT NOT NULL DEFAULT 0,
                export_status VARCHAR(30) NOT NULL DEFAULT 'APPROVED', -- 'PENDING_IRB', 'APPROVED', 'EXTRACTED', 'REVOKED'
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # ---------------------------------------------------------------------
        # 9. Localization Dictionaries & Multi-Lingual Resources
        # ---------------------------------------------------------------------
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.localization_dictionaries (
                language_code VARCHAR(10) NOT NULL, -- 'en', 'ta', 'hi', 'ar', 'es'
                resource_key VARCHAR(100) NOT NULL,
                resource_value TEXT NOT NULL,
                category VARCHAR(50) NOT NULL DEFAULT 'COMMON', -- 'COMMON', 'CLINICAL', 'CONSENT', 'BILLING', 'EMERGENCY'
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (language_code, resource_key)
            );
        """)

        # ---------------------------------------------------------------------
        # 10. Analytical Views
        # ---------------------------------------------------------------------
        cur.execute("""
            CREATE OR REPLACE VIEW oh_id.vw_global_platform_telemetry AS
            SELECT 
                (SELECT COUNT(*) FROM oh_id.country_configs WHERE is_active = TRUE) AS active_countries_count,
                (SELECT COUNT(*) FROM oh_id.developer_apps WHERE status = 'APPROVED') AS active_developer_apps_count,
                (SELECT COUNT(*) FROM oh_id.telehealth_sessions) AS total_telehealth_sessions_count,
                (SELECT COUNT(*) FROM oh_id.wearable_observations) AS total_wearable_records_count,
                (SELECT COUNT(*) FROM oh_id.global_payer_claims) AS total_claims_count,
                (SELECT COALESCE(SUM(billed_amount), 0) FROM oh_id.global_payer_claims) AS total_claims_volume_inr;

            CREATE OR REPLACE VIEW oh_id.vw_wearable_patient_stream AS
            SELECT w.*, p.name AS patient_name, p.onehealth_id
            FROM oh_id.wearable_observations w
            JOIN oh_id.patients p ON w.patient_id = p.id
            ORDER BY w.recorded_at DESC;

            CREATE OR REPLACE VIEW oh_id.vw_telehealth_schedule AS
            SELECT t.*, p.name AS patient_name, p.onehealth_id, d.name AS doctor_name, d.specialty, h.name AS hospital_name
            FROM oh_id.telehealth_sessions t
            JOIN oh_id.patients p ON t.patient_id = p.id
            JOIN oh_id.doctors d ON t.doctor_id = d.id
            JOIN oh_id.hospitals h ON t.hospital_id = h.id
            ORDER BY t.scheduled_start ASC;
        """)

        # ---------------------------------------------------------------------
        # 11. Seed Baseline Multi-Country Framework & Developer Profiles
        # ---------------------------------------------------------------------
        cur.execute("""
            INSERT INTO oh_id.country_configs (
                country_code, country_name, currency_code, currency_symbol, default_timezone,
                supported_languages, date_format, phone_prefix, national_health_id_name, interop_standard, data_residency_region, tax_rate
            ) VALUES
            ('IND', 'India', 'INR', '₹', 'Asia/Kolkata', '["en", "ta", "hi", "te", "ml"]'::jsonb, 'DD/MM/YYYY', '+91', 'ABHA / OH-ID', 'FHIR_R4_ABDM', 'INDIA_CENTRAL', 18.00),
            ('ARE', 'United Arab Emirates', 'AED', 'د.إ', 'Asia/Dubai', '["en", "ar"]'::jsonb, 'DD/MM/YYYY', '+971', 'Emirates ID / NABIDH', 'FHIR_R4_NABIDH', 'ME_DUBAI', 5.00),
            ('GBR', 'United Kingdom', 'GBP', '£', 'Europe/London', '["en"]'::jsonb, 'DD/MM/YYYY', '+44', 'NHS Number', 'FHIR_R4_NHS', 'EU_LONDON', 20.00),
            ('SGP', 'Singapore', 'SGD', '$', 'Asia/Singapore', '["en", "zh", "ms", "ta"]'::jsonb, 'DD/MM/YYYY', '+65', 'SingPass / NEHR', 'FHIR_R4_NEHR', 'AP_SINGAPORE', 9.00),
            ('USA', 'United States', 'USD', '$', 'America/New_York', '["en", "es"]'::jsonb, 'MM/DD/YYYY', '+1', 'USCDI / Health ID', 'FHIR_R4_US_CORE', 'US_EAST', 0.00)
            ON CONFLICT (country_code) DO UPDATE SET
                currency_code = EXCLUDED.currency_code,
                currency_symbol = EXCLUDED.currency_symbol,
                supported_languages = EXCLUDED.supported_languages;

            INSERT INTO oh_id.developer_apps (
                id, app_name, organization_name, developer_email, client_id, client_secret_hash,
                app_category, permission_scopes, environment, status, rate_limit_per_minute
            ) VALUES
            ('app-telemed-pro', 'TeleMed Global Bridge', 'HealthConnect Inc', 'dev@healthconnect.io', 'client_tm_9921', 'hash_sec_9921_abc', 'TELEMEDICINE', '["patient.read", "telehealth.manage", "prescriptions.write"]'::jsonb, 'PRODUCTION', 'APPROVED', 300),
            ('app-smart-rpm', 'VitalPulse Wearable Hub', 'PulseBio Tech', 'api@pulsebio.com', 'client_rpm_4412', 'hash_sec_4412_xyz', 'WEARABLE_APP', '["patient.read", "vitals.write", "alerts.publish"]'::jsonb, 'PRODUCTION', 'APPROVED', 600)
            ON CONFLICT (id) DO NOTHING;

            INSERT INTO oh_id.developer_api_keys (
                id, app_id, key_prefix, api_key_hash, name, is_active
            ) VALUES
            ('key-tm-live-01', 'app-telemed-pro', 'oh_live_tm9921', 'sha256_hash_mock_key_01', 'Primary Live Production Key', TRUE),
            ('key-rpm-live-01', 'app-smart-rpm', 'oh_live_rpm4412', 'sha256_hash_mock_key_02', 'High-Throughput Wearables Key', TRUE)
            ON CONFLICT (id) DO NOTHING;

            INSERT INTO oh_id.localization_dictionaries (language_code, resource_key, resource_value, category) VALUES
            ('en', 'header.network_title', 'OneHealth ID Global Healthcare Platform', 'COMMON'),
            ('ta', 'header.network_title', 'ஒன்ஹெல்த் ஐடி சர்வதேச மருத்துவ கட்டமைப்பு', 'COMMON'),
            ('hi', 'header.network_title', 'वनहेल्थ आईडी ग्लोबल हेल्थकेयर प्लेटफॉर्म', 'COMMON'),
            ('ar', 'header.network_title', 'منصة ون هيلث العالمية للرعاية الصحية', 'COMMON'),
            ('en', 'consent.grant_title', 'Grant Scoped Healthcare Consent', 'CONSENT'),
            ('ta', 'consent.grant_title', 'மருத்துவ ஒப்புதலை வழங்குங்கள்', 'CONSENT'),
            ('hi', 'consent.grant_title', 'स्वास्थ्य सहमति प्रदान करें', 'CONSENT'),
            ('ar', 'consent.grant_title', 'منح الموافقة الطبية', 'CONSENT')
            ON CONFLICT (language_code, resource_key) DO UPDATE SET
                resource_value = EXCLUDED.resource_value;
        """)

        conn.commit()
        print("[PHASE 8] Global Healthcare Platform & Ecosystem Migration successfully executed!")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Phase 8 migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_phase8_migration()
