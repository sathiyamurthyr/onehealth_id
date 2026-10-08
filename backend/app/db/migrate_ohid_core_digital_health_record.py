"""
ONEHEALTH ID (OH-ID) — Core Identity & Digital Health Record Database Migration
By Sathus Technology Pvt Ltd.

Creates and ensures:
1. oh_id.patient_facility_relationships (linking Person/OH-ID with individual hospitals & local UHIDs)
2. oh_id.patient_merges (audit trail for duplicate identity merging)
3. Enhanced patient_consents (cross-provider access authorization & revocation)
4. Immutability & versioning columns on consultations, prescriptions, and lab orders
5. oh_id.vw_health_timeline_events (unified multi-event chronological timeline)
6. oh_id.vw_patient_facility_memberships
7. Default facility relationships for existing patient records
"""

import sys
import os
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from backend.app.database.session import get_db_cursor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ohid.db.migrate_ohid_core_digital_health_record")

def run_migration():
    logger.info("Executing OH-ID Core Identity & Digital Health Record foundation migration...")

    with get_db_cursor() as cur:
        # Schema ensure
        cur.execute("CREATE SCHEMA IF NOT EXISTS oh_id;")

        # 1. Table: patient_facility_relationships
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.patient_facility_relationships (
                id VARCHAR(64) PRIMARY KEY,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                facility_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                local_uhid VARCHAR(64),
                first_registration_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                last_visit_date TIMESTAMPTZ,
                status VARCHAR(32) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, BLOCKED
                registered_by VARCHAR(64),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_patient_facility UNIQUE (patient_id, facility_id)
            );
            CREATE INDEX IF NOT EXISTS idx_pfr_patient_id ON oh_id.patient_facility_relationships(patient_id);
            CREATE INDEX IF NOT EXISTS idx_pfr_facility_id ON oh_id.patient_facility_relationships(facility_id);
            CREATE INDEX IF NOT EXISTS idx_pfr_local_uhid ON oh_id.patient_facility_relationships(local_uhid);
        """)

        # 2. Table: patient_merges
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.patient_merges (
                id VARCHAR(64) PRIMARY KEY,
                source_patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id),
                target_patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id),
                merged_by_user_id VARCHAR(64),
                merge_reason TEXT NOT NULL,
                demographic_snapshot JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_patient_merges_source ON oh_id.patient_merges(source_patient_id);
            CREATE INDEX IF NOT EXISTS idx_patient_merges_target ON oh_id.patient_merges(target_patient_id);
        """)

        # 3. Enhanced Table: patient_consents (ensure all required fields exist)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.patient_consents (
                id VARCHAR(64) PRIMARY KEY,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                requesting_hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
                requesting_doctor_id VARCHAR(64),
                requesting_doctor_name VARCHAR(150),
                purpose VARCHAR(128) NOT NULL DEFAULT 'CLINICAL_CONSULTATION',
                scope VARCHAR(64) NOT NULL DEFAULT 'ALL_RECORDS', -- ALL_RECORDS, PRESCRIPTIONS_ONLY, LAB_ONLY, CONSULTATION_ONLY
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- REQUESTED, ACTIVE, EXPIRED, REVOKED, DENIED
                valid_from TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                valid_until TIMESTAMPTZ,
                granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                revoked_at TIMESTAMPTZ,
                revoked_reason TEXT,
                digital_signature TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_patient_consents_pid ON oh_id.patient_consents(patient_id);
            CREATE INDEX IF NOT EXISTS idx_patient_consents_status ON oh_id.patient_consents(status);
        """)

        # 4. Enhance OPD Consultations with status, versioning & immutability columns
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='opd_consultations' AND column_name='status') THEN
                    ALTER TABLE oh_id.opd_consultations ADD COLUMN status VARCHAR(32) DEFAULT 'FINALIZED';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='opd_consultations' AND column_name='version') THEN
                    ALTER TABLE oh_id.opd_consultations ADD COLUMN version INT DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='opd_consultations' AND column_name='finalized_at') THEN
                    ALTER TABLE oh_id.opd_consultations ADD COLUMN finalized_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='opd_consultations' AND column_name='finalized_by') THEN
                    ALTER TABLE oh_id.opd_consultations ADD COLUMN finalized_by VARCHAR(64);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='opd_consultations' AND column_name='amended_from_id') THEN
                    ALTER TABLE oh_id.opd_consultations ADD COLUMN amended_from_id VARCHAR(64);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='opd_consultations' AND column_name='amendment_reason') THEN
                    ALTER TABLE oh_id.opd_consultations ADD COLUMN amendment_reason TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='opd_consultations' AND column_name='digital_signature') THEN
                    ALTER TABLE oh_id.opd_consultations ADD COLUMN digital_signature VARCHAR(255);
                END IF;
            END $$;
        """)

        # 5. Enhance Prescriptions with versioning & superseding columns
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='prescriptions' AND column_name='version') THEN
                    ALTER TABLE oh_id.prescriptions ADD COLUMN version INT DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='prescriptions' AND column_name='finalized_at') THEN
                    ALTER TABLE oh_id.prescriptions ADD COLUMN finalized_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='prescriptions' AND column_name='superseded_by_id') THEN
                    ALTER TABLE oh_id.prescriptions ADD COLUMN superseded_by_id VARCHAR(64);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='prescriptions' AND column_name='superseded_at') THEN
                    ALTER TABLE oh_id.prescriptions ADD COLUMN superseded_at TIMESTAMPTZ;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='prescriptions' AND column_name='superseded_reason') THEN
                    ALTER TABLE oh_id.prescriptions ADD COLUMN superseded_reason TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='prescriptions' AND column_name='digital_signature') THEN
                    ALTER TABLE oh_id.prescriptions ADD COLUMN digital_signature VARCHAR(255);
                END IF;
            END $$;
        """)

        # 6. Enhance Lab Orders with report_status, correction & versioning
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='lab_orders' AND column_name='version') THEN
                    ALTER TABLE oh_id.lab_orders ADD COLUMN version INT DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='lab_orders' AND column_name='report_status') THEN
                    ALTER TABLE oh_id.lab_orders ADD COLUMN report_status VARCHAR(32) DEFAULT 'FINAL';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='lab_orders' AND column_name='corrected_from_id') THEN
                    ALTER TABLE oh_id.lab_orders ADD COLUMN corrected_from_id VARCHAR(64);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='oh_id' AND table_name='lab_orders' AND column_name='correction_reason') THEN
                    ALTER TABLE oh_id.lab_orders ADD COLUMN correction_reason TEXT;
                END IF;
            END $$;
        """)

        # 7. Create View: vw_patient_facility_memberships
        cur.execute("""
            CREATE OR REPLACE VIEW oh_id.vw_patient_facility_memberships AS
            SELECT 
                pfr.id AS membership_id,
                pfr.patient_id,
                p.onehealth_id,
                p.name AS patient_name,
                pfr.facility_id AS hospital_id,
                h.name AS hospital_name,
                h.code AS hospital_code,
                h.city AS hospital_city,
                h.phone AS hospital_phone,
                pfr.local_uhid,
                pfr.first_registration_date,
                pfr.last_visit_date,
                pfr.status,
                pfr.created_at
            FROM oh_id.patient_facility_relationships pfr
            JOIN oh_id.patients p ON pfr.patient_id = p.id
            JOIN oh_id.hospitals h ON pfr.facility_id = h.id;
        """)

        # 8. Seed default facility relationships for all existing patients
        cur.execute("""
            INSERT INTO oh_id.patient_facility_relationships (
                id, patient_id, facility_id, local_uhid, first_registration_date, status
            )
            SELECT 
                'pfr-' || p.id || '-' || COALESCE(p.hospital_id, 'hosp-kedar'),
                p.id,
                COALESCE(p.hospital_id, 'hosp-kedar'),
                'UHID-' || UPPER(SUBSTRING(COALESCE(h.code, 'KEDAR'), 1, 4)) || '-' || UPPER(SUBSTRING(p.id, 1, 8)),
                COALESCE(p.created_at, CURRENT_TIMESTAMP),
                'ACTIVE'
            FROM oh_id.patients p
            LEFT JOIN oh_id.hospitals h ON p.hospital_id = h.id
            ON CONFLICT (patient_id, facility_id) DO NOTHING;
        """)

        # Seed staff memberships for multi-hospital doctor practice
        cur.execute("""
            INSERT INTO oh_id.hospital_staff_memberships (
                id, hospital_id, user_id, role_code, is_primary, is_active, created_at
            )
            VALUES 
                ('mem-kumar-kedar-main', 'hosp-kedar', 'usr-kedar-doc-kumar', 'DOCTOR', TRUE, TRUE, CURRENT_TIMESTAMP),
                ('mem-kumar-kedar-iyp', 'hosp-kedar-iyp', 'usr-kedar-doc-kumar', 'DOCTOR', FALSE, TRUE, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO NOTHING;
        """)

        # 9. Create Unified View: vw_health_timeline_events
        cur.execute("""
            CREATE OR REPLACE VIEW oh_id.vw_health_timeline_events AS
            -- 1. Consultations
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
                jsonb_build_object(
                    'consultation_id', c.id,
                    'diagnosis', c.diagnosis,
                    'status', COALESCE(c.status, 'FINALIZED'),
                    'vitals', c.vitals,
                    'version', COALESCE(c.version, 1),
                    'digital_signature', c.digital_signature
                ) AS metadata,
                c.id AS reference_id
            FROM oh_id.opd_consultations c
            LEFT JOIN oh_id.doctors d ON c.doctor_id = d.id
            LEFT JOIN oh_id.hospitals h ON d.hospital_id = h.id

            UNION ALL

            -- 2. Prescriptions
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
                jsonb_build_object(
                    'prescription_id', pr.id,
                    'status', COALESCE(pr.status, 'ACTIVE'),
                    'version', COALESCE(pr.version, 1),
                    'instructions', pr.instructions
                ) AS metadata,
                pr.id AS reference_id
            FROM oh_id.prescriptions pr
            LEFT JOIN oh_id.doctors d ON pr.doctor_id = d.id
            LEFT JOIN oh_id.hospitals h ON d.hospital_id = h.id

            UNION ALL

            -- 3. Lab Orders / Investigations
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
                jsonb_build_object(
                    'order_id', lo.id,
                    'test_id', lo.test_id,
                    'test_name', tc.name,
                    'status', lo.status,
                    'priority', lo.priority,
                    'is_abnormal', lo.is_abnormal,
                    'result_value', lo.result_value,
                    'result_unit', lo.result_unit
                ) AS metadata,
                lo.id AS reference_id
            FROM oh_id.lab_orders lo
            LEFT JOIN oh_id.lab_test_catalog tc ON lo.test_id = tc.id
            LEFT JOIN oh_id.doctors d ON lo.doctor_id = d.id
            LEFT JOIN oh_id.hospitals h ON lo.hospital_id = h.id

            UNION ALL

            -- 4. Medical Documents
            SELECT 
                'event-doc-' || md.id AS event_id,
                md.patient_id,
                'DOCUMENT' AS event_type,
                md.title AS title,
                COALESCE(md.notes, md.metadata->>'clinical_note', 'Medical document record in vault') AS summary,
                md.created_at AS event_timestamp,
                md.hospital_id,
                COALESCE(h.name, md.source_label, 'Healthcare Facility') AS hospital_name,
                md.doctor_id,
                COALESCE(d.name, (md.metadata->>'doctor_name'), 'Consulting Physician') AS provider_name,
                d.specialty AS provider_specialty,
                jsonb_build_object(
                    'document_id', md.id,
                    'category', md.category,
                    'source_type', md.source_type,
                    'file_type', md.file_type
                ) AS metadata,
                md.id AS reference_id
            FROM oh_id.medical_documents md
            LEFT JOIN oh_id.hospitals h ON md.hospital_id = h.id
            LEFT JOIN oh_id.doctors d ON md.doctor_id = d.id

            UNION ALL

            -- 5. Doctor Referrals
            SELECT 
                'event-ref-' || r.id AS event_id,
                r.patient_id,
                'REFERRAL' AS event_type,
                'Specialist Referral: ' || r.specialty AS title,
                r.reason AS summary,
                r.created_at AS event_timestamp,
                rd.hospital_id,
                h.name AS hospital_name,
                r.referring_doctor_id AS doctor_id,
                rd.name AS provider_name,
                rd.specialty AS provider_specialty,
                jsonb_build_object(
                    'referral_id', r.id,
                    'specialty', r.specialty,
                    'receiving_doctor', r.receiving_doctor_name,
                    'priority', r.priority,
                    'status', r.status
                ) AS metadata,
                r.id AS reference_id
            FROM oh_id.referrals r
            LEFT JOIN oh_id.doctors rd ON r.referring_doctor_id = rd.id
            LEFT JOIN oh_id.hospitals h ON rd.hospital_id = h.id

            UNION ALL

            -- 6. Appointments & Facility Visits
            SELECT 
                'event-appt-' || a.id AS event_id,
                a.patient_id,
                CASE 
                    WHEN a.status = 'completed' THEN 'VISIT'
                    ELSE 'APPOINTMENT'
                END AS event_type,
                'Appointment: ' || COALESCE(d.name, 'Doctor Encounter') AS title,
                'Status: ' || UPPER(a.status) || ' (Slot: ' || a.slot || ')' AS summary,
                a.created_at AS event_timestamp,
                a.hospital_id,
                h.name AS hospital_name,
                a.doctor_id,
                d.name AS provider_name,
                d.specialty AS provider_specialty,
                jsonb_build_object(
                    'appointment_id', a.id,
                    'slot', a.slot,
                    'status', a.status,
                    'priority', a.priority,
                    'token_number', a.token_number
                ) AS metadata,
                a.id AS reference_id
            FROM oh_id.appointments a
            LEFT JOIN oh_id.doctors d ON a.doctor_id = d.id
            LEFT JOIN oh_id.hospitals h ON a.hospital_id = h.id;
        """)

        logger.info("OH-ID Core Identity & Digital Health Record foundation migration completed successfully.")

if __name__ == "__main__":
    run_migration()
