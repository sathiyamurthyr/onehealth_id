"""
Migration script to extend oh_id.appointments and oh_id.vw_appointments for
Appointment Booking for Self or Family with full audit trail and QR pass support.
"""
from backend.app.database.session import get_db_cursor

def run_migration():
    with get_db_cursor() as cur:
        print("Migrating oh_id.appointments table columns...")
        cur.execute("""
            -- Add appointment booking metadata columns if not exist
            ALTER TABLE oh_id.appointments 
                ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(64) DEFAULT 'New Consultation',
                ADD COLUMN IF NOT EXISTS appointment_date DATE,
                ADD COLUMN IF NOT EXISTS appointment_time VARCHAR(30),
                ADD COLUMN IF NOT EXISTS reason TEXT,
                ADD COLUMN IF NOT EXISTS relationship_context VARCHAR(30) DEFAULT 'SELF',
                ADD COLUMN IF NOT EXISTS booked_by_user_id VARCHAR(64),
                ADD COLUMN IF NOT EXISTS booked_by_name VARCHAR(128),
                ADD COLUMN IF NOT EXISTS booked_by_relationship VARCHAR(64),
                ADD COLUMN IF NOT EXISTS checkin_token VARCHAR(128),
                ADD COLUMN IF NOT EXISTS reschedule_history JSONB DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
                ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(128);
        """)

        # Populate appointment_date and appointment_time from existing slots where possible
        cur.execute("""
            UPDATE oh_id.appointments
            SET 
                appointment_type = COALESCE(appointment_type, 'New Consultation'),
                relationship_context = COALESCE(relationship_context, 'SELF'),
                checkin_token = COALESCE(checkin_token, 'CHK-' || SUBSTRING(MD5(id || RANDOM()::TEXT) FROM 1 FOR 12))
            WHERE checkin_token IS NULL;
        """)

        # Recreate enhanced oh_id.vw_appointments
        print("Recreating oh_id.vw_appointments view...")
        cur.execute("""
            DROP VIEW IF EXISTS oh_id.vw_appointments CASCADE;
            CREATE VIEW oh_id.vw_appointments AS
            SELECT 
                a.id,
                a.patient_id,
                p.name AS patient_name,
                p.onehealth_id,
                p.phone AS patient_phone,
                p.age AS patient_age,
                p.gender AS patient_gender,
                p.diagnosis AS patient_diagnosis,
                p.identity_type,
                p.identity_number,
                a.doctor_id,
                d.name AS doctor_name,
                d.specialty AS doctor_specialty,
                d.qualification AS doctor_qualification,
                d.room_number,
                d.rating AS doctor_rating,
                a.hospital_id,
                COALESCE(h.name, 'Hospital Facility') AS hospital_name,
                h.city AS hospital_city,
                h.address AS hospital_address,
                a.branch_id,
                b.name AS branch_name,
                a.department_id,
                COALESCE(dept.name, 'General OPD') AS department_name,
                a.slot,
                a.appointment_type,
                a.appointment_date,
                a.appointment_time,
                a.reason,
                a.status,
                a.token_number,
                a.priority,
                a.notes,
                a.relationship_context,
                a.booked_by_user_id,
                a.booked_by_name,
                a.booked_by_relationship,
                a.checkin_token,
                a.reschedule_history,
                a.cancellation_reason,
                a.cancelled_at,
                a.cancelled_by,
                a.is_demo_data,
                a.booked_by,
                a.created_at,
                a.updated_at
            FROM oh_id.appointments a
            LEFT JOIN oh_id.patients p ON a.patient_id = p.id
            LEFT JOIN oh_id.doctors d ON a.doctor_id = d.id
            LEFT JOIN oh_id.hospitals h ON a.hospital_id = h.id
            LEFT JOIN oh_id.hospital_branches b ON a.branch_id = b.id
            LEFT JOIN oh_id.departments dept ON a.department_id = dept.id;
        """)

        # Add mock doctors and departments if needed for rich hospital selection
        cur.execute("""
            -- Ensure Kedar Hospital has Cardiology and General Medicine departments
            INSERT INTO oh_id.departments (id, name, hospital_id)
            VALUES 
                ('dept-k-cardio', 'Cardiology', 'hosp-kedar'),
                ('dept-k-ortho', 'Orthopedics', 'hosp-kedar'),
                ('dept-k-pedia', 'Pediatrics', 'hosp-kedar'),
                ('dept-k-derma', 'Dermatology', 'hosp-kedar'),
                ('dept-k-ent', 'ENT', 'hosp-kedar'),
                ('dept-k-gynae', 'Gynecology', 'hosp-kedar'),
                ('dept-k-neuro', 'Neurology', 'hosp-kedar')
            ON CONFLICT (id) DO NOTHING;

            -- Ensure Dr. Arun Kumar exists at Kedar Hospital (as referenced in specs)
            INSERT INTO oh_id.doctors (id, name, specialty, qualification, experience_years, room_number, hospital_id, department_id, rating, is_available)
            VALUES 
                ('doc-arun-kumar', 'Dr. Arun Kumar', 'Cardiologist', 'MBBS, MD, DM (Cardiology)', 14, 'OPD-102', 'hosp-kedar', 'dept-k-cardio', 4.9, TRUE),
                ('doc-pedia-k', 'Dr. Priya Shankar', 'Pediatrician', 'MBBS, DCH, DNB (Pediatrics)', 11, 'OPD-105', 'hosp-kedar', 'dept-k-pedia', 4.8, TRUE),
                ('doc-ortho-k', 'Dr. Ramesh Sundar', 'Orthopedic Surgeon', 'MBBS, MS (Ortho)', 16, 'OPD-201', 'hosp-kedar', 'dept-k-ortho', 4.9, TRUE)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                specialty = EXCLUDED.specialty,
                hospital_id = EXCLUDED.hospital_id,
                department_id = EXCLUDED.department_id;
        """)

        print("Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
