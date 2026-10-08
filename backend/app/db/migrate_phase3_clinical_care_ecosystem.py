"""
OH-ID Database Migration — Phase 3: Clinical Care Ecosystem
Expands OH-ID from OPD/patient-flow into full clinical care:
- Pharmacy (Dispensations, batches, prescription tracking)
- Laboratory (Samples, accessions, structured analyte results, verification)
- Radiology (Modality orders, studies, radiologist impressions, PACS metadata)
- Nursing (Vitals matrix, structured notes, Medication Administration Record MAR)
- IPD & Beds (Admissions, wards, concurrency-safe bed allocation, bed transfer history)
- Emergency (Rapid intake, unidentified temporary identity, triage category, disposition)
- Referrals (Digital internal/external/specialty referrals)
- Discharge (Structured discharge summaries, clinical course, follow-up, versioning)
- Live Analytical Views (vw_pharmacy_dispensing_queue, vw_laboratory_orders_queue, vw_radiology_studies_queue, vw_inpatient_occupancy_dashboard, vw_emergency_triage_active)
"""

import sys
import logging
from pathlib import Path

_root_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from backend.app.database.session import get_db_cursor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ohid.db.migrate_phase3_clinical")

def run_migration():
    logger.info("Executing Phase 3 Clinical Care Ecosystem migration...")
    with get_db_cursor() as cur:
        # 1. Pharmacy Dispensations
        logger.info("Creating oh_id.pharmacy_dispensations table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.pharmacy_dispensations (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                prescription_id VARCHAR(64) NOT NULL,
                prescription_item_id VARCHAR(64),
                patient_id VARCHAR(64) NOT NULL,
                medicine_name VARCHAR(150) NOT NULL,
                prescribed_quantity INT NOT NULL DEFAULT 1,
                dispensed_quantity INT NOT NULL DEFAULT 1,
                dosage_instructions TEXT,
                batch_number VARCHAR(64) DEFAULT 'BATCH-001',
                expiry_date DATE DEFAULT (CURRENT_DATE + INTERVAL '365 days'),
                substitution_notes TEXT,
                pharmacist_id VARCHAR(64) NOT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'DISPENSED', -- RECEIVED, VERIFIED, PARTIALLY_DISPENSED, DISPENSED, CANCELLED
                dispensed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_pharm_disp_hosp ON oh_id.pharmacy_dispensations(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_pharm_disp_rx ON oh_id.pharmacy_dispensations(prescription_id);
            CREATE INDEX IF NOT EXISTS idx_pharm_disp_pat ON oh_id.pharmacy_dispensations(patient_id);
        """)

        # 2. Laboratory Samples
        logger.info("Creating oh_id.lab_samples table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.lab_samples (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                order_id VARCHAR(64) NOT NULL,
                patient_id VARCHAR(64) NOT NULL,
                sample_type VARCHAR(64) NOT NULL DEFAULT 'BLOOD', -- BLOOD, URINE, SERUM, SWAB, TISSUE, CSF, SPUTUM, OTHER
                accession_number VARCHAR(64) NOT NULL UNIQUE,
                collector_id VARCHAR(64),
                collection_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                received_time TIMESTAMPTZ,
                status VARCHAR(32) NOT NULL DEFAULT 'COLLECTED', -- ORDERED, REGISTERED, COLLECTED, RECEIVED, REJECTED, PROCESSING, COMPLETED
                rejection_reason TEXT,
                barcode VARCHAR(64),
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_lab_samples_hosp ON oh_id.lab_samples(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_lab_samples_order ON oh_id.lab_samples(order_id);
            CREATE INDEX IF NOT EXISTS idx_lab_samples_pat ON oh_id.lab_samples(patient_id);
        """)

        # 3. Structured Laboratory Results
        logger.info("Creating oh_id.lab_results table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.lab_results (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                order_id VARCHAR(64) NOT NULL,
                sample_id VARCHAR(64) REFERENCES oh_id.lab_samples(id) ON DELETE SET NULL,
                patient_id VARCHAR(64) NOT NULL,
                test_name VARCHAR(150) NOT NULL,
                analyte_name VARCHAR(150) NOT NULL,
                result_value TEXT NOT NULL,
                unit VARCHAR(32),
                reference_range VARCHAR(64),
                abnormal_flag BOOLEAN DEFAULT FALSE,
                critical_flag BOOLEAN DEFAULT FALSE,
                methodology VARCHAR(64) DEFAULT 'Automated Analyzer',
                technician_id VARCHAR(64),
                verifier_id VARCHAR(64),
                status VARCHAR(32) NOT NULL DEFAULT 'FINALIZED', -- DRAFT, VERIFIED, FINALIZED, CORRECTED
                version INT NOT NULL DEFAULT 1,
                verified_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_lab_results_hosp ON oh_id.lab_results(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_lab_results_order ON oh_id.lab_results(order_id);
            CREATE INDEX IF NOT EXISTS idx_lab_results_pat ON oh_id.lab_results(patient_id);
        """)

        # 4. Radiology Orders & Reports
        logger.info("Creating oh_id.radiology_orders and oh_id.radiology_reports tables...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.radiology_orders (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                patient_id VARCHAR(64) NOT NULL,
                visit_id VARCHAR(64),
                ordering_doctor_id VARCHAR(64) NOT NULL,
                modality VARCHAR(32) NOT NULL, -- XRAY, CT, MRI, ULTRASOUND, DEXA, MAMMOGRAPHY, OTHER
                body_part VARCHAR(100) NOT NULL,
                clinical_indication TEXT,
                priority VARCHAR(20) NOT NULL DEFAULT 'ROUTINE', -- ROUTINE, URGENT, STAT
                status VARCHAR(32) NOT NULL DEFAULT 'ORDERED', -- ORDERED, SCHEDULED, PERFORMED, REPORTING, FINALIZED, CANCELLED
                scheduled_time TIMESTAMPTZ,
                performed_time TIMESTAMPTZ,
                technician_id VARCHAR(64),
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_rad_orders_hosp ON oh_id.radiology_orders(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_rad_orders_pat ON oh_id.radiology_orders(patient_id);

            CREATE TABLE IF NOT EXISTS oh_id.radiology_reports (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                order_id VARCHAR(64) NOT NULL REFERENCES oh_id.radiology_orders(id) ON DELETE CASCADE,
                patient_id VARCHAR(64) NOT NULL,
                radiologist_id VARCHAR(64) NOT NULL,
                modality VARCHAR(32) NOT NULL,
                study_description VARCHAR(200) NOT NULL,
                findings TEXT NOT NULL,
                impression TEXT NOT NULL,
                recommendations TEXT,
                image_study_uid VARCHAR(128) DEFAULT '1.2.840.113619.2.55.3.283117',
                dicom_series_count INT DEFAULT 1,
                dicom_instances_count INT DEFAULT 12,
                status VARCHAR(32) NOT NULL DEFAULT 'FINALIZED', -- DRAFT, FINALIZED, AMENDED
                version INT NOT NULL DEFAULT 1,
                finalized_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_rad_reports_hosp ON oh_id.radiology_reports(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_rad_reports_order ON oh_id.radiology_reports(order_id);
            CREATE INDEX IF NOT EXISTS idx_rad_reports_pat ON oh_id.radiology_reports(patient_id);
        """)

        # 5. Nursing Observations, Notes, and Medication Administration Records (MAR)
        logger.info("Creating oh_id.nursing_observations, oh_id.nursing_notes, and oh_id.medication_administrations tables...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.nursing_observations (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                patient_id VARCHAR(64) NOT NULL,
                admission_id VARCHAR(64),
                encounter_id VARCHAR(64),
                nurse_id VARCHAR(64) NOT NULL,
                observation_type VARCHAR(32) NOT NULL DEFAULT 'VITALS', -- VITALS, PAIN, INTAKE_OUTPUT, GLUCOSE, GCS
                temperature NUMERIC(4, 1),
                heart_rate INT,
                blood_pressure VARCHAR(20),
                respiratory_rate INT,
                spo2 NUMERIC(4, 1),
                pain_score INT DEFAULT 0,
                data JSONB DEFAULT '{}'::jsonb,
                recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_nurse_obs_hosp ON oh_id.nursing_observations(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_nurse_obs_pat ON oh_id.nursing_observations(patient_id);
            CREATE INDEX IF NOT EXISTS idx_nurse_obs_adm ON oh_id.nursing_observations(admission_id);

            CREATE TABLE IF NOT EXISTS oh_id.nursing_notes (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                patient_id VARCHAR(64) NOT NULL,
                admission_id VARCHAR(64),
                nurse_id VARCHAR(64) NOT NULL,
                note_type VARCHAR(32) NOT NULL DEFAULT 'SHIFT_ASSESSMENT', -- SHIFT_ASSESSMENT, PROGRESS_NOTE, HANDOVER, DOCTOR_ROUND, INCIDENT
                assessment TEXT NOT NULL,
                care_provided TEXT,
                patient_response TEXT,
                concerns TEXT,
                handover_to_nurse_id VARCHAR(64),
                is_finalized BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_nurse_notes_hosp ON oh_id.nursing_notes(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_nurse_notes_pat ON oh_id.nursing_notes(patient_id);

            CREATE TABLE IF NOT EXISTS oh_id.medication_administrations (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                patient_id VARCHAR(64) NOT NULL,
                admission_id VARCHAR(64),
                prescription_id VARCHAR(64),
                prescription_item_id VARCHAR(64),
                nurse_id VARCHAR(64) NOT NULL,
                medicine_name VARCHAR(150) NOT NULL,
                prescribed_dose VARCHAR(64) NOT NULL,
                administered_dose VARCHAR(64) NOT NULL,
                route VARCHAR(32) NOT NULL DEFAULT 'ORAL', -- ORAL, IV, IM, SC, TOPICAL, INHALATION, OTHER
                scheduled_time TIMESTAMPTZ,
                administered_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(32) NOT NULL DEFAULT 'ADMINISTERED', -- SCHEDULED, ADMINISTERED, HELD, REFUSED, MISSED, CANCELLED
                reason_if_not_given TEXT,
                notes TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_med_admin_hosp ON oh_id.medication_administrations(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_med_admin_pat ON oh_id.medication_administrations(patient_id);
        """)

        # 6. Wards, Beds & Inpatient Allocations
        logger.info("Ensuring oh_id.wards, oh_id.beds, and oh_id.bed_allocations tables...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.wards (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                ward_type VARCHAR(50) DEFAULT 'GENERAL',
                floor_number VARCHAR(20) DEFAULT '2nd Floor'
            );
            ALTER TABLE oh_id.wards ADD COLUMN IF NOT EXISTS department_id VARCHAR(64);
            ALTER TABLE oh_id.wards ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 20;
            ALTER TABLE oh_id.wards ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
            ALTER TABLE oh_id.wards ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

            CREATE TABLE IF NOT EXISTS oh_id.beds (
                id VARCHAR(64) PRIMARY KEY,
                ward_id VARCHAR(64) REFERENCES oh_id.wards(id) ON DELETE CASCADE,
                bed_number VARCHAR(50) NOT NULL,
                daily_charge NUMERIC(10, 2) DEFAULT 1500.00,
                is_occupied BOOLEAN DEFAULT FALSE,
                current_patient_id VARCHAR(64)
            );
            ALTER TABLE oh_id.beds ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE;
            ALTER TABLE oh_id.beds ADD COLUMN IF NOT EXISTS bed_type VARCHAR(32) DEFAULT 'STANDARD';
            ALTER TABLE oh_id.beds ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'AVAILABLE';
            ALTER TABLE oh_id.beds ADD COLUMN IF NOT EXISTS current_admission_id VARCHAR(64);
            ALTER TABLE oh_id.beds ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

            -- Update hospital_id on beds from ward if null
            UPDATE oh_id.beds b
            SET hospital_id = w.hospital_id
            FROM oh_id.wards w
            WHERE b.ward_id = w.id AND b.hospital_id IS NULL;

            CREATE TABLE IF NOT EXISTS oh_id.bed_allocations (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                admission_id VARCHAR(64) NOT NULL,
                patient_id VARCHAR(64) NOT NULL,
                bed_id VARCHAR(64) NOT NULL REFERENCES oh_id.beds(id) ON DELETE CASCADE,
                from_bed_id VARCHAR(64) REFERENCES oh_id.beds(id),
                allocated_by VARCHAR(64) NOT NULL,
                allocated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                released_by VARCHAR(64),
                released_at TIMESTAMPTZ,
                transfer_reason TEXT,
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, TRANSFERRED, RELEASED
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_bed_alloc_hosp ON oh_id.bed_allocations(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_bed_alloc_adm ON oh_id.bed_allocations(admission_id);
            CREATE INDEX IF NOT EXISTS idx_bed_alloc_bed ON oh_id.bed_allocations(bed_id);
        """)

        # 7. Inpatient Admissions
        logger.info("Ensuring oh_id.ipd_admissions table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.ipd_admissions (
                id VARCHAR(64) PRIMARY KEY,
                patient_id VARCHAR(64) REFERENCES oh_id.patients(id),
                bed_id VARCHAR(64) REFERENCES oh_id.beds(id),
                admitting_doctor_id VARCHAR(64) REFERENCES oh_id.doctors(id),
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
                admission_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                discharge_date TIMESTAMPTZ,
                status VARCHAR(50) DEFAULT 'ADMITTED',
                reason_for_admission TEXT,
                discharge_summary TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE oh_id.ipd_admissions ADD COLUMN IF NOT EXISTS visit_id VARCHAR(64);
            ALTER TABLE oh_id.ipd_admissions ADD COLUMN IF NOT EXISTS referring_provider VARCHAR(150);
            ALTER TABLE oh_id.ipd_admissions ADD COLUMN IF NOT EXISTS department_id VARCHAR(64);
            ALTER TABLE oh_id.ipd_admissions ADD COLUMN IF NOT EXISTS specialty VARCHAR(100) DEFAULT 'General Medicine';
            ALTER TABLE oh_id.ipd_admissions ADD COLUMN IF NOT EXISTS admission_type VARCHAR(32) DEFAULT 'ELECTIVE';

            CREATE INDEX IF NOT EXISTS idx_ipd_adm_hosp ON oh_id.ipd_admissions(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_ipd_adm_pat ON oh_id.ipd_admissions(patient_id);
            CREATE INDEX IF NOT EXISTS idx_ipd_adm_status ON oh_id.ipd_admissions(status);
        """)

        # 8. Emergency Encounters & Triage
        logger.info("Creating oh_id.emergency_encounters table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.emergency_encounters (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                patient_id VARCHAR(64),
                is_anonymous_patient BOOLEAN DEFAULT FALSE,
                temporary_identity_code VARCHAR(64),
                arrival_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                arrival_mode VARCHAR(32) NOT NULL DEFAULT 'AMBULANCE', -- AMBULANCE, WALK_IN, POLICE, TRANSFER, OTHER
                emergency_category VARCHAR(32) NOT NULL DEFAULT 'YELLOW_URGENT', -- RED_RESUSCITATION, ORANGE_EMERGENT, YELLOW_URGENT, GREEN_LESS_URGENT, BLUE_NON_URGENT
                presenting_complaint TEXT NOT NULL,
                triage_score INT DEFAULT 3, -- 1 (Highest) to 5 (Lowest)
                triage_nurse_id VARCHAR(64),
                triage_notes TEXT,
                attending_doctor_id VARCHAR(64),
                disposition VARCHAR(32) DEFAULT 'OBSERVATION', -- ADMITTED, DISCHARGED, TRANSFERRED, EXPIRED, LAMA, OBSERVATION
                disposition_time TIMESTAMPTZ,
                status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS', -- TRIAGED, IN_PROGRESS, ADMITTED, DISCHARGED, TRANSFERRED
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_em_enc_hosp ON oh_id.emergency_encounters(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_em_enc_pat ON oh_id.emergency_encounters(patient_id);
            CREATE INDEX IF NOT EXISTS idx_em_enc_cat ON oh_id.emergency_encounters(emergency_category);
        """)

        # 9. Referrals (Upgrade existing table safely)
        logger.info("Ensuring oh_id.referrals table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.referrals (
                id VARCHAR(64) PRIMARY KEY,
                patient_id VARCHAR(64) NOT NULL,
                specialty VARCHAR(100) NOT NULL,
                reason TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'PENDING',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE oh_id.referrals ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE;
            ALTER TABLE oh_id.referrals ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(64);
            ALTER TABLE oh_id.referrals ADD COLUMN IF NOT EXISTS referral_type VARCHAR(32) DEFAULT 'SPECIALTY';
            ALTER TABLE oh_id.referrals ADD COLUMN IF NOT EXISTS source_facility_id VARCHAR(64);
            ALTER TABLE oh_id.referrals ADD COLUMN IF NOT EXISTS source_doctor_id VARCHAR(64);
            ALTER TABLE oh_id.referrals ADD COLUMN IF NOT EXISTS destination_facility_name VARCHAR(150);
            ALTER TABLE oh_id.referrals ADD COLUMN IF NOT EXISTS destination_doctor_name VARCHAR(150);
            ALTER TABLE oh_id.referrals ADD COLUMN IF NOT EXISTS destination_specialty VARCHAR(100);
            ALTER TABLE oh_id.referrals ADD COLUMN IF NOT EXISTS urgency VARCHAR(32) DEFAULT 'ROUTINE';
            ALTER TABLE oh_id.referrals ADD COLUMN IF NOT EXISTS clinical_summary TEXT;
            ALTER TABLE oh_id.referrals ADD COLUMN IF NOT EXISTS requested_action TEXT;

            -- Update hospital_id on referrals if null from patient
            UPDATE oh_id.referrals r
            SET hospital_id = p.hospital_id
            FROM oh_id.patients p
            WHERE r.patient_id = p.id AND r.hospital_id IS NULL;

            CREATE INDEX IF NOT EXISTS idx_referrals_hosp ON oh_id.referrals(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_referrals_pat ON oh_id.referrals(patient_id);
        """)

        # 10. Structured Discharges
        logger.info("Creating oh_id.discharges table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.discharges (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                admission_id VARCHAR(64) NOT NULL,
                patient_id VARCHAR(64) NOT NULL,
                attending_doctor_id VARCHAR(64) NOT NULL,
                discharge_type VARCHAR(32) NOT NULL DEFAULT 'ROUTINE', -- ROUTINE, TRANSFER, REFERRAL, LAMA, DEATH, OTHER
                primary_diagnosis VARCHAR(200) NOT NULL,
                secondary_diagnoses JSONB DEFAULT '[]'::jsonb,
                procedures_performed JSONB DEFAULT '[]'::jsonb,
                hospital_course_summary TEXT NOT NULL,
                investigations_summary TEXT,
                discharge_medications JSONB DEFAULT '[]'::jsonb,
                follow_up_instructions TEXT NOT NULL,
                condition_at_discharge VARCHAR(32) NOT NULL DEFAULT 'RECOVERED', -- RECOVERED, IMPROVED, STABLE, CRITICAL
                status VARCHAR(32) NOT NULL DEFAULT 'FINALIZED', -- DRAFT, REVIEW, FINALIZED
                version INT NOT NULL DEFAULT 1,
                finalized_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_discharges_hosp ON oh_id.discharges(hospital_id);
            CREATE INDEX IF NOT EXISTS idx_discharges_adm ON oh_id.discharges(admission_id);
            CREATE INDEX IF NOT EXISTS idx_discharges_pat ON oh_id.discharges(patient_id);
        """)

        # 11. Live Operational Views
        logger.info("Creating Phase 3 Live Analytical Views...")
        cur.execute("""
            -- Pharmacy Dispensing Queue View
            CREATE OR REPLACE VIEW oh_id.vw_pharmacy_dispensing_queue AS
            SELECT 
                p.id AS prescription_id,
                p.hospital_id,
                h.name AS hospital_name,
                p.patient_id,
                COALESCE(pat.name, 'Patient') AS patient_name,
                COALESCE(pat.onehealth_id, 'OH-0000-0000-0') AS onehealth_id,
                p.doctor_id,
                COALESCE(d.name, u.full_name, 'Dr. Specialist') AS doctor_name,
                p.diagnosis,
                p.doctor_notes,
                p.status AS prescription_status,
                p.created_at AS prescribed_at,
                (SELECT COUNT(*) FROM oh_id.pharmacy_dispensations pd WHERE pd.prescription_id = p.id) AS dispensed_items_count
            FROM oh_id.prescriptions p
            JOIN oh_id.hospitals h ON h.id = p.hospital_id
            LEFT JOIN oh_id.patients pat ON pat.id = p.patient_id
            LEFT JOIN oh_id.doctors d ON d.id = p.doctor_id
            LEFT JOIN oh_id.users u ON u.id = p.doctor_id;

            -- Inpatient Occupancy & Bed Dashboard View
            CREATE OR REPLACE VIEW oh_id.vw_inpatient_occupancy_dashboard AS
            SELECT 
                w.hospital_id,
                w.id AS ward_id,
                w.name AS ward_name,
                w.ward_type,
                w.floor_number,
                COUNT(b.id) AS total_beds,
                COUNT(b.id) FILTER (WHERE b.status = 'AVAILABLE') AS available_beds,
                COUNT(b.id) FILTER (WHERE b.status = 'OCCUPIED') AS occupied_beds,
                COUNT(b.id) FILTER (WHERE b.status = 'RESERVED') AS reserved_beds,
                COUNT(b.id) FILTER (WHERE b.status IN ('CLEANING', 'MAINTENANCE', 'BLOCKED')) AS offline_beds,
                ROUND((COUNT(b.id) FILTER (WHERE b.status = 'OCCUPIED')::numeric / NULLIF(COUNT(b.id), 0)) * 100, 1) AS occupancy_rate
            FROM oh_id.wards w
            LEFT JOIN oh_id.beds b ON b.ward_id = w.id
            GROUP BY w.hospital_id, w.id, w.name, w.ward_type, w.floor_number;

            -- Active Emergency Triage View
            CREATE OR REPLACE VIEW oh_id.vw_emergency_triage_active AS
            SELECT 
                e.id AS encounter_id,
                e.hospital_id,
                e.patient_id,
                COALESCE(pat.name, e.temporary_identity_code, 'Emergency Patient') AS patient_name,
                COALESCE(pat.onehealth_id, 'PENDING_RECONCILIATION') AS onehealth_id,
                e.is_anonymous_patient,
                e.arrival_time,
                e.arrival_mode,
                e.emergency_category,
                e.presenting_complaint,
                e.triage_score,
                e.triage_nurse_id,
                e.attending_doctor_id,
                e.disposition,
                e.status,
                ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - e.arrival_time))/60) AS wait_minutes
            FROM oh_id.emergency_encounters e
            LEFT JOIN oh_id.patients pat ON pat.id = e.patient_id
            WHERE e.status IN ('TRIAGED', 'IN_PROGRESS');
        """)

        # 12. Seed default Wards & Beds for Kedar Hospital (hosp-kedar) if none exist
        logger.info("Seeding initial Wards and Beds for hosp-kedar...")
        cur.execute("""
            INSERT INTO oh_id.wards (id, hospital_id, name, ward_type, floor_number, capacity, status)
            VALUES 
                ('ward-k-gen-01', 'hosp-kedar', 'General Medical Ward A', 'GENERAL', '2nd Floor', 12, 'ACTIVE'),
                ('ward-k-icu-01', 'hosp-kedar', 'Intensive Coronary Care Unit (ICCU)', 'ICU', '3rd Floor', 6, 'ACTIVE'),
                ('ward-k-pvt-01', 'hosp-kedar', 'Executive Deluxe Ward', 'PRIVATE', '4th Floor', 8, 'ACTIVE')
            ON CONFLICT (id) DO NOTHING;

            INSERT INTO oh_id.beds (id, ward_id, hospital_id, bed_number, bed_type, daily_charge, status)
            VALUES 
                ('bed-k-g01', 'ward-k-gen-01', 'hosp-kedar', 'G-201', 'STANDARD', 1200.00, 'AVAILABLE'),
                ('bed-k-g02', 'ward-k-gen-01', 'hosp-kedar', 'G-202', 'STANDARD', 1200.00, 'AVAILABLE'),
                ('bed-k-g03', 'ward-k-gen-01', 'hosp-kedar', 'G-203', 'OXYGEN', 1500.00, 'AVAILABLE'),
                ('bed-k-g04', 'ward-k-gen-01', 'hosp-kedar', 'G-204', 'STANDARD', 1200.00, 'AVAILABLE'),
                ('bed-k-icu01', 'ward-k-icu-01', 'hosp-kedar', 'ICU-301', 'VENTILATOR', 6500.00, 'AVAILABLE'),
                ('bed-k-icu02', 'ward-k-icu-01', 'hosp-kedar', 'ICU-302', 'MONITOR_OXYGEN', 4500.00, 'AVAILABLE'),
                ('bed-k-p01', 'ward-k-pvt-01', 'hosp-kedar', 'PVT-401', 'DELUXE', 3500.00, 'AVAILABLE'),
                ('bed-k-p02', 'ward-k-pvt-01', 'hosp-kedar', 'PVT-402', 'DELUXE', 3500.00, 'AVAILABLE')
            ON CONFLICT (id) DO UPDATE SET hospital_id = EXCLUDED.hospital_id;
        """)

        logger.info("Phase 3 Clinical Care Ecosystem migration applied successfully!")

if __name__ == "__main__":
    run_migration()
