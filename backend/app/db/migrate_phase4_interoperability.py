"""
OH-ID Database Migration — Phase 4: Interoperability, ABDM, FHIR & Connected Health Network
========================================================================================
Implements the multi-provider health network foundation:
1. Integration Registry (oh_id.integrations) & Encrypted Credential References
2. External Identity Mapping (oh_id.external_patient_mappings) & Conflict Management (oh_id.identity_conflicts)
3. External Health Records with Data Provenance (oh_id.external_health_records)
4. Integration Event Bus, Webhook Ingestion & Dead-Letter Queue (oh_id.integration_events, oh_id.integration_event_attempts)
5. Cross-Hospital Data Sharing & Emergency Break-Glass Access (oh_id.data_exchange_shares)
6. Expanded Multi-Hospital Health Timeline View with Provenance Badges (oh_id.vw_health_timeline_events)
7. Live Integration Monitoring View (oh_id.vw_integration_health_summary)
"""

import sys
import logging
from pathlib import Path

_root_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from backend.app.database.session import get_db_cursor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ohid.db.migrate_phase4_interop")

def run_migration():
    logger.info("Executing Phase 4 Interoperability & Connected Health Network migration...")
    with get_db_cursor() as cur:
        # =========================================================================
        # 1. INTEGRATION REGISTRY & CREDENTIAL STORAGE
        # =========================================================================
        logger.info("Creating oh_id.integrations table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.integrations (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                integration_type VARCHAR(64) NOT NULL, -- FHIR_API, REST_WEBHOOK, ABDM_M1_M2_M3, LIS_INTERFACE, RIS_PACS, HL7_V2
                provider_name VARCHAR(150) NOT NULL,
                endpoint_url TEXT NOT NULL,
                auth_type VARCHAR(32) NOT NULL DEFAULT 'BEARER_TOKEN', -- BEARER_TOKEN, OAUTH2_CLIENT_CREDENTIALS, HMAC_SIGNATURE, MTLS_CERTIFICATE, API_KEY
                status VARCHAR(32) NOT NULL DEFAULT 'CONFIGURED', -- CONFIGURED, ACTIVE, SUSPENDED, ERROR, DISCONNECTED
                environment VARCHAR(32) NOT NULL DEFAULT 'SANDBOX', -- SANDBOX, STAGING, PRODUCTION
                webhook_secret VARCHAR(255),
                capabilities JSONB NOT NULL DEFAULT '["PATIENT_DISCOVERY", "RECORD_EXCHANGE", "DIAGNOSTIC_IMPORT"]'::jsonb,
                config JSONB NOT NULL DEFAULT '{}'::jsonb,
                last_successful_sync TIMESTAMPTZ,
                last_failure_at TIMESTAMPTZ,
                last_error_message TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_integrations_hosp ON oh_id.integrations(hospital_id, status);
            CREATE INDEX IF NOT EXISTS idx_integrations_type ON oh_id.integrations(integration_type);
        """)

        logger.info("Creating oh_id.integration_credentials table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.integration_credentials (
                id VARCHAR(64) PRIMARY KEY,
                integration_id VARCHAR(64) UNIQUE NOT NULL REFERENCES oh_id.integrations(id) ON DELETE CASCADE,
                client_id VARCHAR(150),
                encrypted_client_secret TEXT,
                encrypted_api_key TEXT,
                encrypted_private_key TEXT,
                token_endpoint TEXT,
                token_expires_at TIMESTAMPTZ,
                key_rotation_date TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_integ_cred_integ ON oh_id.integration_credentials(integration_id);
        """)

        # =========================================================================
        # 2. EXTERNAL IDENTITY RESOLUTION & CONFLICT QUARANTINE
        # =========================================================================
        logger.info("Creating oh_id.external_patient_mappings table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.external_patient_mappings (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                integration_id VARCHAR(64) NOT NULL REFERENCES oh_id.integrations(id) ON DELETE CASCADE,
                external_system VARCHAR(100) NOT NULL, -- e.g. APOLLO_HMS, FORTIS_LIS, MEDANTA_RIS, ABDM_ABHA
                external_patient_id VARCHAR(128) NOT NULL,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                match_method VARCHAR(64) NOT NULL DEFAULT 'EXACT_OH_ID', -- EXACT_OH_ID, ABHA_VERIFIED, MRN_GOVERNANCE, DETERMINISTIC_DEMOGRAPHIC, MANUAL_ADMIN_VERIFIED
                confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PENDING_REVIEW, REVOKED, REPLACED
                verified_by VARCHAR(64),
                verified_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_ext_sys_patient UNIQUE (integration_id, external_system, external_patient_id)
            );
            CREATE INDEX IF NOT EXISTS idx_ext_pat_map_pat ON oh_id.external_patient_mappings(patient_id);
            CREATE INDEX IF NOT EXISTS idx_ext_pat_map_hosp ON oh_id.external_patient_mappings(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_ext_pat_map_ext_id ON oh_id.external_patient_mappings(external_patient_id);
        """)

        logger.info("Creating oh_id.identity_conflicts table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.identity_conflicts (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                integration_id VARCHAR(64) NOT NULL REFERENCES oh_id.integrations(id) ON DELETE CASCADE,
                external_patient_id VARCHAR(128) NOT NULL,
                existing_patient_id VARCHAR(64) REFERENCES oh_id.patients(id) ON DELETE SET NULL,
                conflict_type VARCHAR(64) NOT NULL, -- DEMOGRAPHIC_MISMATCH, DOB_DISCREPANCY, GENDER_MISMATCH, DUPLICATE_PHONE_DIFFERENT_NAME, UNRESOLVED_AMBIGUITY
                conflict_details JSONB NOT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'QUARANTINED', -- QUARANTINED, UNDER_REVIEW, RESOLVED_MERGED, RESOLVED_NEW_PATIENT, REJECTED
                resolution_notes TEXT,
                resolved_by VARCHAR(64),
                resolved_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_id_conflicts_hosp ON oh_id.identity_conflicts(hospital_id, status);
            CREATE INDEX IF NOT EXISTS idx_id_conflicts_pat ON oh_id.identity_conflicts(existing_patient_id);
        """)

        # =========================================================================
        # 3. EXTERNAL HEALTH RECORDS & DATA PROVENANCE
        # =========================================================================
        logger.info("Creating oh_id.external_health_records table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.external_health_records (
                id VARCHAR(64) PRIMARY KEY,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                integration_id VARCHAR(64) NOT NULL REFERENCES oh_id.integrations(id) ON DELETE CASCADE,
                source_facility_name VARCHAR(255) NOT NULL,
                source_provider_name VARCHAR(255),
                source_organization_id VARCHAR(64),
                external_record_id VARCHAR(128) NOT NULL,
                record_type VARCHAR(64) NOT NULL, -- CONSULTATION, PRESCRIPTION, LAB_REPORT, RADIOLOGY_REPORT, DISCHARGE_SUMMARY, CLINICAL_NOTE
                title VARCHAR(255) NOT NULL,
                summary TEXT,
                record_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                clinical_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
                fhir_resource JSONB,
                fhir_version VARCHAR(32) DEFAULT 'R4',
                mapping_version VARCHAR(32) DEFAULT 'v1.0.0',
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUPERSEDED, CANCELLED
                validation_status VARCHAR(32) NOT NULL DEFAULT 'VALID', -- VALID, WARNING, QUARANTINED, INVALID
                quarantine_reason TEXT,
                provenance_data JSONB NOT NULL DEFAULT '{}'::jsonb,
                imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_ext_health_record UNIQUE (integration_id, external_record_id)
            );
            CREATE INDEX IF NOT EXISTS idx_ext_records_pat ON oh_id.external_health_records(patient_id, record_date DESC);
            CREATE INDEX IF NOT EXISTS idx_ext_records_hosp ON oh_id.external_health_records(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_ext_records_type ON oh_id.external_health_records(record_type);
        """)

        # =========================================================================
        # 4. CROSS-HOSPITAL RECORD SHARING & EMERGENCY BREAK-GLASS ACCESS
        # =========================================================================
        logger.info("Creating oh_id.data_exchange_shares table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.data_exchange_shares (
                id VARCHAR(64) PRIMARY KEY,
                consent_id VARCHAR(64) REFERENCES oh_id.abdm_consent_artifacts(consent_id) ON DELETE SET NULL,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                requesting_hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                requesting_doctor_id VARCHAR(64) REFERENCES oh_id.doctors(id) ON DELETE SET NULL,
                requesting_doctor_name VARCHAR(255),
                source_hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE SET NULL,
                purpose VARCHAR(64) NOT NULL DEFAULT 'TREATMENT', -- TREATMENT, REFERRAL, SECOND_OPINION, EMERGENCY, PATIENT_REQUEST
                data_scope JSONB NOT NULL DEFAULT '["OPConsultation", "Prescription", "DiagnosticReport"]'::jsonb,
                access_basis VARCHAR(64) NOT NULL DEFAULT 'PATIENT_CONSENT', -- PATIENT_CONSENT, EMERGENCY_BREAK_GLASS, DIRECT_CARE_RELATIONSHIP
                break_glass_reason TEXT,
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, REVOKED, COMPLETED
                accessed_records_summary JSONB DEFAULT '{}'::jsonb,
                expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '72 hours'),
                revoked_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_data_shares_pat ON oh_id.data_exchange_shares(patient_id, status);
            CREATE INDEX IF NOT EXISTS idx_data_shares_req_hosp ON oh_id.data_exchange_shares(requesting_hospital_id);
            CREATE INDEX IF NOT EXISTS idx_data_shares_consent ON oh_id.data_exchange_shares(consent_id);
        """)

        # =========================================================================
        # 5. INTEGRATION EVENT BUS, WEBHOOKS & RETRY QUEUE
        # =========================================================================
        logger.info("Creating oh_id.integration_events and attempts tables...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.integration_events (
                id VARCHAR(64) PRIMARY KEY,
                integration_id VARCHAR(64) NOT NULL REFERENCES oh_id.integrations(id) ON DELETE CASCADE,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                direction VARCHAR(16) NOT NULL DEFAULT 'INBOUND', -- INBOUND, OUTBOUND
                event_type VARCHAR(100) NOT NULL, -- LAB_RESULT_RECEIVED, RADIOLOGY_STUDY_DISPATCHED, PATIENT_DISCOVERY_QUERY, FHIR_BUNDLE_SYNC, CONSENT_GRANTED_NOTIFY
                idempotency_key VARCHAR(128) NOT NULL UNIQUE,
                external_event_id VARCHAR(128),
                payload_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
                status VARCHAR(32) NOT NULL DEFAULT 'RECEIVED', -- RECEIVED, VALIDATING, PROCESSING, COMPLETED, FAILED, RETRY, DEAD_LETTER
                attempt_count INT NOT NULL DEFAULT 1,
                max_attempts INT NOT NULL DEFAULT 5,
                next_retry_at TIMESTAMPTZ,
                error_code VARCHAR(64),
                error_message TEXT,
                processed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_integ_events_integ ON oh_id.integration_events(integration_id, status);
            CREATE INDEX IF NOT EXISTS idx_integ_events_hosp ON oh_id.integration_events(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_integ_events_status ON oh_id.integration_events(status, next_retry_at);

            CREATE TABLE IF NOT EXISTS oh_id.integration_event_attempts (
                id VARCHAR(64) PRIMARY KEY,
                event_id VARCHAR(64) NOT NULL REFERENCES oh_id.integration_events(id) ON DELETE CASCADE,
                attempt_number INT NOT NULL,
                status VARCHAR(32) NOT NULL, -- SUCCESS, FAILED
                http_status INT,
                latency_ms INT,
                error_details TEXT,
                attempted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_integ_attempts_event ON oh_id.integration_event_attempts(event_id);
        """)

        # =========================================================================
        # 6. LIVE ANALYTICAL VIEW: INTEGRATION MONITORING & HEALTH
        # =========================================================================
        logger.info("Creating oh_id.vw_integration_health_summary view...")
        cur.execute("DROP VIEW IF EXISTS oh_id.vw_integration_health_summary CASCADE;")
        cur.execute("""
            CREATE VIEW oh_id.vw_integration_health_summary AS
            SELECT 
                i.id AS integration_id,
                i.hospital_id,
                h.name AS hospital_name,
                i.integration_type,
                i.provider_name,
                i.endpoint_url,
                i.auth_type,
                i.status AS integration_status,
                i.environment,
                i.last_successful_sync,
                i.last_failure_at,
                i.last_error_message,
                i.created_at AS configured_at,
                COUNT(e.id) AS total_events_24h,
                COUNT(CASE WHEN e.status = 'COMPLETED' THEN 1 END) AS completed_events_24h,
                COUNT(CASE WHEN e.status = 'FAILED' THEN 1 END) AS failed_events_24h,
                COUNT(CASE WHEN e.status = 'RETRY' THEN 1 END) AS retrying_events_24h,
                COUNT(CASE WHEN e.status = 'DEAD_LETTER' THEN 1 END) AS dead_letter_events_24h,
                ROUND(
                    CASE 
                        WHEN COUNT(e.id) > 0 THEN 
                            (COUNT(CASE WHEN e.status = 'COMPLETED' THEN 1 END)::NUMERIC / COUNT(e.id)::NUMERIC) * 100.0
                        ELSE 100.00
                    END, 2
                ) AS success_rate_percentage
            FROM oh_id.integrations i
            JOIN oh_id.hospitals h ON i.hospital_id = h.id
            LEFT JOIN oh_id.integration_events e 
                ON i.id = e.integration_id 
                AND e.created_at >= (CURRENT_TIMESTAMP - INTERVAL '24 hours')
            GROUP BY 
                i.id, i.hospital_id, h.name, i.integration_type, i.provider_name,
                i.endpoint_url, i.auth_type, i.status, i.environment,
                i.last_successful_sync, i.last_failure_at, i.last_error_message, i.created_at;
        """)

        # =========================================================================
        # 7. MULTI-HOSPITAL EXPANDED HEALTH TIMELINE VIEW
        # =========================================================================
        logger.info("Upgrading oh_id.vw_health_timeline_events with External Records & Provenance...")
        cur.execute("DROP VIEW IF EXISTS oh_id.vw_health_timeline_events CASCADE;")
        cur.execute("""
            CREATE VIEW oh_id.vw_health_timeline_events AS
            -- 1. Consultations (Native)
            SELECT 
                'event-con-' || c.id AS event_id,
                c.patient_id,
                'CONSULTATION' AS event_type,
                'Doctor Consultation: ' || c.diagnosis AS title,
                COALESCE(c.clinical_notes, c.symptoms, 'Clinical evaluation completed') AS summary,
                c.created_at AS event_timestamp,
                d.hospital_id,
                h.name AS hospital_name,
                c.doctor_id,
                d.name AS provider_name,
                d.specialty AS provider_specialty,
                FALSE AS is_external,
                h.name AS provenance_source,
                c.id AS external_record_id,
                jsonb_build_object(
                    'consultation_id', c.id,
                    'diagnosis', c.diagnosis,
                    'status', COALESCE(c.status, 'FINALIZED'),
                    'vitals', c.vitals,
                    'version', COALESCE(c.version, 1),
                    'digital_signature', c.digital_signature,
                    'is_external', FALSE,
                    'source', 'OH-ID Native Hospital'
                ) AS metadata,
                c.id AS reference_id
            FROM oh_id.opd_consultations c
            LEFT JOIN oh_id.doctors d ON c.doctor_id = d.id
            LEFT JOIN oh_id.hospitals h ON d.hospital_id = h.id

            UNION ALL

            -- 2. Prescriptions (Native)
            SELECT 
                'event-rx-' || pr.id AS event_id,
                pr.patient_id,
                'PRESCRIPTION' AS event_type,
                'Prescription Generated (' || COALESCE(pr.status, 'ACTIVE') || ')' AS title,
                COALESCE(pr.instructions, 'Medications prescribed for treatment plan') AS summary,
                pr.created_at AS event_timestamp,
                d.hospital_id,
                h.name AS hospital_name,
                pr.doctor_id,
                d.name AS provider_name,
                d.specialty AS provider_specialty,
                FALSE AS is_external,
                h.name AS provenance_source,
                pr.id AS external_record_id,
                jsonb_build_object(
                    'prescription_id', pr.id,
                    'status', COALESCE(pr.status, 'ACTIVE'),
                    'version', COALESCE(pr.version, 1),
                    'instructions', pr.instructions,
                    'is_external', FALSE,
                    'source', 'OH-ID Native Hospital'
                ) AS metadata,
                pr.id AS reference_id
            FROM oh_id.prescriptions pr
            LEFT JOIN oh_id.doctors d ON pr.doctor_id = d.id
            LEFT JOIN oh_id.hospitals h ON d.hospital_id = h.id

            UNION ALL

            -- 3. Lab Orders / Investigations (Native)
            SELECT 
                'event-lab-' || lo.id AS event_id,
                lo.patient_id,
                CASE 
                    WHEN lo.status = 'COMPLETED' THEN 'LAB_REPORT'
                    ELSE 'INVESTIGATION'
                END AS event_type,
                COALESCE(tc.name, lo.test_id) || ' (' || lo.status || ')' AS title,
                CASE 
                    WHEN lo.result_value IS NOT NULL THEN 'Result: ' || lo.result_value || ' ' || COALESCE(lo.result_unit, '')
                    ELSE 'Ordered diagnostic test'
                END AS summary,
                COALESCE(lo.completed_at, lo.ordered_at) AS event_timestamp,
                lo.hospital_id,
                h.name AS hospital_name,
                lo.doctor_id,
                d.name AS provider_name,
                d.specialty AS provider_specialty,
                FALSE AS is_external,
                h.name AS provenance_source,
                lo.id AS external_record_id,
                jsonb_build_object(
                    'order_id', lo.id,
                    'test_id', lo.test_id,
                    'test_name', tc.name,
                    'status', lo.status,
                    'priority', lo.priority,
                    'is_abnormal', lo.is_abnormal,
                    'result_value', lo.result_value,
                    'result_unit', lo.result_unit,
                    'is_external', FALSE,
                    'source', 'OH-ID Native Hospital'
                ) AS metadata,
                lo.id AS reference_id
            FROM oh_id.lab_orders lo
            LEFT JOIN oh_id.lab_test_catalog tc ON lo.test_id = tc.id
            LEFT JOIN oh_id.hospitals h ON lo.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON lo.doctor_id = d.id

            UNION ALL

            -- 4. Pharmacy Dispensations (Native Phase 3)
            SELECT
                'event-pharm-' || pd.id AS event_id,
                pd.patient_id,
                'PHARMACY_DISPENSED' AS event_type,
                'Medication Dispensed: ' || pd.medicine_name AS title,
                'Dispensed ' || pd.dispensed_quantity || ' units (Batch: ' || COALESCE(pd.batch_number, 'N/A') || ')' AS summary,
                pd.dispensed_at AS event_timestamp,
                pd.hospital_id,
                h.name AS hospital_name,
                pd.pharmacist_id AS doctor_id,
                COALESCE(u.full_name, 'Hospital Pharmacist') AS provider_name,
                'Pharmacy & Dispensary' AS provider_specialty,
                FALSE AS is_external,
                h.name AS provenance_source,
                pd.id AS external_record_id,
                jsonb_build_object(
                    'dispensation_id', pd.id,
                    'prescription_id', pd.prescription_id,
                    'medicine_name', pd.medicine_name,
                    'prescribed_quantity', pd.prescribed_quantity,
                    'dispensed_quantity', pd.dispensed_quantity,
                    'batch_number', pd.batch_number,
                    'expiry_date', pd.expiry_date,
                    'status', pd.status,
                    'is_external', FALSE,
                    'source', 'OH-ID Native Hospital'
                ) AS metadata,
                pd.id AS reference_id
            FROM oh_id.pharmacy_dispensations pd
            LEFT JOIN oh_id.hospitals h ON pd.hospital_id = h.id
            LEFT JOIN oh_id.users u ON pd.pharmacist_id = u.id

            UNION ALL

            -- 5. Radiology Reports (Native Phase 3)
            SELECT
                'event-rad-' || rr.id AS event_id,
                rr.patient_id,
                'IMAGING_REPORT' AS event_type,
                rr.modality || ' Imaging: ' || rr.study_description AS title,
                'Impression: ' || rr.impression AS summary,
                rr.finalized_at AS event_timestamp,
                rr.hospital_id,
                h.name AS hospital_name,
                rr.radiologist_id AS doctor_id,
                COALESCE(d.name, u.full_name, 'Dr. Radiologist') AS provider_name,
                'Radiology & Imaging' AS provider_specialty,
                FALSE AS is_external,
                h.name AS provenance_source,
                rr.id AS external_record_id,
                jsonb_build_object(
                    'report_id', rr.id,
                    'order_id', rr.order_id,
                    'modality', rr.modality,
                    'findings', rr.findings,
                    'impression', rr.impression,
                    'recommendations', rr.recommendations,
                    'image_study_uid', rr.image_study_uid,
                    'status', rr.status,
                    'is_external', FALSE,
                    'source', 'OH-ID Native Hospital'
                ) AS metadata,
                rr.id AS reference_id
            FROM oh_id.radiology_reports rr
            LEFT JOIN oh_id.hospitals h ON rr.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON rr.radiologist_id = d.id
            LEFT JOIN oh_id.users u ON rr.radiologist_id = u.id

            UNION ALL

            -- 6. Inpatient Admissions (Native Phase 3)
            SELECT
                'event-ipd-' || adm.id AS event_id,
                adm.patient_id,
                'ADMISSION' AS event_type,
                'Hospital Admission (' || COALESCE(adm.admission_type, 'INPATIENT') || '): ' || COALESCE(adm.specialty, 'General Inpatient') AS title,
                'Admitted for: ' || COALESCE(adm.reason_for_admission, 'Clinical management') AS summary,
                adm.admission_date AS event_timestamp,
                adm.hospital_id,
                h.name AS hospital_name,
                adm.admitting_doctor_id AS doctor_id,
                COALESCE(d.name, 'Dr. Admitting Physician') AS provider_name,
                COALESCE(adm.specialty, 'Inpatient Medicine') AS provider_specialty,
                FALSE AS is_external,
                h.name AS provenance_source,
                adm.id AS external_record_id,
                jsonb_build_object(
                    'admission_id', adm.id,
                    'bed_id', adm.bed_id,
                    'admission_type', adm.admission_type,
                    'status', adm.status,
                    'admission_date', adm.admission_date,
                    'is_external', FALSE,
                    'source', 'OH-ID Native Hospital'
                ) AS metadata,
                adm.id AS reference_id
            FROM oh_id.ipd_admissions adm
            LEFT JOIN oh_id.hospitals h ON adm.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON adm.admitting_doctor_id = d.id

            UNION ALL

            -- 7. Nursing Observations & Vitals (Native Phase 3)
            SELECT
                'event-nurs-' || no.id AS event_id,
                no.patient_id,
                'NURSING_OBSERVATION' AS event_type,
                'Nursing Observation (' || COALESCE(no.observation_type, 'VITALS') || ')' AS title,
                'Recorded clinical observation' AS summary,
                no.recorded_at AS event_timestamp,
                no.hospital_id,
                h.name AS hospital_name,
                no.nurse_id AS doctor_id,
                COALESCE(u.full_name, 'Staff Nurse') AS provider_name,
                'Nursing Department' AS provider_specialty,
                FALSE AS is_external,
                h.name AS provenance_source,
                no.id AS external_record_id,
                jsonb_build_object(
                    'observation_id', no.id,
                    'observation_type', no.observation_type,
                    'data', no.data,
                    'pain_score', no.pain_score,
                    'is_external', FALSE,
                    'source', 'OH-ID Native Hospital'
                ) AS metadata,
                no.id AS reference_id
            FROM oh_id.nursing_observations no
            LEFT JOIN oh_id.hospitals h ON no.hospital_id = h.id
            LEFT JOIN oh_id.users u ON no.nurse_id = u.id

            UNION ALL

            -- 8. Medication Administration (Native Phase 3)
            SELECT
                'event-mar-' || ma.id AS event_id,
                ma.patient_id,
                'MEDICATION_ADMINISTERED' AS event_type,
                'Medication Administered: ' || ma.medicine_name AS title,
                'Dose: ' || COALESCE(ma.administered_dose, ma.prescribed_dose, 'Prescribed') || ' via ' || COALESCE(ma.route, 'Oral') || ' (' || ma.status || ')' AS summary,
                ma.administered_time AS event_timestamp,
                ma.hospital_id,
                h.name AS hospital_name,
                ma.nurse_id AS doctor_id,
                COALESCE(u.full_name, 'Staff Nurse') AS provider_name,
                'Inpatient Care' AS provider_specialty,
                FALSE AS is_external,
                h.name AS provenance_source,
                ma.id AS external_record_id,
                jsonb_build_object(
                    'administration_id', ma.id,
                    'medicine_name', ma.medicine_name,
                    'administered_dose', ma.administered_dose,
                    'route', ma.route,
                    'status', ma.status,
                    'is_external', FALSE,
                    'source', 'OH-ID Native Hospital'
                ) AS metadata,
                ma.id AS reference_id
            FROM oh_id.medication_administrations ma
            LEFT JOIN oh_id.hospitals h ON ma.hospital_id = h.id
            LEFT JOIN oh_id.users u ON ma.nurse_id = u.id

            UNION ALL

            -- 9. Emergency Encounters (Native Phase 3)
            SELECT
                'event-em-' || ee.id AS event_id,
                COALESCE(ee.patient_id, 'emergency-unregistered') AS patient_id,
                'EMERGENCY_VISIT' AS event_type,
                'Emergency Visit: Triage ' || COALESCE(ee.emergency_category, 'Acuity') AS title,
                'Chief Complaint: ' || ee.presenting_complaint AS summary,
                ee.arrival_time AS event_timestamp,
                ee.hospital_id,
                h.name AS hospital_name,
                ee.attending_doctor_id AS doctor_id,
                COALESCE(d.name, u.full_name, 'Emergency Duty Physician') AS provider_name,
                'Emergency Medicine' AS provider_specialty,
                FALSE AS is_external,
                h.name AS provenance_source,
                ee.id AS external_record_id,
                jsonb_build_object(
                    'encounter_id', ee.id,
                    'emergency_category', ee.emergency_category,
                    'triage_score', ee.triage_score,
                    'arrival_mode', ee.arrival_mode,
                    'disposition', ee.disposition,
                    'status', ee.status,
                    'is_external', FALSE,
                    'source', 'OH-ID Native Hospital'
                ) AS metadata,
                ee.id AS reference_id
            FROM oh_id.emergency_encounters ee
            LEFT JOIN oh_id.hospitals h ON ee.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON ee.attending_doctor_id = d.id
            LEFT JOIN oh_id.users u ON ee.attending_doctor_id = u.id

            UNION ALL

            -- 10. Referrals (Native Phase 3)
            SELECT
                'event-ref-' || ref.id AS event_id,
                ref.patient_id,
                'REFERRAL' AS event_type,
                'Clinical Referral: ' || COALESCE(ref.specialty, ref.destination_specialty, 'Specialist Care') || ' (' || ref.status || ')' AS title,
                'Reason: ' || COALESCE(ref.reason, 'Clinical consultation') AS summary,
                ref.created_at AS event_timestamp,
                ref.hospital_id,
                h.name AS hospital_name,
                ref.referring_doctor_id AS doctor_id,
                COALESCE(d.name, 'Referring Clinician') AS provider_name,
                COALESCE(ref.specialty, 'Specialist Care') AS provider_specialty,
                FALSE AS is_external,
                h.name AS provenance_source,
                ref.id AS external_record_id,
                jsonb_build_object(
                    'referral_id', ref.id,
                    'referral_type', ref.referral_type,
                    'destination_facility_name', ref.destination_facility_name,
                    'destination_doctor_name', ref.destination_doctor_name,
                    'urgency', ref.urgency,
                    'status', ref.status,
                    'is_external', FALSE,
                    'source', 'OH-ID Native Hospital'
                ) AS metadata,
                ref.id AS reference_id
            FROM oh_id.referrals ref
            LEFT JOIN oh_id.hospitals h ON ref.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON ref.referring_doctor_id = d.id

            UNION ALL

            -- 11. Structured Discharges (Native Phase 3)
            SELECT
                'event-dis-' || dis.id AS event_id,
                dis.patient_id,
                'DISCHARGE' AS event_type,
                'Hospital Discharge (' || dis.discharge_type || '): ' || dis.condition_at_discharge AS title,
                'Primary Diagnosis: ' || dis.primary_diagnosis || ' | Course: ' || dis.hospital_course_summary AS summary,
                dis.finalized_at AS event_timestamp,
                dis.hospital_id,
                h.name AS hospital_name,
                dis.attending_doctor_id AS doctor_id,
                COALESCE(d.name, 'Attending Physician') AS provider_name,
                'Inpatient Care' AS provider_specialty,
                FALSE AS is_external,
                h.name AS provenance_source,
                dis.id AS external_record_id,
                jsonb_build_object(
                    'discharge_id', dis.id,
                    'admission_id', dis.admission_id,
                    'discharge_type', dis.discharge_type,
                    'condition_at_discharge', dis.condition_at_discharge,
                    'primary_diagnosis', dis.primary_diagnosis,
                    'status', dis.status,
                    'version', dis.version,
                    'is_external', FALSE,
                    'source', 'OH-ID Native Hospital'
                ) AS metadata,
                dis.id AS reference_id
            FROM oh_id.discharges dis
            LEFT JOIN oh_id.hospitals h ON dis.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON dis.attending_doctor_id = d.id

            UNION ALL

            -- 12. EXTERNAL HEALTH RECORDS (Connected Health Network / Multi-Hospital Phase 4)
            SELECT 
                'event-ext-' || ehr.id AS event_id,
                ehr.patient_id,
                'EXTERNAL_' || ehr.record_type AS event_type,
                ehr.title || ' [' || ehr.source_facility_name || ']' AS title,
                COALESCE(ehr.summary, 'Imported from external connected provider: ' || ehr.source_facility_name) AS summary,
                ehr.record_date AS event_timestamp,
                ehr.hospital_id,
                ehr.source_facility_name AS hospital_name,
                NULL AS doctor_id,
                COALESCE(ehr.source_provider_name, 'External Network Practitioner') AS provider_name,
                'Connected Health Network' AS provider_specialty,
                TRUE AS is_external,
                ehr.source_facility_name AS provenance_source,
                ehr.external_record_id AS external_record_id,
                jsonb_build_object(
                    'external_health_record_id', ehr.id,
                    'integration_id', ehr.integration_id,
                    'source_facility_name', ehr.source_facility_name,
                    'source_provider_name', ehr.source_provider_name,
                    'external_record_id', ehr.external_record_id,
                    'record_type', ehr.record_type,
                    'fhir_version', ehr.fhir_version,
                    'mapping_version', ehr.mapping_version,
                    'validation_status', ehr.validation_status,
                    'provenance', ehr.provenance_data,
                    'is_external', TRUE,
                    'source', 'External Connected Provider'
                ) AS metadata,
                ehr.id AS reference_id
            FROM oh_id.external_health_records ehr
            WHERE ehr.status = 'ACTIVE' AND ehr.validation_status = 'VALID';
        """)

        logger.info("✓ Phase 4 Interoperability & Connected Health Network migration completed successfully!")

if __name__ == "__main__":
    run_migration()
