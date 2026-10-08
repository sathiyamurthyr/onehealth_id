import sys
sys.path.append('.')

from backend.app.database.session import get_db_cursor

SQL_UPGRADE = """
-- Add registration_authority column to doctors if not exists
ALTER TABLE oh_id.doctors ADD COLUMN IF NOT EXISTS registration_authority VARCHAR(128);

-- =============================================================================
-- ENHANCED RESILIENT STORED PROCEDURES (oh_id schema)
-- =============================================================================

-- 1. Doctor Registration SP V2 (Resilient & Idempotent)
CREATE OR REPLACE PROCEDURE oh_id.sp_register_doctor_v2(
    p_hospital_id VARCHAR(64),
    p_name VARCHAR(128),
    p_email VARCHAR(128),
    p_phone VARCHAR(32),
    p_gender VARCHAR(16),
    p_specialty VARCHAR(128),
    p_qualification VARCHAR(128),
    p_registration_number VARCHAR(128),
    p_registration_authority VARCHAR(128),
    p_department_id VARCHAR(64),
    p_opd_counter_id VARCHAR(64),
    p_room_number VARCHAR(64),
    p_employment_type VARCHAR(64),
    p_actor_id VARCHAR(64),
    INOUT p_doctor_id VARCHAR(64) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id VARCHAR(64);
    v_username VARCHAR(64);
    v_new_doc_id VARCHAR(64);
    v_dept_id VARCHAR(64);
    v_clean_email VARCHAR(128);
    v_clean_phone VARCHAR(32);
BEGIN
    v_clean_email := NULLIF(TRIM(p_email), '');
    v_clean_phone := NULLIF(TRIM(p_phone), '');
    
    -- Generate base username
    v_username := 'dr.' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g'));
    IF v_username IS NULL OR v_username = 'dr.' THEN
        v_username := 'dr.user_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6);
    END IF;

    -- Validate or fallback department_id
    IF p_department_id IS NOT NULL AND p_department_id <> '' THEN
        SELECT id INTO v_dept_id FROM oh_id.departments WHERE id = p_department_id;
        IF v_dept_id IS NULL THEN
            SELECT id INTO v_dept_id FROM oh_id.departments WHERE hospital_id = p_hospital_id LIMIT 1;
        END IF;
    ELSE
        SELECT id INTO v_dept_id FROM oh_id.departments WHERE hospital_id = p_hospital_id LIMIT 1;
    END IF;

    -- 1. Find existing User by email, phone, or username
    SELECT id INTO v_user_id 
    FROM oh_id.users 
    WHERE (v_clean_email IS NOT NULL AND email = v_clean_email)
       OR (v_clean_phone IS NOT NULL AND phone = v_clean_phone)
       OR username = v_username
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Update existing user
        UPDATE oh_id.users 
        SET full_name = COALESCE(p_name, full_name),
            role = 'DOCTOR',
            hospital_id = COALESCE(p_hospital_id, hospital_id),
            hospital_ref_id = COALESCE(p_hospital_id, hospital_ref_id)
        WHERE id = v_user_id;
    ELSE
        -- Insert new User
        v_user_id := 'usr-' || SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8);
        -- Ensure username is unique if clash
        IF EXISTS (SELECT 1 FROM oh_id.users WHERE username = v_username) THEN
            v_username := v_username || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
        END IF;

        INSERT INTO oh_id.users (
            id, user_ref_id, username, email, phone, full_name, role, 
            hospital_id, hospital_ref_id, password_hash
        )
        VALUES (
            v_user_id, v_user_id, v_username, v_clean_email, v_clean_phone, p_name, 'DOCTOR', 
            p_hospital_id, p_hospital_id, '$2b$12$e8Y6l9bK8t/3w1uJ7vV7xedY6xHkO.7y7uP9d1l2m3n4o5p6q7r8s'
        );
    END IF;

    -- Map user_role
    INSERT INTO oh_id.user_roles (
        id, user_id, user_ref_id, role_id, usertype_ref_id, 
        hospital_id, hospital_ref_id, is_primary, is_active
    )
    VALUES (
        'ur-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8), 
        v_user_id, v_user_id, 'role-doctor', 'role-doctor', 
        p_hospital_id, p_hospital_id, TRUE, TRUE
    )
    ON CONFLICT DO NOTHING;

    -- 2. Find or Create Doctor Record
    SELECT id INTO p_doctor_id 
    FROM oh_id.doctors 
    WHERE hospital_id = p_hospital_id 
      AND (user_id = v_user_id OR registration_number = p_registration_number)
    LIMIT 1;

    IF p_doctor_id IS NOT NULL THEN
        UPDATE oh_id.doctors
        SET name = p_name,
            specialty = p_specialty,
            qualification = p_qualification,
            registration_number = p_registration_number,
            registration_authority = COALESCE(p_registration_authority, registration_authority),
            phone = v_clean_phone,
            email = v_clean_email,
            room_number = COALESCE(p_room_number, room_number, 'Room 101'),
            department_id = COALESCE(v_dept_id, department_id),
            is_available = TRUE
        WHERE id = p_doctor_id;
    ELSE
        v_new_doc_id := 'doc-' || SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8);
        INSERT INTO oh_id.doctors (
            id, user_id, hospital_id, name, specialty, qualification, 
            registration_number, registration_authority, phone, email, room_number, 
            department_id, is_available
        )
        VALUES (
            v_new_doc_id, v_user_id, p_hospital_id, p_name, p_specialty, p_qualification,
            p_registration_number, p_registration_authority, v_clean_phone, v_clean_email, 
            COALESCE(p_room_number, 'Room 101'), v_dept_id, TRUE
        )
        RETURNING id INTO p_doctor_id;
    END IF;

    -- 3. Update or Create Staff Roster entry
    IF NOT EXISTS (SELECT 1 FROM oh_id.hospital_staff_rosters WHERE hospital_id = p_hospital_id AND staff_id = p_doctor_id) THEN
        INSERT INTO oh_id.hospital_staff_rosters (
            hospital_id, staff_id, staff_type, staff_name, 
            department_id, room_number, opd_counter_id, on_duty_status
        )
        VALUES (
            p_hospital_id, p_doctor_id, 'DOCTOR', p_name,
            v_dept_id, COALESCE(p_room_number, 'Room 101'), p_opd_counter_id, 'ON_DUTY'
        );
    ELSE
        UPDATE oh_id.hospital_staff_rosters
        SET staff_name = p_name,
            department_id = COALESCE(v_dept_id, department_id),
            room_number = COALESCE(p_room_number, room_number, 'Room 101'),
            opd_counter_id = COALESCE(p_opd_counter_id, opd_counter_id),
            on_duty_status = 'ON_DUTY'
        WHERE hospital_id = p_hospital_id AND staff_id = p_doctor_id;
    END IF;

    -- 4. Audit Log
    INSERT INTO oh_id.audit_logs (id, actor_id, action, resource_type, resource_id, hospital_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8), 
        COALESCE(p_actor_id, 'hospadmin'), 
        'DOCTOR_REGISTER', 
        'DOCTOR', 
        p_doctor_id, 
        p_hospital_id, 
        jsonb_build_object('name', p_name, 'specialty', p_specialty, 'reg_no', p_registration_number, 'department_id', v_dept_id)
    );
END;
$$;


-- 2. Nurse Registration SP V2 (Resilient & Idempotent)
CREATE OR REPLACE PROCEDURE oh_id.sp_register_nurse_v2(
    p_hospital_id VARCHAR(64),
    p_name VARCHAR(128),
    p_email VARCHAR(128),
    p_phone VARCHAR(32),
    p_qualification VARCHAR(128),
    p_registration_number VARCHAR(128),
    p_department_id VARCHAR(64),
    p_ward VARCHAR(64),
    p_shift VARCHAR(32),
    p_actor_id VARCHAR(64),
    INOUT p_nurse_id VARCHAR(64) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id VARCHAR(64);
    v_username VARCHAR(64);
    v_clean_email VARCHAR(128);
    v_clean_phone VARCHAR(32);
    v_dept_id VARCHAR(64);
BEGIN
    v_clean_email := NULLIF(TRIM(p_email), '');
    v_clean_phone := NULLIF(TRIM(p_phone), '');
    
    v_username := 'nur.' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g'));
    IF v_username IS NULL OR v_username = 'nur.' THEN
        v_username := 'nur.user_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6);
    END IF;

    -- Validate or fallback department_id
    IF p_department_id IS NOT NULL AND p_department_id <> '' THEN
        SELECT id INTO v_dept_id FROM oh_id.departments WHERE id = p_department_id;
        IF v_dept_id IS NULL THEN
            SELECT id INTO v_dept_id FROM oh_id.departments WHERE hospital_id = p_hospital_id LIMIT 1;
        END IF;
    ELSE
        SELECT id INTO v_dept_id FROM oh_id.departments WHERE hospital_id = p_hospital_id LIMIT 1;
    END IF;

    -- 1. Find or Insert User
    SELECT id INTO v_user_id 
    FROM oh_id.users 
    WHERE (v_clean_email IS NOT NULL AND email = v_clean_email)
       OR (v_clean_phone IS NOT NULL AND phone = v_clean_phone)
       OR username = v_username
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        UPDATE oh_id.users 
        SET full_name = COALESCE(p_name, full_name),
            role = 'NURSE',
            hospital_id = COALESCE(p_hospital_id, hospital_id),
            hospital_ref_id = COALESCE(p_hospital_id, hospital_ref_id)
        WHERE id = v_user_id;
    ELSE
        v_user_id := 'usr-' || SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8);
        IF EXISTS (SELECT 1 FROM oh_id.users WHERE username = v_username) THEN
            v_username := v_username || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
        END IF;

        INSERT INTO oh_id.users (
            id, user_ref_id, username, email, phone, full_name, role, 
            hospital_id, hospital_ref_id, password_hash
        )
        VALUES (
            v_user_id, v_user_id, v_username, v_clean_email, v_clean_phone, p_name, 'NURSE', 
            p_hospital_id, p_hospital_id, '$2b$12$e8Y6l9bK8t/3w1uJ7vV7xedY6xHkO.7y7uP9d1l2m3n4o5p6q7r8s'
        );
    END IF;

    -- Map user_role
    INSERT INTO oh_id.user_roles (
        id, user_id, user_ref_id, role_id, usertype_ref_id, 
        hospital_id, hospital_ref_id, is_primary, is_active
    )
    VALUES (
        'ur-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8), 
        v_user_id, v_user_id, 'role-nurse', 'role-nurse', 
        p_hospital_id, p_hospital_id, TRUE, TRUE
    )
    ON CONFLICT DO NOTHING;

    p_nurse_id := v_user_id;

    -- 2. Staff Roster Entry
    IF NOT EXISTS (SELECT 1 FROM oh_id.hospital_staff_rosters WHERE hospital_id = p_hospital_id AND staff_id = p_nurse_id) THEN
        INSERT INTO oh_id.hospital_staff_rosters (
            hospital_id, staff_id, staff_type, staff_name, 
            department_id, room_number, shift, on_duty_status
        )
        VALUES (
            p_hospital_id, p_nurse_id, 'NURSE', p_name,
            v_dept_id, COALESCE(p_ward, 'OPD Triage Wing A'), COALESCE(p_shift, 'MORNING'), 'ON_DUTY'
        );
    ELSE
        UPDATE oh_id.hospital_staff_rosters
        SET staff_name = p_name,
            department_id = COALESCE(v_dept_id, department_id),
            room_number = COALESCE(p_ward, room_number, 'OPD Triage Wing A'),
            shift = COALESCE(p_shift, shift, 'MORNING'),
            on_duty_status = 'ON_DUTY'
        WHERE hospital_id = p_hospital_id AND staff_id = p_nurse_id;
    END IF;

    -- 3. Audit Log
    INSERT INTO oh_id.audit_logs (id, actor_id, action, resource_type, resource_id, hospital_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8), 
        COALESCE(p_actor_id, 'hospadmin'), 
        'NURSE_REGISTER', 
        'NURSE', 
        p_nurse_id, 
        p_hospital_id, 
        jsonb_build_object('name', p_name, 'ward', p_ward, 'reg_no', p_registration_number)
    );
END;
$$;


-- 3. Trainee Registration SP (Resilient & Idempotent)
CREATE OR REPLACE PROCEDURE oh_id.sp_register_trainee(
    p_hospital_id VARCHAR(64),
    p_name VARCHAR(128),
    p_email VARCHAR(128),
    p_phone VARCHAR(32),
    p_training_type VARCHAR(64),
    p_institution VARCHAR(256),
    p_qualification VARCHAR(128),
    p_department_id VARCHAR(64),
    p_supervisor_doctor_id VARCHAR(64),
    p_supervisor_name VARCHAR(128),
    p_start_date DATE,
    p_end_date DATE,
    p_actor_id VARCHAR(64),
    INOUT p_trainee_id VARCHAR(64) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id VARCHAR(64);
    v_username VARCHAR(64);
    v_clean_email VARCHAR(128);
    v_clean_phone VARCHAR(32);
    v_dept_id VARCHAR(64);
BEGIN
    v_clean_email := NULLIF(TRIM(p_email), '');
    v_clean_phone := NULLIF(TRIM(p_phone), '');
    
    v_username := 'trn.' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g'));
    IF v_username IS NULL OR v_username = 'trn.' THEN
        v_username := 'trn.user_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6);
    END IF;

    -- Validate or fallback department_id
    IF p_department_id IS NOT NULL AND p_department_id <> '' THEN
        SELECT id INTO v_dept_id FROM oh_id.departments WHERE id = p_department_id;
        IF v_dept_id IS NULL THEN
            SELECT id INTO v_dept_id FROM oh_id.departments WHERE hospital_id = p_hospital_id LIMIT 1;
        END IF;
    ELSE
        SELECT id INTO v_dept_id FROM oh_id.departments WHERE hospital_id = p_hospital_id LIMIT 1;
    END IF;

    -- 1. Find or Insert User
    SELECT id INTO v_user_id 
    FROM oh_id.users 
    WHERE (v_clean_email IS NOT NULL AND email = v_clean_email)
       OR (v_clean_phone IS NOT NULL AND phone = v_clean_phone)
       OR username = v_username
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        UPDATE oh_id.users 
        SET full_name = COALESCE(p_name, full_name),
            role = 'TRAINEE',
            hospital_id = COALESCE(p_hospital_id, hospital_id),
            hospital_ref_id = COALESCE(p_hospital_id, hospital_ref_id)
        WHERE id = v_user_id;
    ELSE
        v_user_id := 'usr-' || SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8);
        IF EXISTS (SELECT 1 FROM oh_id.users WHERE username = v_username) THEN
            v_username := v_username || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
        END IF;

        INSERT INTO oh_id.users (
            id, user_ref_id, username, email, phone, full_name, role, 
            hospital_id, hospital_ref_id, password_hash
        )
        VALUES (
            v_user_id, v_user_id, v_username, v_clean_email, v_clean_phone, p_name, 'TRAINEE', 
            p_hospital_id, p_hospital_id, '$2b$12$e8Y6l9bK8t/3w1uJ7vV7xedY6xHkO.7y7uP9d1l2m3n4o5p6q7r8s'
        );
    END IF;

    -- Also insert/update trainees table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'oh_id' AND table_name = 'trainees') THEN
        INSERT INTO oh_id.trainees (
            id, hospital_id, name, email, phone, training_type, institution,
            qualification, department_id, supervisor_doctor_id, supervisor_name,
            start_date, end_date, status, can_prescribe, can_refer
        )
        VALUES (
            v_user_id, p_hospital_id, p_name, v_clean_email, v_clean_phone, p_training_type, p_institution,
            p_qualification, v_dept_id, p_supervisor_doctor_id, p_supervisor_name,
            COALESCE(p_start_date, CURRENT_DATE), COALESCE(p_end_date, CURRENT_DATE + INTERVAL '12 months'),
            'ACTIVE', FALSE, FALSE
        )
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, qualification = EXCLUDED.qualification;
    END IF;

    p_trainee_id := v_user_id;

    -- 2. Staff Roster Entry
    IF NOT EXISTS (SELECT 1 FROM oh_id.hospital_staff_rosters WHERE hospital_id = p_hospital_id AND staff_id = p_trainee_id) THEN
        INSERT INTO oh_id.hospital_staff_rosters (
            hospital_id, staff_id, staff_type, staff_name, 
            department_id, room_number, shift, on_duty_status
        )
        VALUES (
            p_hospital_id, p_trainee_id, 'TRAINEE', p_name,
            v_dept_id, 'Ward 3B / Training Unit', 'DAY', 'ON_DUTY'
        );
    ELSE
        UPDATE oh_id.hospital_staff_rosters
        SET staff_name = p_name,
            department_id = COALESCE(v_dept_id, department_id),
            on_duty_status = 'ON_DUTY'
        WHERE hospital_id = p_hospital_id AND staff_id = p_trainee_id;
    END IF;

    -- 3. Audit Log
    INSERT INTO oh_id.audit_logs (id, actor_id, action, resource_type, resource_id, hospital_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8), 
        COALESCE(p_actor_id, 'hospadmin'), 
        'TRAINEE_REGISTER', 
        'TRAINEE', 
        p_trainee_id, 
        p_hospital_id, 
        jsonb_build_object('name', p_name, 'institution', p_institution, 'type', p_training_type)
    );
END;
$$;
"""

def apply_migration():
    print("Applying resilient SP upgrades to PostgreSQL...")
    with get_db_cursor() as cur:
        cur.execute(SQL_UPGRADE)
    print("Successfully upgraded sp_register_doctor_v2, sp_register_nurse_v2, and sp_register_trainee_v2!")

if __name__ == '__main__':
    apply_migration()
