"""
Migration Script: Phase 2 — Hospital Operations & Patient Flow
Creates operational tables, state-machine stored procedures, and real-time aggregation views
for doctor rosters, nurse rosters, OPD counters, patient flow events, and operational alerts.
"""
import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from backend.app.database.session import get_db_cursor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ohid.db.migrate_phase2_ops")

def run_migration():
    logger.info("Executing Phase 2 Hospital Operations migration...")
    with get_db_cursor() as cur:
        # 1. Doctor Rosters (Operational Schedules & Room / Counter Allocation)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.doctor_rosters (
                id VARCHAR(64) PRIMARY KEY,
                doctor_id VARCHAR(64) NOT NULL REFERENCES oh_id.doctors(id) ON DELETE CASCADE,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                branch_id VARCHAR(64),
                department_id VARCHAR(64) REFERENCES oh_id.departments(id) ON DELETE SET NULL,
                roster_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                room_number VARCHAR(64) DEFAULT 'Room 101',
                opd_counter_id VARCHAR(64),
                max_patients INT NOT NULL DEFAULT 40,
                status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, ON_BREAK, BUSY, UNAVAILABLE, LEAVE, OFFLINE
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_doctor_rosters_hosp_date ON oh_id.doctor_rosters(hospital_id, roster_date);
            CREATE INDEX IF NOT EXISTS idx_doctor_rosters_doc_date ON oh_id.doctor_rosters(doctor_id, roster_date);
        """)

        # 2. Nurse Rosters (Operational Shift Allocation)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.nurse_rosters (
                id VARCHAR(64) PRIMARY KEY,
                nurse_id VARCHAR(64) NOT NULL,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                branch_id VARCHAR(64),
                department_id VARCHAR(64) REFERENCES oh_id.departments(id) ON DELETE SET NULL,
                ward VARCHAR(128) DEFAULT 'OPD Triage Wing A',
                shift VARCHAR(32) NOT NULL DEFAULT 'MORNING', -- MORNING, EVENING, NIGHT, GENERAL
                roster_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'ON_DUTY', -- ON_DUTY, ON_BREAK, OFF_DUTY, LEAVE
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_nurse_rosters_hosp_date ON oh_id.nurse_rosters(hospital_id, roster_date);
        """)

        # 3. OPD Counters (Physical / Digital Intake & Consultation Desks)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.opd_counters (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                branch_id VARCHAR(64),
                department_id VARCHAR(64) REFERENCES oh_id.departments(id) ON DELETE SET NULL,
                counter_number VARCHAR(32) NOT NULL,
                counter_name VARCHAR(128) NOT NULL,
                service_type VARCHAR(64) NOT NULL DEFAULT 'GENERAL_CONSULTATION',
                token_prefix VARCHAR(16) NOT NULL DEFAULT 'OPD-',
                token_start INT NOT NULL DEFAULT 1,
                current_token_seq INT NOT NULL DEFAULT 0,
                assigned_staff_id VARCHAR(64),
                assigned_staff_name VARCHAR(128),
                operating_hours VARCHAR(64) DEFAULT '08:00 AM - 02:00 PM',
                status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (hospital_id, counter_number)
            );

            ALTER TABLE oh_id.opd_counters ADD COLUMN IF NOT EXISTS service_type VARCHAR(64) DEFAULT 'GENERAL_CONSULTATION';
            ALTER TABLE oh_id.opd_counters ADD COLUMN IF NOT EXISTS current_token_seq INT DEFAULT 0;
            ALTER TABLE oh_id.opd_counters ADD COLUMN IF NOT EXISTS assigned_staff_id VARCHAR(64);
            ALTER TABLE oh_id.opd_counters ADD COLUMN IF NOT EXISTS token_prefix VARCHAR(16) DEFAULT 'OPD-';
            ALTER TABLE oh_id.opd_counters ADD COLUMN IF NOT EXISTS token_start INT DEFAULT 1;

            CREATE INDEX IF NOT EXISTS idx_opd_counters_hosp ON oh_id.opd_counters(hospital_id);
        """)

        # 4. Patient Flow Events (Immutable Audit Timeline of Operational Movements)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.patient_flow_events (
                id VARCHAR(64) PRIMARY KEY,
                visit_id VARCHAR(64),
                appointment_id VARCHAR(64),
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                onehealth_id VARCHAR(64),
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                branch_id VARCHAR(64),
                department_id VARCHAR(64),
                event_type VARCHAR(64) NOT NULL,
                -- PATIENT_REGISTERED, APPOINTMENT_BOOKED, PATIENT_CHECKED_IN, TOKEN_GENERATED,
                -- TOKEN_CALLED, PATIENT_IN_SERVICE, CONSULTATION_STARTED, CONSULTATION_COMPLETED,
                -- INVESTIGATION_ORDERED, SAMPLE_COLLECTED, RESULT_AVAILABLE, PATIENT_DISCHARGED
                actor_id VARCHAR(64) NOT NULL,
                actor_role VARCHAR(64),
                notes TEXT,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_patient_flow_events_patient ON oh_id.patient_flow_events(patient_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_patient_flow_events_hosp ON oh_id.patient_flow_events(hospital_id, created_at DESC);
        """)

        # 5. Operational Alerts
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.operational_alerts (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                branch_id VARCHAR(64),
                department_id VARCHAR(64),
                alert_type VARCHAR(64) NOT NULL, -- HIGH_QUEUE, DOCTOR_UNAVAILABLE, COUNTER_OFFLINE, APPOINTMENT_CONFLICT, WAITING_EXCEEDED
                severity VARCHAR(32) NOT NULL DEFAULT 'WARNING', -- INFO, WARNING, CRITICAL
                title VARCHAR(256) NOT NULL,
                message TEXT NOT NULL,
                is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
                acknowledged_by VARCHAR(64),
                acknowledged_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_operational_alerts_hosp ON oh_id.operational_alerts(hospital_id, is_acknowledged, created_at DESC);
        """)

        # Ensure columns on departments, appointments and queue_entries for token prefixes and flow tracking
        cur.execute("""
            ALTER TABLE oh_id.departments ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'ACTIVE';
            UPDATE oh_id.departments SET status = CASE WHEN is_active = TRUE THEN 'ACTIVE' ELSE 'INACTIVE' END WHERE status IS NULL;

            ALTER TABLE oh_id.appointments ADD COLUMN IF NOT EXISTS token_prefix VARCHAR(16) DEFAULT 'OPD-';
            ALTER TABLE oh_id.appointments ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
            ALTER TABLE oh_id.appointments ADD COLUMN IF NOT EXISTS visit_id VARCHAR(64);

            ALTER TABLE oh_id.queue_entries ADD COLUMN IF NOT EXISTS token_prefix VARCHAR(16) DEFAULT 'OPD-';
            ALTER TABLE oh_id.queue_entries ADD COLUMN IF NOT EXISTS called_at TIMESTAMPTZ;
            ALTER TABLE oh_id.queue_entries ADD COLUMN IF NOT EXISTS in_service_at TIMESTAMPTZ;
            ALTER TABLE oh_id.queue_entries ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
            ALTER TABLE oh_id.queue_entries ADD COLUMN IF NOT EXISTS counter_id VARCHAR(64);
            ALTER TABLE oh_id.queue_entries ADD COLUMN IF NOT EXISTS priority VARCHAR(32) DEFAULT 'NORMAL';
            ALTER TABLE oh_id.queue_entries ADD COLUMN IF NOT EXISTS reason TEXT;
            ALTER TABLE oh_id.queue_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

            ALTER TABLE oh_id.doctor_rosters ADD COLUMN IF NOT EXISTS shift VARCHAR(32) DEFAULT 'MORNING';
            ALTER TABLE oh_id.doctor_rosters ALTER COLUMN start_time DROP NOT NULL;
            ALTER TABLE oh_id.doctor_rosters ALTER COLUMN end_time DROP NOT NULL;

            -- Update sp_book_appointment to ensure appointment_date and appointment_time are populated
            CREATE OR REPLACE PROCEDURE oh_id.sp_book_appointment(
                p_id VARCHAR(64),
                p_patient_id VARCHAR(64),
                p_doctor_id VARCHAR(64),
                p_slot VARCHAR(50),
                p_status VARCHAR(50),
                p_hospital_id VARCHAR(64),
                p_department_id VARCHAR(64),
                p_notes TEXT,
                p_booked_by VARCHAR(64),
                INOUT o_appointment_id VARCHAR(64) DEFAULT NULL,
                INOUT o_token_number INT DEFAULT 1
            )
            LANGUAGE plpgsql
            AS $$
            DECLARE
                v_new_id VARCHAR(64);
                v_token INT;
                v_dept VARCHAR(64);
                v_hosp VARCHAR(64);
                v_appt_date DATE;
                v_appt_time VARCHAR(32);
            BEGIN
                v_new_id := COALESCE(p_id, 'a-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

                IF p_hospital_id IS NULL OR p_department_id IS NULL THEN
                    SELECT hospital_id, department_id INTO v_hosp, v_dept FROM oh_id.doctors WHERE id = p_doctor_id;
                ELSE
                    v_hosp := p_hospital_id;
                    v_dept := p_department_id;
                END IF;

                BEGIN
                    v_appt_date := (SUBSTRING(p_slot FROM 1 FOR 10))::DATE;
                    v_appt_time := TRIM(SUBSTRING(p_slot FROM 11));
                EXCEPTION WHEN OTHERS THEN
                    v_appt_date := CURRENT_DATE;
                    v_appt_time := '10:00 AM';
                END;

                SELECT COALESCE(MAX(token_number), 0) + 1 INTO v_token 
                FROM oh_id.appointments 
                WHERE doctor_id = p_doctor_id AND (appointment_date = v_appt_date OR slot ILIKE (v_appt_date::TEXT || '%'));

                INSERT INTO oh_id.appointments (
                    id, patient_id, doctor_id, hospital_id, department_id, slot, appointment_date, appointment_time, status, token_number, notes, booked_by
                ) VALUES (
                    v_new_id, p_patient_id, p_doctor_id, v_hosp, v_dept, p_slot, v_appt_date, v_appt_time, COALESCE(p_status, 'scheduled'), v_token, p_notes, p_booked_by
                ) ON CONFLICT (id) DO UPDATE SET
                    slot = EXCLUDED.slot,
                    appointment_date = EXCLUDED.appointment_date,
                    appointment_time = EXCLUDED.appointment_time,
                    status = EXCLUDED.status;

                INSERT INTO oh_id.queue_entries (
                    id, hospital_id, doctor_id, department_id, appointment_id, patient_id, token_number, status, estimated_wait_minutes
                ) VALUES (
                    'q-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
                    v_hosp, p_doctor_id, v_dept, v_new_id, p_patient_id, v_token, 'WAITING', (v_token * 15)
                ) ON CONFLICT DO NOTHING;

                o_appointment_id := v_new_id;
                o_token_number := v_token;
            END;
            $$;
        """)

        # 7. Seed Initial OPD Counters for Kedar Hospital and satellite branches
        cur.execute("""
            INSERT INTO oh_id.opd_counters (
                id, hospital_id, branch_id, department_id, counter_number, counter_name,
                service_type, token_prefix, token_start, assigned_staff_name, operating_hours, status
            )
            VALUES 
                ('cnt-kedar-01', 'hosp-kedar', 'branch-kedar-01', 'dept-k-01', 'Counter 1', 'General Medicine Registration & Triage', 'REGISTRATION', 'GM-', 1, 'Kavitha Sundaram', '08:00 AM - 08:00 PM', 'OPEN'),
                ('cnt-kedar-02', 'hosp-kedar', 'branch-kedar-01', 'dept-k-01', 'Counter 2', 'General OPD Consultation Desk', 'GENERAL_CONSULTATION', 'GM-', 1, 'Dr. Senthil Nathan', '08:30 AM - 01:30 PM', 'OPEN'),
                ('cnt-kedar-03', 'hosp-kedar', 'branch-kedar-01', 'dept-k-02', 'Counter 3', 'Cardiology Specialty Clinic', 'SPECIALTY_CLINIC', 'CAR-', 1, 'Dr. Anitha Raman', '09:00 AM - 02:00 PM', 'OPEN'),
                ('cnt-kedar-04', 'hosp-kedar', 'branch-kedar-01', 'dept-k-03', 'Counter 4', 'Pediatrics Outpatient Desk', 'SPECIALTY_CLINIC', 'PED-', 1, 'Dr. Arvind Swamy', '09:00 AM - 01:00 PM', 'OPEN')
            ON CONFLICT (hospital_id, counter_number) DO UPDATE SET
                status = EXCLUDED.status,
                counter_name = EXCLUDED.counter_name,
                token_prefix = EXCLUDED.token_prefix;
        """)

        # 8. Seed Doctor Schedules / Rosters for today & upcoming dates
        cur.execute("""
            INSERT INTO oh_id.doctor_rosters (
                id, doctor_id, hospital_id, branch_id, department_id, roster_date,
                start_time, end_time, room_number, opd_counter_id, max_patients, status
            )
            VALUES 
                ('rost-doc1-today', 'doc-k-01', 'hosp-kedar', 'branch-kedar-01', 'dept-k-01', CURRENT_DATE, '08:30:00', '13:30:00', 'Room 101', 'cnt-kedar-02', 40, 'AVAILABLE'),
                ('rost-doc2-today', 'doc-k-02', 'hosp-kedar', 'branch-kedar-01', 'dept-k-02', CURRENT_DATE, '09:00:00', '14:00:00', 'Room 102', 'cnt-kedar-03', 30, 'AVAILABLE'),
                ('rost-kumar-today', 'doc-k-kumar', 'hosp-kedar-iyp', 'branch-kedar-02', 'dept-k-01', CURRENT_DATE, '09:00:00', '13:00:00', 'Room 201', NULL, 35, 'AVAILABLE')
            ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                roster_date = CURRENT_DATE;
        """)

        # 9. Seed Nurse Rosters
        cur.execute("""
            INSERT INTO oh_id.nurse_rosters (
                id, nurse_id, hospital_id, branch_id, department_id, ward, shift,
                roster_date, start_time, end_time, status
            )
            VALUES 
                ('rost-nurse1-today', 'usr-kedar-nurse', 'hosp-kedar', 'branch-kedar-01', 'dept-k-01', 'OPD Triage Wing A', 'MORNING', CURRENT_DATE, '07:30:00', '15:30:00', 'ON_DUTY')
            ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                roster_date = CURRENT_DATE;
        """)

        # 10. Real-time Aggregation View: oh_id.vw_opd_operations_today
        cur.execute("""
            CREATE OR REPLACE VIEW oh_id.vw_opd_operations_today AS
            SELECT 
                h.id AS hospital_id,
                h.name AS hospital_name,
                h.code AS hospital_code,
                -- Appointments Today
                COALESCE((
                    SELECT COUNT(*) FROM oh_id.appointments a
                    WHERE a.hospital_id = h.id 
                    AND (a.appointment_date = CURRENT_DATE OR a.created_at::date = CURRENT_DATE)
                ), 0) AS total_appointments_today,
                -- Checked In Today
                COALESCE((
                    SELECT COUNT(*) FROM oh_id.appointments a
                    WHERE a.hospital_id = h.id 
                    AND (a.appointment_date = CURRENT_DATE OR a.created_at::date = CURRENT_DATE)
                    AND a.status IN ('CHECKED_IN', 'IN_PROGRESS', 'COMPLETED')
                ), 0) AS checked_in_today,
                -- Waiting in Queue Today
                COALESCE((
                    SELECT COUNT(*) FROM oh_id.queue_entries q
                    WHERE q.hospital_id = h.id 
                    AND q.created_at::date = CURRENT_DATE
                    AND q.status = 'WAITING'
                ), 0) AS waiting_today,
                -- In Consultation Today
                COALESCE((
                    SELECT COUNT(*) FROM oh_id.queue_entries q
                    WHERE q.hospital_id = h.id 
                    AND q.created_at::date = CURRENT_DATE
                    AND q.status IN ('IN_CONSULTATION', 'CALLED', 'IN_SERVICE')
                ), 0) AS in_consultation_today,
                -- Completed Today
                COALESCE((
                    SELECT COUNT(*) FROM oh_id.queue_entries q
                    WHERE q.hospital_id = h.id 
                    AND q.created_at::date = CURRENT_DATE
                    AND q.status = 'COMPLETED'
                ), 0) AS completed_today,
                -- No-Show / Cancelled Today
                COALESCE((
                    SELECT COUNT(*) FROM oh_id.appointments a
                    WHERE a.hospital_id = h.id 
                    AND (a.appointment_date = CURRENT_DATE OR a.created_at::date = CURRENT_DATE)
                    AND a.status IN ('CANCELLED', 'NO_SHOW')
                ), 0) AS no_show_today,
                -- Active Doctors on Duty
                COALESCE((
                    SELECT COUNT(DISTINCT dr.doctor_id) FROM oh_id.doctor_rosters dr
                    WHERE dr.hospital_id = h.id 
                    AND dr.roster_date = CURRENT_DATE 
                    AND dr.status IN ('AVAILABLE', 'BUSY', 'ON_BREAK')
                ), 0) AS active_doctors_count,
                -- Duty Nurses
                COALESCE((
                    SELECT COUNT(DISTINCT nr.nurse_id) FROM oh_id.nurse_rosters nr
                    WHERE nr.hospital_id = h.id 
                    AND nr.roster_date = CURRENT_DATE 
                    AND nr.status = 'ON_DUTY'
                ), 0) AS nurses_on_duty_count,
                -- Open Departments
                COALESCE((
                    SELECT COUNT(*) FROM oh_id.departments d
                    WHERE d.hospital_id = h.id 
                    AND (d.status = 'ACTIVE' OR d.is_active = TRUE)
                ), 0) AS open_departments_count,
                -- Active OPD Counters
                COALESCE((
                    SELECT COUNT(*) FROM oh_id.opd_counters oc
                    WHERE oc.hospital_id = h.id 
                    AND oc.status = 'OPEN'
                ), 0) AS active_counters_count,
                -- Pending Lab / Investigations
                COALESCE((
                    SELECT COUNT(*) FROM oh_id.lab_orders lo
                    WHERE lo.hospital_id = h.id 
                    AND lo.status IN ('PENDING', 'ORDERED', 'SAMPLE_COLLECTED')
                ), 0) AS pending_investigations_count
            FROM oh_id.hospitals h;
        """)

        # 11. View: oh_id.vw_patient_flow_analytics (Hourly flow throughput and wait times)
        cur.execute("""
            CREATE OR REPLACE VIEW oh_id.vw_patient_flow_analytics AS
            SELECT 
                pfe.hospital_id,
                pfe.created_at::date AS flow_date,
                EXTRACT(HOUR FROM pfe.created_at)::int AS flow_hour,
                COUNT(CASE WHEN pfe.event_type = 'PATIENT_CHECKED_IN' THEN 1 END) AS arrivals_count,
                COUNT(CASE WHEN pfe.event_type = 'CONSULTATION_STARTED' THEN 1 END) AS consultations_started_count,
                COUNT(CASE WHEN pfe.event_type = 'CONSULTATION_COMPLETED' THEN 1 END) AS consultations_completed_count
            FROM oh_id.patient_flow_events pfe
            GROUP BY pfe.hospital_id, pfe.created_at::date, EXTRACT(HOUR FROM pfe.created_at);
        """)

        logger.info("Phase 2 migration applied successfully!")

if __name__ == "__main__":
    run_migration()
