"""
Migration: Hospital Administrator Workspace (Tables, Views, Stored Procedures, Seed Data)
Authoritative Enterprise Implementation for OneHealth ID (OH-ID) & Kedar Hospital.
"""

from backend.app.database.session import get_db_cursor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration.hospital_admin")

SQL_MIGRATION = """
BEGIN;

-- 1. OPD Counters Table
CREATE TABLE IF NOT EXISTS oh_id.opd_counters (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'ctr-' || substr(md5(random()::text), 1, 12),
    hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
    branch_id VARCHAR(64),
    department_id VARCHAR(64) REFERENCES oh_id.departments(id) ON DELETE SET NULL,
    counter_name VARCHAR(128) NOT NULL,
    counter_number VARCHAR(32) NOT NULL,
    location VARCHAR(128) DEFAULT 'Ground Floor - OPD Wing',
    token_prefix VARCHAR(16) NOT NULL DEFAULT 'OPD-',
    token_start INTEGER NOT NULL DEFAULT 1,
    daily_reset BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, MAINTENANCE
    assigned_doctor_id VARCHAR(64),
    assigned_staff_name VARCHAR(128),
    operating_hours VARCHAR(64) DEFAULT '08:00 AM - 02:00 PM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hospital_id, counter_number)
);

-- 2. Staff Rosters Table (Doctors, Nurses, Trainees Shift & Duty Roster)
CREATE TABLE IF NOT EXISTS oh_id.hospital_staff_rosters (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'rst-' || substr(md5(random()::text), 1, 12),
    hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
    branch_id VARCHAR(64),
    staff_id VARCHAR(64) NOT NULL,
    staff_type VARCHAR(32) NOT NULL DEFAULT 'DOCTOR', -- DOCTOR, NURSE, TRAINEE, EMPLOYEE
    staff_name VARCHAR(128) NOT NULL,
    department_id VARCHAR(64) REFERENCES oh_id.departments(id) ON DELETE SET NULL,
    department_name VARCHAR(128),
    shift VARCHAR(32) NOT NULL DEFAULT 'MORNING', -- MORNING, AFTERNOON, EVENING, NIGHT, FULL_DAY
    shift_timings VARCHAR(64) DEFAULT '08:30 AM - 01:30 PM',
    room_number VARCHAR(64) DEFAULT 'Room 101',
    opd_counter_id VARCHAR(64),
    on_duty_status VARCHAR(32) NOT NULL DEFAULT 'ON_DUTY', -- ON_DUTY, OFF_DUTY, ON_LEAVE, BREAK, EMERGENCY_DUTY
    roster_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    updated_by VARCHAR(64) DEFAULT 'hospadmin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Trainees Table (Medical & Nursing Trainees, Interns, Residents with restricted permissions)
CREATE TABLE IF NOT EXISTS oh_id.trainees (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'trn-' || substr(md5(random()::text), 1, 12),
    user_id VARCHAR(64) REFERENCES oh_id.users(id) ON DELETE SET NULL,
    hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
    branch_id VARCHAR(64),
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128),
    phone VARCHAR(32),
    photo_url TEXT,
    training_type VARCHAR(64) NOT NULL DEFAULT 'INTERN', -- MEDICAL_TRAINEE, NURSING_TRAINEE, INTERN, RESIDENT, POSTGRADUATE
    institution VARCHAR(256) NOT NULL DEFAULT 'Madras Medical College',
    qualification VARCHAR(128) DEFAULT 'MBBS (Intern)',
    department_id VARCHAR(64) REFERENCES oh_id.departments(id) ON DELETE SET NULL,
    supervisor_doctor_id VARCHAR(64),
    supervisor_name VARCHAR(128) DEFAULT 'Dr. Senthil Nathan',
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '3 months',
    end_date DATE DEFAULT CURRENT_DATE + INTERVAL '9 months',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, ON_LEAVE, SUSPENDED
    can_prescribe BOOLEAN NOT NULL DEFAULT FALSE, -- Trainees cannot independently sign prescriptions
    can_refer BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Hospital Services & Tariff Catalogue
CREATE TABLE IF NOT EXISTS oh_id.hospital_services (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'srv-' || substr(md5(random()::text), 1, 12),
    hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
    service_name VARCHAR(128) NOT NULL,
    service_code VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'CONSULTATION', -- CONSULTATION, INVESTIGATION, RADIOLOGY, PROCEDURE, VACCINATION, EMERGENCY
    department_id VARCHAR(64) REFERENCES oh_id.departments(id) ON DELETE SET NULL,
    duration_mins INTEGER NOT NULL DEFAULT 15,
    fee NUMERIC(10, 2) NOT NULL DEFAULT 350.00,
    appointment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    walkin_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    requires_referral BOOLEAN NOT NULL DEFAULT FALSE,
    requires_prep BOOLEAN NOT NULL DEFAULT FALSE,
    prep_instructions TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hospital_id, service_code)
);

-- 5. Hospital Facilities Table
CREATE TABLE IF NOT EXISTS oh_id.hospital_facilities (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'fac-' || substr(md5(random()::text), 1, 12),
    hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
    branch_id VARCHAR(64),
    facility_name VARCHAR(128) NOT NULL,
    facility_type VARCHAR(64) NOT NULL DEFAULT 'OPD', -- OPD, IPD, EMERGENCY, ICU, OT, PHARMACY, LABORATORY, RADIOLOGY, BLOOD_BANK, PHYSIOTHERAPY
    location VARCHAR(128) DEFAULT 'Block A, 1st Floor',
    operating_hours VARCHAR(64) DEFAULT '24x7 Emergency / 08:00 AM - 08:00 PM',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, MAINTENANCE, CLOSED
    contact_phone VARCHAR(32) DEFAULT '+91 98401 99000',
    head_of_facility VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Hospital Registration & Compliance Table
CREATE TABLE IF NOT EXISTS oh_id.hospital_compliance (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'cmp-' || substr(md5(random()::text), 1, 12),
    hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
    compliance_type VARCHAR(128) NOT NULL, -- CEA_REGISTRATION, MEDICAL_LICENSE, NABH_ACCREDITATION, NABL_LAB, PHARMACY_LICENSE, FIRE_SAFETY, BIO_MEDICAL_WASTE
    title VARCHAR(256) NOT NULL,
    registration_number VARCHAR(128) NOT NULL,
    issuing_authority VARCHAR(256) NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE - INTERVAL '1 year',
    expiry_date DATE NOT NULL DEFAULT CURRENT_DATE + INTERVAL '2 years',
    status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED', -- VERIFIED, UNDER_REVIEW, EXPIRED, PENDING_RENEWAL
    document_url TEXT,
    verified_by VARCHAR(128) DEFAULT 'State Health Authority',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Staff Invitations Table
CREATE TABLE IF NOT EXISTS oh_id.staff_invitations (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'inv-' || substr(md5(random()::text), 1, 12),
    hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
    branch_id VARCHAR(64),
    full_name VARCHAR(128) NOT NULL,
    email VARCHAR(128) NOT NULL,
    mobile VARCHAR(32) NOT NULL,
    role_code VARCHAR(64) NOT NULL DEFAULT 'DOCTOR',
    department_id VARCHAR(64) REFERENCES oh_id.departments(id) ON DELETE SET NULL,
    employment_type VARCHAR(64) DEFAULT 'FULL_TIME',
    invitation_token VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'INVITED', -- INVITED, ACCEPTED, EXPIRED, CANCELLED
    invited_by VARCHAR(64) DEFAULT 'hospadmin',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Patient Clinical Record Access Logs Table (Strict Healthcare Privacy Tracking)
CREATE TABLE IF NOT EXISTS oh_id.patient_access_logs (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'pal-' || substr(md5(random()::text), 1, 12),
    hospital_id VARCHAR(64) NOT NULL,
    patient_id VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(128) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    action_type VARCHAR(64) NOT NULL, -- DEMOGRAPHIC_VIEW, APPOINTMENT_VIEW, CLINICAL_VIEW, PRESCRIPTION_VIEW, LAB_VIEW, AUDIT_INSPECT
    resource_accessed VARCHAR(128),
    ip_address VARCHAR(64) DEFAULT '127.0.0.1',
    access_reason VARCHAR(256) DEFAULT 'Routine Outpatient Consultation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- VIEWS (READ LAYER)
-- =============================================================================

-- View: OPD Counters
CREATE OR REPLACE VIEW oh_id.vw_hospital_opd_counters AS
SELECT 
    c.id,
    c.hospital_id,
    h.name AS hospital_name,
    c.branch_id,
    c.department_id,
    d.name AS department_name,
    c.counter_name,
    c.counter_number,
    c.location,
    c.token_prefix,
    c.token_start,
    c.daily_reset,
    c.status,
    c.assigned_doctor_id,
    c.assigned_staff_name,
    c.operating_hours,
    c.created_at,
    c.updated_at
FROM oh_id.opd_counters c
JOIN oh_id.hospitals h ON c.hospital_id = h.id
LEFT JOIN oh_id.departments d ON c.department_id = d.id;

-- View: Staff Rosters
CREATE OR REPLACE VIEW oh_id.vw_hospital_staff_rosters AS
SELECT 
    r.id,
    r.hospital_id,
    h.name AS hospital_name,
    r.branch_id,
    r.staff_id,
    r.staff_type,
    r.staff_name,
    r.department_id,
    r.department_name,
    r.shift,
    r.shift_timings,
    r.room_number,
    r.opd_counter_id,
    c.counter_name,
    c.token_prefix,
    r.on_duty_status,
    r.roster_date,
    r.notes,
    r.updated_by,
    r.created_at,
    r.updated_at
FROM oh_id.hospital_staff_rosters r
JOIN oh_id.hospitals h ON r.hospital_id = h.id
LEFT JOIN oh_id.opd_counters c ON r.opd_counter_id = c.id;

-- View: Trainees
CREATE OR REPLACE VIEW oh_id.vw_hospital_trainees AS
SELECT 
    t.id,
    t.user_id,
    t.hospital_id,
    h.name AS hospital_name,
    t.branch_id,
    t.name,
    t.email,
    t.phone,
    t.photo_url,
    t.training_type,
    t.institution,
    t.qualification,
    t.department_id,
    d.name AS department_name,
    t.supervisor_doctor_id,
    t.supervisor_name,
    t.start_date,
    t.end_date,
    t.status,
    t.can_prescribe,
    t.can_refer,
    t.created_at,
    t.updated_at
FROM oh_id.trainees t
JOIN oh_id.hospitals h ON t.hospital_id = h.id
LEFT JOIN oh_id.departments d ON t.department_id = d.id;

-- View: Hospital Services
CREATE OR REPLACE VIEW oh_id.vw_hospital_services AS
SELECT 
    s.id,
    s.hospital_id,
    h.name AS hospital_name,
    s.service_name,
    s.service_code,
    s.category,
    s.department_id,
    d.name AS department_name,
    s.duration_mins,
    s.fee,
    s.appointment_enabled,
    s.walkin_enabled,
    s.requires_referral,
    s.requires_prep,
    s.prep_instructions,
    s.status,
    s.created_at,
    s.updated_at
FROM oh_id.hospital_services s
JOIN oh_id.hospitals h ON s.hospital_id = h.id
LEFT JOIN oh_id.departments d ON s.department_id = d.id;

-- View: Hospital Facilities
CREATE OR REPLACE VIEW oh_id.vw_hospital_facilities AS
SELECT 
    f.id,
    f.hospital_id,
    h.name AS hospital_name,
    f.branch_id,
    f.facility_name,
    f.facility_type,
    f.location,
    f.operating_hours,
    f.status,
    f.contact_phone,
    f.head_of_facility,
    f.created_at,
    f.updated_at
FROM oh_id.hospital_facilities f
JOIN oh_id.hospitals h ON f.hospital_id = h.id;

-- View: Hospital Compliance
CREATE OR REPLACE VIEW oh_id.vw_hospital_compliance AS
SELECT 
    c.id,
    c.hospital_id,
    h.name AS hospital_name,
    c.compliance_type,
    c.title,
    c.registration_number,
    c.issuing_authority,
    c.issue_date,
    c.expiry_date,
    c.status,
    c.document_url,
    c.verified_by,
    c.created_at,
    c.updated_at
FROM oh_id.hospital_compliance c
JOIN oh_id.hospitals h ON c.hospital_id = h.id;

-- View: Staff Invitations
CREATE OR REPLACE VIEW oh_id.vw_hospital_staff_invitations AS
SELECT 
    i.id,
    i.hospital_id,
    h.name AS hospital_name,
    i.branch_id,
    i.full_name,
    i.email,
    i.mobile,
    i.role_code,
    i.department_id,
    d.name AS department_name,
    i.employment_type,
    i.invitation_token,
    i.status,
    i.invited_by,
    i.expires_at,
    i.created_at,
    i.updated_at
FROM oh_id.staff_invitations i
JOIN oh_id.hospitals h ON i.hospital_id = h.id
LEFT JOIN oh_id.departments d ON i.department_id = d.id;

-- View: Patient Access Logs
CREATE OR REPLACE VIEW oh_id.vw_patient_access_logs AS
SELECT 
    l.id,
    l.hospital_id,
    l.patient_id,
    p.name AS patient_name,
    p.onehealth_id,
    l.actor_id,
    l.actor_name,
    l.actor_role,
    l.action_type,
    l.resource_accessed,
    l.ip_address,
    l.access_reason,
    l.created_at
FROM oh_id.patient_access_logs l
LEFT JOIN oh_id.patients p ON l.patient_id = p.id;

-- View: Hospital Operational Metrics
CREATE OR REPLACE VIEW oh_id.vw_hospital_operational_metrics AS
SELECT
    h.id AS hospital_id,
    h.name AS hospital_name,
    (SELECT COUNT(*) FROM oh_id.patients WHERE hospital_id = h.id) AS total_registered_patients,
    (SELECT COUNT(*) FROM oh_id.appointments WHERE hospital_id = h.id AND DATE(created_at) = CURRENT_DATE) AS today_appointments,
    (SELECT COUNT(*) FROM oh_id.appointments WHERE hospital_id = h.id AND DATE(created_at) = CURRENT_DATE AND status IN ('CHECKED_IN', 'checked_in', 'WAITING', 'waiting')) AS checked_in_count,
    (SELECT COUNT(*) FROM oh_id.appointments WHERE hospital_id = h.id AND DATE(created_at) = CURRENT_DATE AND status IN ('COMPLETED', 'completed')) AS completed_visits,
    (SELECT COUNT(*) FROM oh_id.queue_entries WHERE hospital_id = h.id AND status = 'WAITING') AS waiting_queue_count,
    (SELECT COUNT(*) FROM oh_id.hospital_staff_rosters WHERE hospital_id = h.id AND staff_type = 'DOCTOR' AND on_duty_status = 'ON_DUTY') AS doctors_on_duty,
    (SELECT COUNT(*) FROM oh_id.hospital_staff_rosters WHERE hospital_id = h.id AND staff_type = 'NURSE' AND on_duty_status = 'ON_DUTY') AS nurses_on_duty,
    (SELECT COUNT(*) FROM oh_id.trainees WHERE hospital_id = h.id AND status = 'ACTIVE') AS active_trainees,
    (SELECT COUNT(*) FROM oh_id.departments WHERE hospital_id = h.id) AS department_count,
    (SELECT COUNT(*) FROM oh_id.opd_counters WHERE hospital_id = h.id AND status = 'ACTIVE') AS active_opd_counters,
    (SELECT COUNT(*) FROM oh_id.queue_entries WHERE hospital_id = h.id AND status IN ('WAITING', 'IN_CONSULTATION', 'CALLING')) AS active_queue_tokens,
    17 AS pending_tasks
FROM oh_id.hospitals h;

-- =============================================================================
-- STORED PROCEDURES (MUTATION LAYER)
-- =============================================================================

-- SP: Register Doctor V2
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
BEGIN
    v_username := 'dr.' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g'));
    v_user_id := 'usr-' || SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8);
    v_new_doc_id := 'doc-' || SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8);
    
    -- Validate or fallback department_id
    IF p_department_id IS NOT NULL THEN
        SELECT id INTO v_dept_id FROM oh_id.departments WHERE id = p_department_id;
        IF v_dept_id IS NULL THEN
            SELECT id INTO v_dept_id FROM oh_id.departments WHERE hospital_id = p_hospital_id LIMIT 1;
        END IF;
    ELSE
        SELECT id INTO v_dept_id FROM oh_id.departments WHERE hospital_id = p_hospital_id LIMIT 1;
    END IF;

    -- 1. Create or find User Account
    INSERT INTO oh_id.users (id, user_ref_id, username, email, phone, full_name, role, hospital_id, hospital_ref_id, password_hash)
    VALUES (v_user_id, v_user_id, v_username, p_email, p_phone, p_name, 'DOCTOR', p_hospital_id, p_hospital_id, '$2b$12$e8Y6l9bK8t/3w1uJ7vV7xedY6xHkO.7y7uP9d1l2m3n4o5p6q7r8s')
    ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id INTO v_user_id;

    -- Map user_role
    INSERT INTO oh_id.user_roles (id, user_id, user_ref_id, role_id, usertype_ref_id, hospital_id, hospital_ref_id, is_primary, is_active)
    VALUES ('ur-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8), v_user_id, v_user_id, 'role-doctor', 'role-doctor', p_hospital_id, p_hospital_id, TRUE, TRUE)
    ON CONFLICT DO NOTHING;

    -- 2. Create or update Doctor record
    INSERT INTO oh_id.doctors (
        id, user_id, hospital_id, name, specialty, qualification, 
        registration_number, phone, email, room_number, 
        department_id, is_available
    )
    VALUES (
        v_new_doc_id, v_user_id, p_hospital_id, p_name, p_specialty, p_qualification,
        p_registration_number, p_phone, p_email, COALESCE(p_room_number, 'Room 101'),
        v_dept_id, TRUE
    )
    RETURNING id INTO p_doctor_id;

    -- 3. Create initial On-Duty Roster entry
    INSERT INTO oh_id.hospital_staff_rosters (
        hospital_id, staff_id, staff_type, staff_name, 
        department_id, room_number, opd_counter_id, on_duty_status
    )
    VALUES (
        p_hospital_id, p_doctor_id, 'DOCTOR', p_name,
        v_dept_id, COALESCE(p_room_number, 'Room 101'), p_opd_counter_id, 'ON_DUTY'
    );

    -- 4. Audit Log
    INSERT INTO oh_id.audit_logs (id, actor_id, action, resource_type, resource_id, hospital_id, details)
    VALUES ('aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8), p_actor_id, 'DOCTOR_REGISTER', 'DOCTOR', p_doctor_id, p_hospital_id, 
            jsonb_build_object('name', p_name, 'specialty', p_specialty, 'reg_no', p_registration_number, 'department_id', v_dept_id));
END;
$$;

-- SP: Register Nurse V2
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
BEGIN
    v_username := 'nurse.' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g'));
    v_user_id := 'usr-' || SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8);
    p_nurse_id := 'nur-' || substr(md5(random()::text), 1, 10);

    INSERT INTO oh_id.users (id, user_ref_id, username, email, phone, full_name, role, hospital_id, hospital_ref_id, password_hash)
    VALUES (v_user_id, v_user_id, v_username, p_email, p_phone, p_name, 'NURSE', p_hospital_id, p_hospital_id, '$2b$12$e8Y6l9bK8t/3w1uJ7vV7xedY6xHkO.7y7uP9d1l2m3n4o5p6q7r8s')
    ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id INTO v_user_id;

    -- Add to Roster
    INSERT INTO oh_id.hospital_staff_rosters (
        hospital_id, staff_id, staff_type, staff_name, 
        department_id, shift, room_number, on_duty_status
    )
    VALUES (
        p_hospital_id, p_nurse_id, 'NURSE', p_name,
        p_department_id, COALESCE(p_shift, 'MORNING'), COALESCE(p_ward, 'OPD Triage Wing A'), 'ON_DUTY'
    );

    -- Audit Log
    INSERT INTO oh_id.audit_logs (id, actor_id, action, resource_type, resource_id, hospital_id, details)
    VALUES ('aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8), p_actor_id, 'NURSE_REGISTER', 'NURSE', p_nurse_id, p_hospital_id, 
            jsonb_build_object('name', p_name, 'reg_no', p_registration_number, 'ward', p_ward, 'shift', p_shift));
END;
$$;

-- SP: Register Trainee
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
BEGIN
    INSERT INTO oh_id.trainees (
        hospital_id, name, email, phone, training_type, institution,
        qualification, department_id, supervisor_doctor_id, supervisor_name,
        start_date, end_date, status, can_prescribe, can_refer
    )
    VALUES (
        p_hospital_id, p_name, p_email, p_phone, p_training_type, p_institution,
        p_qualification, p_department_id, p_supervisor_doctor_id, p_supervisor_name,
        COALESCE(p_start_date, CURRENT_DATE), COALESCE(p_end_date, CURRENT_DATE + INTERVAL '12 months'),
        'ACTIVE', FALSE, FALSE -- Trainees are guardrailed
    )
    RETURNING id INTO p_trainee_id;

    -- Add to Roster
    INSERT INTO oh_id.hospital_staff_rosters (
        hospital_id, staff_id, staff_type, staff_name, 
        department_id, shift, on_duty_status
    )
    VALUES (
        p_hospital_id, p_trainee_id, 'TRAINEE', p_name,
        p_department_id, 'MORNING', 'ON_DUTY'
    );

    -- Audit Log
    INSERT INTO oh_id.audit_logs (actor_id, action, entity, entity_id, hospital_id, details)
    VALUES (p_actor_id, 'TRAINEE_REGISTER', 'TRAINEE', p_trainee_id, p_hospital_id, 
            jsonb_build_object('name', p_name, 'training_type', p_training_type, 'institution', p_institution, 'supervisor', p_supervisor_name));
END;
$$;

-- SP: Upsert OPD Counter
CREATE OR REPLACE PROCEDURE oh_id.sp_upsert_opd_counter(
    p_hospital_id VARCHAR(64),
    p_counter_name VARCHAR(128),
    p_counter_number VARCHAR(32),
    p_department_id VARCHAR(64),
    p_location VARCHAR(128),
    p_token_prefix VARCHAR(16),
    p_token_start INTEGER,
    p_status VARCHAR(32),
    p_assigned_doctor_id VARCHAR(64),
    p_operating_hours VARCHAR(64),
    p_actor_id VARCHAR(64),
    INOUT p_counter_id VARCHAR(64) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_counter_id IS NOT NULL AND EXISTS(SELECT 1 FROM oh_id.opd_counters WHERE id = p_counter_id) THEN
        UPDATE oh_id.opd_counters
        SET counter_name = p_counter_name,
            counter_number = p_counter_number,
            department_id = p_department_id,
            location = p_location,
            token_prefix = p_token_prefix,
            token_start = p_token_start,
            status = p_status,
            assigned_doctor_id = p_assigned_doctor_id,
            operating_hours = p_operating_hours,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_counter_id;
    ELSE
        INSERT INTO oh_id.opd_counters (
            hospital_id, counter_name, counter_number, department_id,
            location, token_prefix, token_start, status,
            assigned_doctor_id, operating_hours
        )
        VALUES (
            p_hospital_id, p_counter_name, p_counter_number, p_department_id,
            p_location, p_token_prefix, p_token_start, p_status,
            p_assigned_doctor_id, p_operating_hours
        )
        RETURNING id INTO p_counter_id;
    END IF;

    -- Audit Log
    INSERT INTO oh_id.audit_logs (actor_id, action, entity, entity_id, hospital_id, details)
    VALUES (p_actor_id, 'OPD_COUNTER_UPSERT', 'OPD_COUNTER', p_counter_id, p_hospital_id, 
            jsonb_build_object('counter_name', p_counter_name, 'counter_number', p_counter_number, 'token_prefix', p_token_prefix, 'status', p_status));
END;
$$;

-- SP: Update Staff Roster Status
CREATE OR REPLACE PROCEDURE oh_id.sp_update_staff_roster(
    p_roster_id VARCHAR(64),
    p_on_duty_status VARCHAR(32),
    p_shift VARCHAR(32),
    p_room_number VARCHAR(64),
    p_opd_counter_id VARCHAR(64),
    p_actor_id VARCHAR(64)
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE oh_id.hospital_staff_rosters
    SET on_duty_status = COALESCE(p_on_duty_status, on_duty_status),
        shift = COALESCE(p_shift, shift),
        room_number = COALESCE(p_room_number, room_number),
        opd_counter_id = COALESCE(p_opd_counter_id, opd_counter_id),
        updated_by = p_actor_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_roster_id;

    -- Audit Log
    INSERT INTO oh_id.audit_logs (actor_id, action, entity, entity_id, hospital_id, details)
    VALUES (p_actor_id, 'STAFF_ROSTER_UPDATE', 'STAFF_ROSTER', p_roster_id, 'hosp-kedar', 
            jsonb_build_object('on_duty_status', p_on_duty_status, 'shift', p_shift, 'room', p_room_number));
END;
$$;

-- SP: Upsert Hospital Service
CREATE OR REPLACE PROCEDURE oh_id.sp_upsert_hospital_service(
    p_hospital_id VARCHAR(64),
    p_service_name VARCHAR(128),
    p_service_code VARCHAR(32),
    p_category VARCHAR(64),
    p_department_id VARCHAR(64),
    p_duration_mins INTEGER,
    p_fee NUMERIC(10, 2),
    p_status VARCHAR(32),
    p_actor_id VARCHAR(64),
    INOUT p_service_id VARCHAR(64) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_service_id IS NOT NULL AND EXISTS(SELECT 1 FROM oh_id.hospital_services WHERE id = p_service_id) THEN
        UPDATE oh_id.hospital_services
        SET service_name = p_service_name,
            service_code = p_service_code,
            category = p_category,
            department_id = p_department_id,
            duration_mins = p_duration_mins,
            fee = p_fee,
            status = p_status,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_service_id;
    ELSE
        INSERT INTO oh_id.hospital_services (
            hospital_id, service_name, service_code, category,
            department_id, duration_mins, fee, status
        )
        VALUES (
            p_hospital_id, p_service_name, p_service_code, p_category,
            p_department_id, p_duration_mins, p_fee, p_status
        )
        RETURNING id INTO p_service_id;
    END IF;

    -- Audit Log
    INSERT INTO oh_id.audit_logs (actor_id, action, entity, entity_id, hospital_id, details)
    VALUES (p_actor_id, 'HOSPITAL_SERVICE_UPSERT', 'SERVICE', p_service_id, p_hospital_id, 
            jsonb_build_object('service_name', p_service_name, 'service_code', p_service_code, 'fee', p_fee));
END;
$$;

-- SP: Log Patient Record Access
CREATE OR REPLACE PROCEDURE oh_id.sp_log_patient_record_access(
    p_hospital_id VARCHAR(64),
    p_patient_id VARCHAR(64),
    p_actor_id VARCHAR(64),
    p_actor_name VARCHAR(128),
    p_actor_role VARCHAR(64),
    p_action_type VARCHAR(64),
    p_resource_accessed VARCHAR(128),
    p_access_reason VARCHAR(256)
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO oh_id.patient_access_logs (
        hospital_id, patient_id, actor_id, actor_name, 
        actor_role, action_type, resource_accessed, access_reason
    )
    VALUES (
        p_hospital_id, p_patient_id, p_actor_id, p_actor_name,
        p_actor_role, p_action_type, p_resource_accessed, p_access_reason
    );
END;
$$;

-- =============================================================================
-- SEED DATA FOR KEDAR HOSPITAL & PILOT DEMO
-- =============================================================================

-- Seed OPD Counters
INSERT INTO oh_id.opd_counters (id, hospital_id, counter_name, counter_number, location, token_prefix, token_start, status, operating_hours)
VALUES 
('ctr-kedar-01', 'hosp-kedar', 'Counter 1 - General OPD', 'CTR-01', 'Ground Floor Wing A', 'GM-', 1, 'ACTIVE', '08:00 AM - 02:00 PM'),
('ctr-kedar-02', 'hosp-kedar', 'Counter 2 - Pediatrics', 'CTR-02', 'Ground Floor Wing B', 'PED-', 1, 'ACTIVE', '08:30 AM - 01:30 PM'),
('ctr-kedar-03', 'hosp-kedar', 'Counter 3 - Orthopedics', 'CTR-03', '1st Floor Wing A', 'ORTH-', 1, 'ACTIVE', '09:00 AM - 04:00 PM'),
('ctr-kedar-04', 'hosp-kedar', 'Counter 4 - Cardiology', 'CTR-04', '2nd Floor Cardiac Wing', 'CARD-', 1, 'ACTIVE', '09:00 AM - 01:00 PM'),
('ctr-kedar-05', 'hosp-kedar', 'Counter 5 - Dental Care', 'CTR-05', '1st Floor Dental Suite', 'DENT-', 1, 'ACTIVE', '09:00 AM - 05:00 PM'),
('ctr-kedar-06', 'hosp-kedar', 'Counter 6 - Emergency Triage', 'CTR-06', 'Emergency Ground Floor', 'EMG-', 1, 'ACTIVE', '24x7 Hours')
ON CONFLICT (id) DO NOTHING;

-- Seed Staff Rosters
INSERT INTO oh_id.hospital_staff_rosters (id, hospital_id, staff_id, staff_type, staff_name, department_name, shift, room_number, opd_counter_id, on_duty_status)
VALUES 
('rst-kedar-01', 'hosp-kedar', 'doc-k-01', 'DOCTOR', 'Dr. Senthil Nathan', 'General Medicine & Diabetology', 'MORNING', 'Room 101', 'ctr-kedar-01', 'ON_DUTY'),
('rst-kedar-02', 'hosp-kedar', 'doc-k-02', 'DOCTOR', 'Dr. Anitha Ramanathan', 'Cardiology & Intensive Care', 'MORNING', 'Room 204', 'ctr-kedar-04', 'ON_DUTY'),
('rst-kedar-03', 'hosp-kedar', 'doc-k-kumar', 'DOCTOR', 'Dr. Rajesh Kumar', 'Orthopedics & Trauma', 'MORNING', 'Room 105', 'ctr-kedar-03', 'ON_DUTY'),
('rst-kedar-04', 'hosp-kedar', 'doc-k-04', 'DOCTOR', 'Dr. Priya Sundaram', 'Pediatrics & Neonatology', 'MORNING', 'Room 102', 'ctr-kedar-02', 'ON_DUTY'),
('rst-kedar-05', 'hosp-kedar', 'doc-k-05', 'DOCTOR', 'Dr. Vikram Seth', 'Dermatology & Cosmetology', 'AFTERNOON', 'Room 201', 'ctr-kedar-01', 'BREAK'),
('rst-kedar-06', 'hosp-kedar', 'doc-k-06', 'DOCTOR', 'Dr. Meenakshi Sundaram', 'Dental & Maxillofacial', 'MORNING', 'Dental Suite 1', 'ctr-kedar-05', 'ON_DUTY'),
('rst-kedar-07', 'hosp-kedar', 'nur-k-01', 'NURSE', 'Nurse Saravanan / Triage Incharge', 'General Medicine & OPD', 'MORNING', 'OPD Triage Wing A', 'ctr-kedar-01', 'ON_DUTY'),
('rst-kedar-08', 'hosp-kedar', 'nur-k-02', 'NURSE', 'Staff Nurse Revathi', 'Cardiology & ICU', 'MORNING', 'Cardiac Triage', 'ctr-kedar-04', 'ON_DUTY'),
('rst-kedar-09', 'hosp-kedar', 'nur-k-03', 'NURSE', 'Staff Nurse Kanimozhi', 'Emergency Wing', 'NIGHT', 'Emergency Trauma Bay', 'ctr-kedar-06', 'ON_DUTY')
ON CONFLICT (id) DO NOTHING;

-- Seed Trainees
INSERT INTO oh_id.trainees (id, hospital_id, name, email, phone, training_type, institution, qualification, department_id, supervisor_name, status)
VALUES 
('trn-k-01', 'hosp-kedar', 'Dr. Karthik Raja (Intern)', 'karthik.intern@kedar.in', '+91 98401 11001', 'INTERN', 'Madras Medical College', 'MBBS (CRRI)', 'dept-k-01', 'Dr. Senthil Nathan', 'ACTIVE'),
('trn-k-02', 'hosp-kedar', 'Dr. Swetha Balan (Resident)', 'swetha.resident@kedar.in', '+91 98401 11002', 'RESIDENT', 'Stanley Medical College', 'MD General Medicine (JR)', 'dept-k-01', 'Dr. Senthil Nathan', 'ACTIVE'),
('trn-k-03', 'hosp-kedar', 'Trainee Nurse Divya', 'divya.nurse@kedar.in', '+91 98401 11003', 'NURSING_TRAINEE', 'Apollo College of Nursing', 'B.Sc Nursing (Final Year)', 'dept-k-02', 'Nurse Saravanan', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Seed Hospital Services Catalogue
INSERT INTO oh_id.hospital_services (id, hospital_id, service_name, service_code, category, duration_mins, fee, status)
VALUES 
('srv-k-01', 'hosp-kedar', 'General Physician Consultation', 'OPD-GEN', 'CONSULTATION', 15, 350.00, 'ACTIVE'),
('srv-k-02', 'hosp-kedar', 'Senior Specialist Consultation', 'OPD-SPEC', 'CONSULTATION', 20, 600.00, 'ACTIVE'),
('srv-k-03', 'hosp-kedar', 'Follow-up Consultation (within 7 days)', 'OPD-FOL', 'CONSULTATION', 10, 150.00, 'ACTIVE'),
('srv-k-04', 'hosp-kedar', '12-Lead Electrocardiogram (ECG)', 'DIAG-ECG', 'INVESTIGATION', 15, 250.00, 'ACTIVE'),
('srv-k-05', 'hosp-kedar', 'Comprehensive Lipid Profile', 'LAB-LIPID', 'INVESTIGATION', 10, 450.00, 'ACTIVE'),
('srv-k-06', 'hosp-kedar', 'HbA1c Glycated Hemoglobin', 'LAB-HBA1C', 'INVESTIGATION', 5, 400.00, 'ACTIVE'),
('srv-k-07', 'hosp-kedar', 'Digital Chest X-Ray (PA View)', 'RAD-XRAY', 'RADIOLOGY', 15, 500.00, 'ACTIVE'),
('srv-k-08', 'hosp-kedar', 'Echocardiogram 2D Echo', 'DIAG-ECHO', 'INVESTIGATION', 30, 1500.00, 'ACTIVE'),
('srv-k-09', 'hosp-kedar', 'Minor Wound Dressing & Suture Care', 'PROC-DRESS', 'PROCEDURE', 20, 200.00, 'ACTIVE'),
('srv-k-10', 'hosp-kedar', 'Emergency Trauma Assessment', 'EMG-EVAL', 'EMERGENCY', 30, 800.00, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Seed Hospital Facilities
INSERT INTO oh_id.hospital_facilities (id, hospital_id, facility_name, facility_type, location, operating_hours, status, contact_phone, head_of_facility)
VALUES 
('fac-k-01', 'hosp-kedar', 'Outpatient Department (OPD)', 'OPD', 'Ground & 1st Floor', '08:00 AM - 08:00 PM', 'ACTIVE', '+91 98401 99001', 'Dr. Senthil Nathan'),
('fac-k-02', 'hosp-kedar', 'Inpatient Department (IPD)', 'IPD', '2nd & 3rd Floor', '24x7 Hours', 'ACTIVE', '+91 98401 99002', 'Dr. Anitha Ramanathan'),
('fac-k-03', 'hosp-kedar', '24x7 Emergency & Trauma Unit', 'EMERGENCY', 'Ground Floor Emergency Bay', '24x7 Hours', 'ACTIVE', '+91 98401 99000', 'Dr. Rajesh Kumar'),
('fac-k-04', 'hosp-kedar', 'Intensive Coronary Care Unit (ICCU)', 'ICU', '3rd Floor Critical Wing', '24x7 Hours', 'ACTIVE', '+91 98401 99003', 'Dr. Anitha Ramanathan'),
('fac-k-05', 'hosp-kedar', 'Modular Operation Theatres (OT 1 & 2)', 'OT', '4th Floor Surgical Suite', '07:00 AM - 07:00 PM & Emergency', 'ACTIVE', '+91 98401 99004', 'Dr. Rajesh Kumar'),
('fac-k-06', 'hosp-kedar', 'NABL Accredited Clinical Laboratory', 'LABORATORY', 'Basement Wing B', '24x7 Hours', 'ACTIVE', '+91 98401 99005', 'Dr. V. Ramanathan'),
('fac-k-07', 'hosp-kedar', '24x7 Hospital Pharmacy', 'PHARMACY', 'Ground Floor Main Atrium', '24x7 Hours', 'ACTIVE', '+91 98401 99006', 'Pharm. S. Manikandan'),
('fac-k-08', 'hosp-kedar', 'Digital Radiology & Ultrasound', 'RADIOLOGY', 'Basement Wing A', '08:00 AM - 08:00 PM', 'ACTIVE', '+91 98401 99007', 'Dr. K. Jayanthi')
ON CONFLICT (id) DO NOTHING;

-- Seed Hospital Compliance & CEA Registration
INSERT INTO oh_id.hospital_compliance (id, hospital_id, compliance_type, title, registration_number, issuing_authority, issue_date, expiry_date, status, verified_by)
VALUES 
('cmp-k-01', 'hosp-kedar', 'CEA_REGISTRATION', 'Clinical Establishments Act Registration', 'TN-CEA-CHE-2024-88912', 'Directorate of Medical and Rural Health Services (DMS Tamil Nadu)', '2024-01-15', '2029-01-14', 'VERIFIED', 'DMS Chennai'),
('cmp-k-02', 'hosp-kedar', 'NABH_ACCREDITATION', 'NABH Pre-Accreditation Entry Level', 'NABH-PE-2025-0982', 'National Accreditation Board for Hospitals & Healthcare Providers', '2025-06-01', '2027-05-31', 'VERIFIED', 'NABH Quality Council of India'),
('cmp-k-03', 'hosp-kedar', 'PHARMACY_LICENSE', 'Form 20 / 21 Retail Drug License', 'TN-DRUG-CHE-44512-R', 'Drugs Control Department, Tamil Nadu', '2023-04-10', '2028-04-09', 'VERIFIED', 'Drug Inspectorate South Chennai'),
('cmp-k-04', 'hosp-kedar', 'BIO_MEDICAL_WASTE', 'Bio-Medical Waste Authorization', 'TNPCB-BMW-AUTH-2024-551', 'Tamil Nadu Pollution Control Board', '2024-03-01', '2027-02-28', 'VERIFIED', 'TNPCB South'),
('cmp-k-05', 'hosp-kedar', 'FIRE_SAFETY', 'NOC for Fire Prevention and Life Safety', 'TN-FIRE-NOC-2025-1102', 'Tamil Nadu Fire and Rescue Services', '2025-02-15', '2027-02-14', 'VERIFIED', 'TNFRS Division 4')
ON CONFLICT (id) DO NOTHING;

-- Seed Patient Access Logs
INSERT INTO oh_id.patient_access_logs (hospital_id, patient_id, actor_id, actor_name, actor_role, action_type, resource_accessed, access_reason)
VALUES 
('hosp-kedar', 'pat-001', 'usr-hosp-admin', 'Hospital Administrator', 'HOSPITAL_ADMIN', 'DEMOGRAPHIC_VIEW', 'Patient Registration & Identity Card', 'Routine Hospital Administrative Audit'),
('hosp-kedar', 'pat-002', 'usr-kedar-doc1', 'Dr. Senthil Nathan', 'DOCTOR', 'CLINICAL_VIEW', 'Clinical Encounter & Vitals', 'Scheduled OPD Consultation'),
('hosp-kedar', 'pat-003', 'usr-kedar-nurse', 'Nurse Saravanan', 'NURSE', 'DEMOGRAPHIC_VIEW', 'Triage Queue Check-in', 'Patient Vitals Measurement')
ON CONFLICT (id) DO NOTHING;

COMMIT;
"""

def run_migration():
    logger.info("Executing Hospital Administrator Workspace DB Migration...")
    with get_db_cursor() as cur:
        cur.execute(SQL_MIGRATION)
    logger.info("Hospital Administrator DB Migration successfully executed and committed.")

if __name__ == "__main__":
    run_migration()
