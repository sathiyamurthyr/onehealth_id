"""
Kedar Hospital Pilot MVP — Enhanced Views and Stored Procedures
Implements:
1. Enhanced vw_patients (with identity_type, identity_number, branch_id, is_demo_data)
2. Enhanced vw_appointments (with branch_id, is_demo_data)
3. Enhanced vw_queue_board (with branch_id)
4. sp_register_patient_v2 (with identity credentials, secure OneHealth ID & Zero-Knowledge QR)
5. sp_check_in_appointment (atomic appointment check-in & OPD queue token generation)
6. sp_record_consultation (atomic doctor encounter completion & queue close)
7. sp_rotate_patient_qr (secure zero-knowledge token rotation with audit logging)
"""

from backend.app.database.session import get_db_cursor

SQL_UPGRADE = """
-- 1. Enhanced vw_patients
DROP VIEW IF EXISTS oh_id.vw_patients CASCADE;
CREATE VIEW oh_id.vw_patients AS
SELECT 
    p.id,
    p.onehealth_id,
    p.qr_token,
    p.name,
    p.age,
    p.gender,
    p.phone,
    p.email,
    p.address,
    p.city,
    p.state,
    p.emergency_contact,
    p.blood_group,
    p.diagnosis,
    p.identity_type,
    p.identity_number,
    p.branch_id,
    b.name AS branch_name,
    p.is_demo_data,
    p.status,
    p.hospital_id,
    h.name AS hospital_name,
    p.tenant_id,
    p.created_at,
    p.updated_at,
    (SELECT COUNT(*) FROM oh_id.appointments a WHERE a.patient_id = p.id) AS total_appointments,
    (SELECT COUNT(*) FROM oh_id.invoices i WHERE i.patient_id = p.id AND i.payment_status != 'PAID') AS pending_bills_count
FROM oh_id.patients p
LEFT JOIN oh_id.hospitals h ON p.hospital_id = h.id
LEFT JOIN oh_id.hospital_branches b ON p.branch_id = b.id;

-- 2. Enhanced vw_appointments
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
    d.room_number,
    a.hospital_id,
    h.name AS hospital_name,
    a.branch_id,
    b.name AS branch_name,
    a.department_id,
    dept.name AS department_name,
    a.slot,
    a.status,
    a.token_number,
    a.priority,
    a.notes,
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

-- 3. Enhanced vw_queue_board
DROP VIEW IF EXISTS oh_id.vw_queue_board CASCADE;
CREATE VIEW oh_id.vw_queue_board AS
SELECT 
    q.id,
    q.token_number,
    q.status,
    q.estimated_wait_minutes,
    q.called_at,
    q.completed_at,
    q.created_at,
    q.patient_id,
    p.name AS patient_name,
    p.onehealth_id,
    p.phone AS patient_phone,
    p.age AS patient_age,
    p.gender AS patient_gender,
    p.is_demo_data AS patient_is_demo_data,
    q.doctor_id,
    d.name AS doctor_name,
    d.specialty AS doctor_specialty,
    d.room_number,
    q.department_id,
    dept.name AS department_name,
    q.hospital_id,
    h.name AS hospital_name,
    q.branch_id,
    b.name AS branch_name,
    a.id AS appointment_id,
    a.slot AS appointment_slot,
    COALESCE(a.priority, 'NORMAL') AS priority,
    a.notes AS appointment_notes
FROM oh_id.queue_entries q
LEFT JOIN oh_id.patients p ON q.patient_id = p.id
LEFT JOIN oh_id.doctors d ON q.doctor_id = d.id
LEFT JOIN oh_id.departments dept ON q.department_id = dept.id
LEFT JOIN oh_id.hospitals h ON q.hospital_id = h.id
LEFT JOIN oh_id.hospital_branches b ON q.branch_id = b.id
LEFT JOIN oh_id.appointments a ON q.appointment_id = a.id;

-- 4. Stored Procedure: sp_register_patient_v2
CREATE OR REPLACE PROCEDURE oh_id.sp_register_patient_v2(
    p_id VARCHAR(64),
    p_name VARCHAR(150),
    p_age INT,
    p_gender VARCHAR(20),
    p_phone VARCHAR(20),
    p_email VARCHAR(100),
    p_address TEXT,
    p_emergency_contact VARCHAR(100),
    p_blood_group VARCHAR(20),
    p_diagnosis TEXT,
    p_identity_type VARCHAR(50),
    p_identity_number VARCHAR(100),
    p_hospital_id VARCHAR(64),
    p_branch_id VARCHAR(64),
    p_tenant_id VARCHAR(64),
    p_created_by VARCHAR(64),
    p_is_demo_data BOOLEAN,
    INOUT o_patient_id VARCHAR(64) DEFAULT NULL,
    INOUT o_onehealth_id VARCHAR(64) DEFAULT NULL,
    INOUT o_qr_token VARCHAR(255) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_id VARCHAR(64);
    v_seq INT;
    v_rand VARCHAR(12);
    v_ohid VARCHAR(64);
    v_qr VARCHAR(255);
    v_hosp VARCHAR(64);
    v_ten VARCHAR(64);
BEGIN
    v_new_id := COALESCE(p_id, 'p-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    v_hosp := COALESCE(p_hospital_id, 'hosp-kedar');
    v_ten := COALESCE(p_tenant_id, 'ten-kedar');

    -- Secure, non-sequential OneHealth ID format (OHID-KEDAR-2026-XXXXX)
    v_rand := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || v_new_id || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
    v_ohid := 'OHID-KEDAR-2026-' || v_rand;

    -- Zero-knowledge QR token (never contains medical history or diagnosis)
    v_qr := 'QR-OHID-SECURE-' || MD5(v_ohid || v_new_id || RANDOM()::TEXT);

    INSERT INTO oh_id.patients (
        id, onehealth_id, qr_token, name, age, gender, phone, email,
        address, emergency_contact, blood_group, diagnosis,
        identity_type, identity_number, hospital_id, branch_id, tenant_id,
        status, is_demo_data
    ) VALUES (
        v_new_id, v_ohid, v_qr, p_name, p_age, p_gender, p_phone, p_email,
        p_address, p_emergency_contact, p_blood_group, p_diagnosis,
        COALESCE(p_identity_type, 'NATIONAL_ID'), p_identity_number, v_hosp, p_branch_id, v_ten,
        'ACTIVE', COALESCE(p_is_demo_data, FALSE)
    );

    -- Audit log entry
    INSERT INTO oh_id.audit_logs (id, actor_id, actor_name, hospital_id, tenant_id, action, resource_type, resource_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        p_created_by, 'Hospital Staff', v_hosp, v_ten, 'PATIENT_REGISTER', 'PATIENT', v_new_id,
        json_build_object(
            'onehealth_id', v_ohid,
            'name', p_name,
            'identity_type', p_identity_type,
            'branch_id', p_branch_id
        )::jsonb
    );

    o_patient_id := v_new_id;
    o_onehealth_id := v_ohid;
    o_qr_token := v_qr;
END;
$$;

-- 5. Stored Procedure: sp_check_in_appointment
CREATE OR REPLACE PROCEDURE oh_id.sp_check_in_appointment(
    p_appointment_id VARCHAR(64),
    p_actor_id VARCHAR(64),
    INOUT o_queue_id VARCHAR(64) DEFAULT NULL,
    INOUT o_token_number INT DEFAULT NULL,
    INOUT o_status VARCHAR(50) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_appt RECORD;
    v_token INT;
    v_existing_qid VARCHAR(64);
    v_qid VARCHAR(64);
BEGIN
    SELECT * INTO v_appt FROM oh_id.appointments WHERE id = p_appointment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment % not found', p_appointment_id;
    END IF;

    -- Update appointment status to checked_in
    UPDATE oh_id.appointments 
    SET status = 'checked_in', updated_at = CURRENT_TIMESTAMP
    WHERE id = p_appointment_id;

    -- Check if queue entry already exists
    SELECT id, token_number INTO v_existing_qid, v_token 
    FROM oh_id.queue_entries 
    WHERE appointment_id = p_appointment_id;

    IF v_existing_qid IS NOT NULL THEN
        UPDATE oh_id.queue_entries 
        SET status = 'WAITING' 
        WHERE id = v_existing_qid;
        v_qid := v_existing_qid;
    ELSE
        -- Calculate next token for doctor today
        SELECT COALESCE(MAX(token_number), 0) + 1 INTO v_token
        FROM oh_id.queue_entries
        WHERE doctor_id = v_appt.doctor_id AND DATE(created_at) = CURRENT_DATE;

        v_qid := 'q-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8);

        INSERT INTO oh_id.queue_entries (
            id, hospital_id, branch_id, doctor_id, department_id,
            appointment_id, patient_id, token_number, status, estimated_wait_minutes
        ) VALUES (
            v_qid, v_appt.hospital_id, v_appt.branch_id, v_appt.doctor_id, v_appt.department_id,
            p_appointment_id, v_appt.patient_id, v_token, 'WAITING', (v_token * 10)
        );
    END IF;

    -- Audit log
    INSERT INTO oh_id.audit_logs (id, actor_id, actor_name, hospital_id, action, resource_type, resource_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        p_actor_id, 'Receptionist / Staff', v_appt.hospital_id, 'PATIENT_CHECK_IN', 'APPOINTMENT', p_appointment_id,
        json_build_object('queue_id', v_qid, 'token_number', v_token, 'patient_id', v_appt.patient_id)::jsonb
    );

    o_queue_id := v_qid;
    o_token_number := v_token;
    o_status := 'checked_in';
END;
$$;

-- 6. Stored Procedure: sp_record_consultation
CREATE OR REPLACE PROCEDURE oh_id.sp_record_consultation(
    p_consultation_id VARCHAR(64),
    p_appointment_id VARCHAR(64),
    p_patient_id VARCHAR(64),
    p_doctor_id VARCHAR(64),
    p_symptoms TEXT,
    p_diagnosis TEXT,
    p_clinical_notes TEXT,
    p_vitals JSONB,
    p_actor_id VARCHAR(64),
    INOUT o_consultation_id VARCHAR(64) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_cid VARCHAR(64);
    v_hosp VARCHAR(64);
BEGIN
    v_new_cid := COALESCE(p_consultation_id, 'c-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

    SELECT hospital_id INTO v_hosp FROM oh_id.doctors WHERE id = p_doctor_id;

    INSERT INTO oh_id.opd_consultations (
        id, appointment_id, patient_id, doctor_id, symptoms, diagnosis, clinical_notes, vitals
    ) VALUES (
        v_new_cid, p_appointment_id, p_patient_id, p_doctor_id,
        p_symptoms, p_diagnosis, p_clinical_notes, COALESCE(p_vitals, '{}'::jsonb)
    );

    -- Mark appointment completed
    IF p_appointment_id IS NOT NULL THEN
        UPDATE oh_id.appointments 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE id = p_appointment_id;

        UPDATE oh_id.queue_entries 
        SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
        WHERE appointment_id = p_appointment_id;
    END IF;

    -- Audit log
    INSERT INTO oh_id.audit_logs (id, actor_id, actor_name, hospital_id, action, resource_type, resource_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        p_actor_id, 'Doctor', v_hosp, 'CONSULTATION_CREATE', 'CONSULTATION', v_new_cid,
        json_build_object('appointment_id', p_appointment_id, 'patient_id', p_patient_id, 'diagnosis', p_diagnosis)::jsonb
    );

    o_consultation_id := v_new_cid;
END;
$$;

-- 7. Stored Procedure: sp_rotate_patient_qr
CREATE OR REPLACE PROCEDURE oh_id.sp_rotate_patient_qr(
    p_patient_id VARCHAR(64),
    p_actor_id VARCHAR(64),
    INOUT o_new_qr_token VARCHAR(255) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_patient RECORD;
    v_new_qr VARCHAR(255);
BEGIN
    SELECT * INTO v_patient FROM oh_id.patients WHERE id = p_patient_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient % not found', p_patient_id;
    END IF;

    v_new_qr := 'QR-OHID-SECURE-' || MD5(v_patient.onehealth_id || p_patient_id || CLOCK_TIMESTAMP()::TEXT);

    UPDATE oh_id.patients 
    SET qr_token = v_new_qr, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_patient_id;

    -- Audit log
    INSERT INTO oh_id.audit_logs (id, actor_id, actor_name, hospital_id, action, resource_type, resource_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        p_actor_id, 'Staff', v_patient.hospital_id, 'QR_GENERATION', 'PATIENT', p_patient_id,
        json_build_object('onehealth_id', v_patient.onehealth_id, 'token_prefix', SUBSTRING(v_new_qr FROM 1 FOR 15))::jsonb
    );

    o_new_qr_token := v_new_qr;
END;
$$;
"""

def run():
    print("Applying enhanced views and stored procedures for Kedar Pilot...")
    with get_db_cursor() as cur:
        cur.execute(SQL_UPGRADE)
        print("Views and procedures updated successfully.")

if __name__ == "__main__":
    run()
