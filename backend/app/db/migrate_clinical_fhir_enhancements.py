"""
OneHealth ID (OH-ID) - FHIR MedicationRequest & Clinical Workspace Migration
Idempotently creates/alters tables for:
- Structured FHIR prescriptions & prescription items
- Clinical consultation assessments (Chief complaints, PICLE exam, Medical history, Multi-tier diagnosis)
- Doctor referrals
- Structured follow-up plans
- Doctor scheduling rules & time allocations
"""
import psycopg2
import logging
from backend.app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration")

MIGRATION_SQL = """
-- 1. Enhance prescriptions table with FHIR MedicationRequest lifecycle
ALTER TABLE oh_id.prescriptions 
    ADD COLUMN IF NOT EXISTS encounter_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS diagnosis TEXT,
    ADD COLUMN IF NOT EXISTS valid_from DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS valid_until DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    ADD COLUMN IF NOT EXISTS signed_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS digital_signature_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(150) DEFAULT 'Doctor',
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

-- 2. Enhance prescription_items with structured dosage instructions
ALTER TABLE oh_id.prescription_items
    ADD COLUMN IF NOT EXISTS generic_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS brand_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS strength VARCHAR(50) DEFAULT '500 mg',
    ADD COLUMN IF NOT EXISTS dosage_form VARCHAR(50) DEFAULT 'Tablet',
    ADD COLUMN IF NOT EXISTS route VARCHAR(50) DEFAULT 'Oral',
    ADD COLUMN IF NOT EXISTS dose VARCHAR(50) DEFAULT '1 tablet',
    ADD COLUMN IF NOT EXISTS timing_morning BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS timing_afternoon BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS timing_evening BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS timing_night BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS food_instruction VARCHAR(50) DEFAULT 'AFTER_FOOD',
    ADD COLUMN IF NOT EXISTS duration_value INT DEFAULT 5,
    ADD COLUMN IF NOT EXISTS duration_unit VARCHAR(20) DEFAULT 'Days',
    ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '5 days'),
    ADD COLUMN IF NOT EXISTS expected_supply_duration INT DEFAULT 5,
    ADD COLUMN IF NOT EXISTS refills INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_prn BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS prn_indication TEXT,
    ADD COLUMN IF NOT EXISTS specific_instructions TEXT,
    ADD COLUMN IF NOT EXISTS dispensed_quantity INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS expiry_date DATE,
    ADD COLUMN IF NOT EXISTS item_status VARCHAR(50) DEFAULT 'ACTIVE';

-- 3. Enhance opd_consultations with rich clinical assessment data
ALTER TABLE oh_id.opd_consultations
    ADD COLUMN IF NOT EXISTS chief_complaint JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS examination JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS medical_history JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS diagnoses JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS consultation_status VARCHAR(50) DEFAULT 'COMPLETED',
    ADD COLUMN IF NOT EXISTS audit_meta JSONB DEFAULT '{}'::jsonb;

-- 4. Create referrals table
CREATE TABLE IF NOT EXISTS oh_id.referrals (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) REFERENCES oh_id.patients(id) ON DELETE CASCADE,
    referring_doctor_id VARCHAR(64) REFERENCES oh_id.doctors(id),
    receiving_doctor_id VARCHAR(64),
    referral_type VARCHAR(50) DEFAULT 'INTERNAL', -- INTERNAL, EXTERNAL
    specialty VARCHAR(100) NOT NULL,
    receiving_doctor_name VARCHAR(150),
    reason TEXT NOT NULL,
    clinical_summary TEXT,
    priority VARCHAR(20) DEFAULT 'ROUTINE', -- ROUTINE, URGENT, EMERGENCY
    requested_evaluation TEXT,
    attached_reports JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, ACCEPTED, COMPLETED, CANCELLED
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create follow-up plans table
CREATE TABLE IF NOT EXISTS oh_id.follow_up_plans (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) REFERENCES oh_id.patients(id) ON DELETE CASCADE,
    doctor_id VARCHAR(64) REFERENCES oh_id.doctors(id),
    department_id VARCHAR(64) REFERENCES oh_id.departments(id),
    scheduled_date DATE NOT NULL,
    scheduled_time VARCHAR(20) DEFAULT '10:30 AM',
    duration_minutes INT DEFAULT 15,
    reason TEXT,
    required_investigations JSONB DEFAULT '[]'::jsonb, -- e.g. ["CBC", "Lipid Profile"]
    instructions TEXT,
    status VARCHAR(50) DEFAULT 'PLANNED', -- PLANNED, SCHEDULED, COMPLETED, CANCELLED
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create doctor scheduling rules table
CREATE TABLE IF NOT EXISTS oh_id.doctor_schedules (
    id VARCHAR(64) PRIMARY KEY,
    doctor_id VARCHAR(64) REFERENCES oh_id.doctors(id) ON DELETE CASCADE,
    hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
    day_of_week VARCHAR(20) NOT NULL, -- Monday, Tuesday, etc.
    working_start_time VARCHAR(10) DEFAULT '09:00',
    working_end_time VARCHAR(10) DEFAULT '17:00',
    break_start_time VARCHAR(10) DEFAULT '13:00',
    break_end_time VARCHAR(10) DEFAULT '14:00',
    appointment_duration_minutes INT DEFAULT 15,
    buffer_time_minutes INT DEFAULT 5,
    emergency_slots_count INT DEFAULT 2,
    followup_slots_count INT DEFAULT 4,
    new_patient_slots_count INT DEFAULT 8,
    overbooking_allowed BOOLEAN DEFAULT TRUE,
    overbooking_max INT DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(doctor_id, day_of_week)
);

-- 7. Update vw_opd_encounters to include enriched clinical and prescription metadata
DROP VIEW IF EXISTS oh_id.vw_opd_encounters CASCADE;
CREATE OR REPLACE VIEW oh_id.vw_opd_encounters AS
SELECT 
    c.id,
    c.appointment_id,
    c.patient_id,
    p.name AS patient_name,
    p.onehealth_id,
    p.age AS patient_age,
    p.gender AS patient_gender,
    p.blood_group AS patient_blood_group,
    p.phone AS patient_phone,
    c.doctor_id,
    d.name AS doctor_name,
    d.specialty AS doctor_specialty,
    c.symptoms,
    c.diagnosis,
    c.clinical_notes,
    c.vitals,
    c.chief_complaint,
    c.examination,
    c.medical_history,
    c.diagnoses,
    c.consultation_status,
    c.created_at,
    pr.id AS prescription_id,
    pr.status AS prescription_status,
    pr.valid_from AS prescription_valid_from,
    pr.valid_until AS prescription_valid_until,
    pr.signed_at AS prescription_signed_at,
    pr.signed_by AS prescription_signed_by,
    (SELECT COUNT(*) FROM oh_id.prescription_items pi WHERE pi.prescription_id = pr.id) AS medicines_count
FROM oh_id.opd_consultations c
LEFT JOIN oh_id.patients p ON c.patient_id = p.id
LEFT JOIN oh_id.doctors d ON c.doctor_id = d.id
LEFT JOIN oh_id.prescriptions pr ON pr.consultation_id = c.id;

-- 8. Create view for enriched prescriptions with items
CREATE OR REPLACE VIEW oh_id.vw_prescriptions_full AS
SELECT
    pr.id,
    pr.consultation_id,
    pr.patient_id,
    p.name AS patient_name,
    p.onehealth_id,
    p.age AS patient_age,
    p.gender AS patient_gender,
    p.blood_group AS patient_blood_group,
    pr.doctor_id,
    d.name AS doctor_name,
    d.specialty AS doctor_specialty,
    d.hospital_id,
    h.name AS hospital_name,
    pr.diagnosis,
    pr.instructions,
    pr.status,
    pr.valid_from,
    pr.valid_until,
    pr.signed_by,
    pr.signed_at,
    pr.digital_signature_hash,
    pr.created_by,
    pr.created_at,
    pr.updated_at,
    pr.version,
    (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', pi.id,
                'medicine_name', pi.medicine_name,
                'generic_name', pi.generic_name,
                'brand_name', pi.brand_name,
                'strength', pi.strength,
                'dosage_form', pi.dosage_form,
                'route', pi.route,
                'dose', pi.dose,
                'frequency', pi.frequency,
                'timing_morning', pi.timing_morning,
                'timing_afternoon', pi.timing_afternoon,
                'timing_evening', pi.timing_evening,
                'timing_night', pi.timing_night,
                'food_instruction', pi.food_instruction,
                'duration_value', pi.duration_value,
                'duration_unit', pi.duration_unit,
                'start_date', pi.start_date,
                'end_date', pi.end_date,
                'quantity', pi.quantity,
                'expected_supply_duration', pi.expected_supply_duration,
                'refills', pi.refills,
                'is_prn', pi.is_prn,
                'prn_indication', pi.prn_indication,
                'specific_instructions', pi.specific_instructions,
                'is_dispensed', pi.is_dispensed,
                'dispensed_quantity', pi.dispensed_quantity,
                'batch_number', pi.batch_number,
                'expiry_date', pi.expiry_date,
                'status', pi.item_status
            )
        ), '[]'::jsonb)
        FROM oh_id.prescription_items pi
        WHERE pi.prescription_id = pr.id
    ) AS items
FROM oh_id.prescriptions pr
LEFT JOIN oh_id.patients p ON pr.patient_id = p.id
LEFT JOIN oh_id.doctors d ON pr.doctor_id = d.id
LEFT JOIN oh_id.hospitals h ON d.hospital_id = h.id;
"""

def run_migration():
    conn = psycopg2.connect(settings.DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    try:
        logger.info("Running FHIR MedicationRequest & Clinical Workspace Migration...")
        cur.execute(MIGRATION_SQL)
        logger.info("Successfully executed clinical migration!")
    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
