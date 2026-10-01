-- ==============================================================================
-- ONEHEALTH ID (OH-ID) Enterprise Hospital Operating System
-- Schema, Tables, Views, Stored Procedures & Seed Data
-- ==============================================================================

DROP SCHEMA IF EXISTS oh_id CASCADE;
CREATE SCHEMA oh_id;

SET search_path TO oh_id, public;

-- ------------------------------------------------------------------------------
-- 1. BASE TABLES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS oh_id.tenants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    subscription_plan VARCHAR(50) DEFAULT 'ENTERPRISE',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.hospitals (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) REFERENCES oh_id.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    city VARCHAR(100) DEFAULT 'Chennai',
    state VARCHAR(100) DEFAULT 'Tamil Nadu',
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.departments (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    floor_number VARCHAR(20) DEFAULT '1st Floor',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.users (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) REFERENCES oh_id.tenants(id),
    hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL, -- SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, RECEPTIONIST, NURSE, LAB_STAFF, PHARMACY_STAFF, BILLING_STAFF, PATIENT
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS oh_id.patients (
    id VARCHAR(64) PRIMARY KEY,
    onehealth_id VARCHAR(64) NOT NULL UNIQUE, -- e.g. OHID-IND-2026-XXXX
    qr_token VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) DEFAULT 'Unspecified',
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(100) DEFAULT 'Chennai',
    state VARCHAR(100) DEFAULT 'Tamil Nadu',
    emergency_contact VARCHAR(100),
    blood_group VARCHAR(20),
    diagnosis TEXT NOT NULL,
    hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
    tenant_id VARCHAR(64) REFERENCES oh_id.tenants(id),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.doctors (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES oh_id.users(id),
    hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
    department_id VARCHAR(64) REFERENCES oh_id.departments(id),
    name VARCHAR(150) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    qualification VARCHAR(100) DEFAULT 'MBBS, MD',
    phone VARCHAR(20),
    email VARCHAR(100),
    room_number VARCHAR(50) DEFAULT 'Room 101',
    opd_timings VARCHAR(100) DEFAULT '09:00 AM - 01:00 PM',
    consultation_fee NUMERIC(10, 2) DEFAULT 500.00,
    rating NUMERIC(3, 1) DEFAULT 4.9,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.appointments (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) REFERENCES oh_id.patients(id) ON DELETE CASCADE,
    doctor_id VARCHAR(64) REFERENCES oh_id.doctors(id) ON DELETE CASCADE,
    hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
    department_id VARCHAR(64) REFERENCES oh_id.departments(id),
    slot VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, confirmed, checked_in, in_progress, completed, cancelled, no_show
    token_number INT DEFAULT 1,
    priority VARCHAR(20) DEFAULT 'NORMAL', -- NORMAL, URGENT, VIP
    notes TEXT,
    booked_by VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.queue_entries (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
    doctor_id VARCHAR(64) REFERENCES oh_id.doctors(id),
    department_id VARCHAR(64) REFERENCES oh_id.departments(id),
    appointment_id VARCHAR(64) REFERENCES oh_id.appointments(id),
    patient_id VARCHAR(64) REFERENCES oh_id.patients(id),
    token_number INT NOT NULL,
    status VARCHAR(50) DEFAULT 'WAITING', -- WAITING, CALLING, IN_CONSULTATION, COMPLETED, ON_HOLD, SKIPPED
    estimated_wait_minutes INT DEFAULT 15,
    called_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.opd_consultations (
    id VARCHAR(64) PRIMARY KEY,
    appointment_id VARCHAR(64) REFERENCES oh_id.appointments(id),
    patient_id VARCHAR(64) REFERENCES oh_id.patients(id),
    doctor_id VARCHAR(64) REFERENCES oh_id.doctors(id),
    symptoms TEXT,
    diagnosis TEXT NOT NULL,
    clinical_notes TEXT,
    vitals JSONB DEFAULT '{}'::jsonb, -- blood_pressure, pulse, temperature, spO2, weight
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.prescriptions (
    id VARCHAR(64) PRIMARY KEY,
    consultation_id VARCHAR(64) REFERENCES oh_id.opd_consultations(id),
    patient_id VARCHAR(64) REFERENCES oh_id.patients(id),
    doctor_id VARCHAR(64) REFERENCES oh_id.doctors(id),
    instructions TEXT,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, DISPENSED, PARTIALLY_DISPENSED
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.prescription_items (
    id VARCHAR(64) PRIMARY KEY,
    prescription_id VARCHAR(64) REFERENCES oh_id.prescriptions(id) ON DELETE CASCADE,
    medicine_name VARCHAR(150) NOT NULL,
    dosage VARCHAR(50) NOT NULL, -- e.g. 500mg
    frequency VARCHAR(50) NOT NULL, -- e.g. 1-0-1 After Food
    duration_days INT DEFAULT 5,
    quantity INT DEFAULT 10,
    is_dispensed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS oh_id.wards (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
    name VARCHAR(100) NOT NULL,
    ward_type VARCHAR(50) DEFAULT 'GENERAL', -- GENERAL, SEMI_PRIVATE, PRIVATE, ICU, EMERGENCY
    floor_number VARCHAR(20) DEFAULT '2nd Floor'
);

CREATE TABLE IF NOT EXISTS oh_id.beds (
    id VARCHAR(64) PRIMARY KEY,
    ward_id VARCHAR(64) REFERENCES oh_id.wards(id) ON DELETE CASCADE,
    bed_number VARCHAR(50) NOT NULL,
    daily_charge NUMERIC(10, 2) DEFAULT 1500.00,
    is_occupied BOOLEAN DEFAULT FALSE,
    current_patient_id VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS oh_id.ipd_admissions (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) REFERENCES oh_id.patients(id),
    bed_id VARCHAR(64) REFERENCES oh_id.beds(id),
    admitting_doctor_id VARCHAR(64) REFERENCES oh_id.doctors(id),
    hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
    admission_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    discharge_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'ADMITTED', -- ADMITTED, DISCHARGED, TRANSFERRED
    reason_for_admission TEXT,
    discharge_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.lab_test_catalog (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(100) DEFAULT 'Biochemistry',
    price NUMERIC(10, 2) DEFAULT 350.00,
    turnaround_hours INT DEFAULT 4,
    normal_range VARCHAR(100) DEFAULT 'Normal'
);

CREATE TABLE IF NOT EXISTS oh_id.lab_orders (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) REFERENCES oh_id.patients(id),
    test_id VARCHAR(64) REFERENCES oh_id.lab_test_catalog(id),
    doctor_id VARCHAR(64) REFERENCES oh_id.doctors(id),
    hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
    status VARCHAR(50) DEFAULT 'ORDERED', -- ORDERED, SAMPLE_COLLECTED, PROCESSING, COMPLETED, VERIFIED, CANCELLED
    priority VARCHAR(20) DEFAULT 'ROUTINE',
    result_value TEXT,
    result_unit VARCHAR(50),
    is_abnormal BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(64),
    ordered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS oh_id.pharmacy_medicines (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    generic_name VARCHAR(150),
    category VARCHAR(100) DEFAULT 'Antibiotic',
    unit_price NUMERIC(10, 2) DEFAULT 15.00,
    stock_quantity INT DEFAULT 500,
    reorder_level INT DEFAULT 50,
    expiry_date DATE DEFAULT '2028-12-31'
);

CREATE TABLE IF NOT EXISTS oh_id.invoices (
    id VARCHAR(64) PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    patient_id VARCHAR(64) REFERENCES oh_id.patients(id),
    hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id),
    appointment_id VARCHAR(64) REFERENCES oh_id.appointments(id),
    subtotal NUMERIC(12, 2) DEFAULT 0.00,
    tax_gst NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    balance_amount NUMERIC(12, 2) DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PARTIALLY_PAID, PAID, CANCELLED
    insurance_claim_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.invoice_items (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64) REFERENCES oh_id.invoices(id) ON DELETE CASCADE,
    item_type VARCHAR(50) DEFAULT 'CONSULTATION', -- CONSULTATION, LAB, PHARMACY, BED, PROCEDURE
    description VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS oh_id.payments (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64) REFERENCES oh_id.invoices(id),
    amount NUMERIC(12, 2) NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'UPI', -- UPI, CASH, CARD, NETBANKING, INSURANCE
    transaction_ref VARCHAR(100),
    status VARCHAR(50) DEFAULT 'SUCCESS',
    recorded_by VARCHAR(64),
    payment_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    patient_id VARCHAR(64),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'APPOINTMENT', -- APPOINTMENT, QUEUE, LAB, BILLING, SYSTEM
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor_id VARCHAR(64),
    actor_name VARCHAR(150),
    tenant_id VARCHAR(64),
    hospital_id VARCHAR(64),
    action VARCHAR(100) NOT NULL, -- PATIENT_REGISTER, APPOINTMENT_BOOK, QR_SCAN, QUEUE_UPDATE, BILL_PAYMENT
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(64),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. DATABASE VIEWS (Mandatory for ALL Reads - No Direct Queries)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE VIEW oh_id.vw_patients AS
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
    p.status,
    p.hospital_id,
    h.name AS hospital_name,
    p.tenant_id,
    p.created_at,
    p.updated_at,
    (SELECT COUNT(*) FROM oh_id.appointments a WHERE a.patient_id = p.id) AS total_appointments,
    (SELECT COUNT(*) FROM oh_id.invoices i WHERE i.patient_id = p.id AND i.payment_status != 'PAID') AS pending_bills_count
FROM oh_id.patients p
LEFT JOIN oh_id.hospitals h ON p.hospital_id = h.id;

CREATE OR REPLACE VIEW oh_id.vw_doctors AS
SELECT 
    d.id,
    d.name,
    d.specialty,
    d.qualification,
    d.phone,
    d.email,
    d.room_number,
    d.opd_timings,
    d.consultation_fee,
    d.rating,
    d.is_available,
    d.hospital_id,
    h.name AS hospital_name,
    d.department_id,
    dept.name AS department_name,
    (SELECT COUNT(*) FROM oh_id.queue_entries q WHERE q.doctor_id = d.id AND q.status = 'WAITING') AS active_waiting_count,
    (SELECT COUNT(*) FROM oh_id.appointments a WHERE a.doctor_id = d.id AND a.status = 'scheduled') AS upcoming_appointments_count
FROM oh_id.doctors d
LEFT JOIN oh_id.hospitals h ON d.hospital_id = h.id
LEFT JOIN oh_id.departments dept ON d.department_id = dept.id;

CREATE OR REPLACE VIEW oh_id.vw_appointments AS
SELECT 
    a.id,
    a.patient_id,
    p.name AS patient_name,
    p.onehealth_id,
    p.phone AS patient_phone,
    p.age AS patient_age,
    p.diagnosis AS patient_diagnosis,
    a.doctor_id,
    d.name AS doctor_name,
    d.specialty AS doctor_specialty,
    d.room_number,
    a.hospital_id,
    h.name AS hospital_name,
    a.department_id,
    dept.name AS department_name,
    a.slot,
    a.status,
    a.token_number,
    a.priority,
    a.notes,
    a.booked_by,
    a.created_at,
    a.updated_at
FROM oh_id.appointments a
LEFT JOIN oh_id.patients p ON a.patient_id = p.id
LEFT JOIN oh_id.doctors d ON a.doctor_id = d.id
LEFT JOIN oh_id.hospitals h ON a.hospital_id = h.id
LEFT JOIN oh_id.departments dept ON a.department_id = dept.id;

CREATE OR REPLACE VIEW oh_id.vw_queue_board AS
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
    q.doctor_id,
    d.name AS doctor_name,
    d.specialty AS doctor_specialty,
    d.room_number,
    q.department_id,
    dept.name AS department_name,
    q.hospital_id,
    h.name AS hospital_name,
    a.slot AS appointment_slot,
    a.priority
FROM oh_id.queue_entries q
LEFT JOIN oh_id.patients p ON q.patient_id = p.id
LEFT JOIN oh_id.doctors d ON q.doctor_id = d.id
LEFT JOIN oh_id.departments dept ON q.department_id = dept.id
LEFT JOIN oh_id.hospitals h ON q.hospital_id = h.id
LEFT JOIN oh_id.appointments a ON q.appointment_id = a.id;

CREATE OR REPLACE VIEW oh_id.vw_opd_encounters AS
SELECT 
    c.id,
    c.appointment_id,
    c.patient_id,
    p.name AS patient_name,
    p.onehealth_id,
    p.age AS patient_age,
    p.gender AS patient_gender,
    c.doctor_id,
    d.name AS doctor_name,
    d.specialty AS doctor_specialty,
    c.symptoms,
    c.diagnosis,
    c.clinical_notes,
    c.vitals,
    c.created_at,
    pr.id AS prescription_id,
    pr.status AS prescription_status,
    (SELECT COUNT(*) FROM oh_id.prescription_items pi WHERE pi.prescription_id = pr.id) AS medicines_count
FROM oh_id.opd_consultations c
LEFT JOIN oh_id.patients p ON c.patient_id = p.id
LEFT JOIN oh_id.doctors d ON c.doctor_id = d.id
LEFT JOIN oh_id.prescriptions pr ON pr.consultation_id = c.id;

CREATE OR REPLACE VIEW oh_id.vw_ipd_admissions AS
SELECT 
    adm.id,
    adm.patient_id,
    p.name AS patient_name,
    p.onehealth_id,
    p.phone AS patient_phone,
    p.age AS patient_age,
    p.gender AS patient_gender,
    adm.bed_id,
    b.bed_number,
    b.daily_charge,
    w.name AS ward_name,
    w.ward_type,
    adm.admitting_doctor_id,
    d.name AS doctor_name,
    d.specialty AS doctor_specialty,
    adm.hospital_id,
    h.name AS hospital_name,
    adm.admission_date,
    adm.discharge_date,
    adm.status,
    adm.reason_for_admission,
    adm.discharge_summary,
    adm.created_at
FROM oh_id.ipd_admissions adm
LEFT JOIN oh_id.patients p ON adm.patient_id = p.id
LEFT JOIN oh_id.beds b ON adm.bed_id = b.id
LEFT JOIN oh_id.wards w ON b.ward_id = w.id
LEFT JOIN oh_id.doctors d ON adm.admitting_doctor_id = d.id
LEFT JOIN oh_id.hospitals h ON adm.hospital_id = h.id;

CREATE OR REPLACE VIEW oh_id.vw_lab_orders AS
SELECT 
    lo.id,
    lo.patient_id,
    p.name AS patient_name,
    p.onehealth_id,
    lo.test_id,
    ltc.name AS test_name,
    ltc.code AS test_code,
    ltc.category AS test_category,
    ltc.price AS test_price,
    ltc.normal_range,
    lo.doctor_id,
    d.name AS doctor_name,
    lo.hospital_id,
    h.name AS hospital_name,
    lo.status,
    lo.priority,
    lo.result_value,
    lo.result_unit,
    lo.is_abnormal,
    lo.verified_by,
    lo.ordered_at,
    lo.completed_at
FROM oh_id.lab_orders lo
LEFT JOIN oh_id.patients p ON lo.patient_id = p.id
LEFT JOIN oh_id.lab_test_catalog ltc ON lo.test_id = ltc.id
LEFT JOIN oh_id.doctors d ON lo.doctor_id = d.id
LEFT JOIN oh_id.hospitals h ON lo.hospital_id = h.id;

CREATE OR REPLACE VIEW oh_id.vw_pharmacy_dispensary AS
SELECT 
    pr.id AS prescription_id,
    pr.patient_id,
    p.name AS patient_name,
    p.onehealth_id,
    pr.doctor_id,
    d.name AS doctor_name,
    pr.status AS prescription_status,
    pr.instructions,
    pr.created_at,
    pi.id AS item_id,
    pi.medicine_name,
    pi.dosage,
    pi.frequency,
    pi.duration_days,
    pi.quantity,
    pi.is_dispensed,
    pm.id AS catalog_medicine_id,
    pm.stock_quantity,
    pm.unit_price
FROM oh_id.prescriptions pr
LEFT JOIN oh_id.patients p ON pr.patient_id = p.id
LEFT JOIN oh_id.doctors d ON pr.doctor_id = d.id
LEFT JOIN oh_id.prescription_items pi ON pi.prescription_id = pr.id
LEFT JOIN oh_id.pharmacy_medicines pm ON LOWER(pm.name) = LOWER(pi.medicine_name);

CREATE OR REPLACE VIEW oh_id.vw_billing_invoices AS
SELECT 
    inv.id,
    inv.invoice_number,
    inv.patient_id,
    p.name AS patient_name,
    p.onehealth_id,
    p.phone AS patient_phone,
    inv.hospital_id,
    h.name AS hospital_name,
    inv.appointment_id,
    inv.subtotal,
    inv.tax_gst,
    inv.discount,
    inv.total_amount,
    inv.paid_amount,
    inv.balance_amount,
    inv.payment_status,
    inv.created_at,
    (SELECT COUNT(*) FROM oh_id.invoice_items ii WHERE ii.invoice_id = inv.id) AS items_count,
    (SELECT MAX(p.payment_mode) FROM oh_id.payments p WHERE p.invoice_id = inv.id) AS last_payment_mode
FROM oh_id.invoices inv
LEFT JOIN oh_id.patients p ON inv.patient_id = p.id
LEFT JOIN oh_id.hospitals h ON inv.hospital_id = h.id;

CREATE OR REPLACE VIEW oh_id.vw_dashboard_metrics AS
SELECT 
    (SELECT COUNT(*) FROM oh_id.patients) AS total_patients,
    (SELECT COUNT(*) FROM oh_id.appointments WHERE status IN ('scheduled', 'confirmed')) AS active_appointments,
    (SELECT COUNT(*) FROM oh_id.queue_entries WHERE status = 'WAITING') AS active_queue_count,
    (SELECT COUNT(*) FROM oh_id.doctors WHERE is_available = TRUE) AS available_doctors,
    (SELECT COUNT(*) FROM oh_id.ipd_admissions WHERE status = 'ADMITTED') AS admitted_ipd_patients,
    (SELECT COUNT(*) FROM oh_id.beds WHERE is_occupied = FALSE) AS available_beds,
    (SELECT COUNT(*) FROM oh_id.lab_orders WHERE status IN ('ORDERED', 'PROCESSING')) AS pending_labs,
    (SELECT COALESCE(SUM(total_amount), 0) FROM oh_id.invoices WHERE payment_status = 'PAID') AS total_revenue,
    (SELECT COALESCE(SUM(balance_amount), 0) FROM oh_id.invoices WHERE payment_status != 'PAID') AS outstanding_balance;

CREATE OR REPLACE VIEW oh_id.vw_user_profiles AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.role,
    u.phone,
    u.is_active,
    u.hospital_id,
    h.name AS hospital_name,
    u.tenant_id,
    t.name AS tenant_name,
    u.created_at,
    u.last_login_at
FROM oh_id.users u
LEFT JOIN oh_id.hospitals h ON u.hospital_id = h.id
LEFT JOIN oh_id.tenants t ON u.tenant_id = t.id;

CREATE OR REPLACE VIEW oh_id.vw_audit_logs AS
SELECT 
    al.id,
    al.actor_id,
    al.actor_name,
    al.action,
    al.resource_type,
    al.resource_id,
    al.details,
    al.ip_address,
    al.hospital_id,
    h.name AS hospital_name,
    al.created_at
FROM oh_id.audit_logs al
LEFT JOIN oh_id.hospitals h ON al.hospital_id = h.id;

CREATE OR REPLACE VIEW oh_id.vw_departments AS
SELECT 
    d.id,
    d.hospital_id,
    h.name AS hospital_name,
    d.name,
    d.code,
    d.floor_number,
    d.is_active,
    (SELECT COUNT(*) FROM oh_id.doctors doc WHERE doc.department_id = d.id) AS doctors_count
FROM oh_id.departments d
LEFT JOIN oh_id.hospitals h ON d.hospital_id = h.id;

CREATE OR REPLACE VIEW oh_id.vw_wards_and_beds AS
SELECT 
    b.id AS bed_id,
    b.bed_number,
    b.daily_charge,
    b.is_occupied,
    b.current_patient_id,
    p.name AS current_patient_name,
    p.onehealth_id AS current_onehealth_id,
    w.id AS ward_id,
    w.name AS ward_name,
    w.ward_type,
    w.floor_number,
    w.hospital_id,
    h.name AS hospital_name
FROM oh_id.beds b
JOIN oh_id.wards w ON b.ward_id = w.id
LEFT JOIN oh_id.hospitals h ON w.hospital_id = h.id
LEFT JOIN oh_id.patients p ON b.current_patient_id = p.id;

-- ------------------------------------------------------------------------------
-- 3. STORED PROCEDURES (Mandatory for ALL Writes - No Direct Insert/Update)
-- ------------------------------------------------------------------------------

-- Procedure: Register Patient & Generate OneHealth ID / QR Token
CREATE OR REPLACE PROCEDURE oh_id.sp_register_patient(
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
    p_hospital_id VARCHAR(64),
    p_created_by VARCHAR(64),
    INOUT o_patient_id VARCHAR(64) DEFAULT NULL,
    INOUT o_onehealth_id VARCHAR(64) DEFAULT NULL,
    INOUT o_qr_token VARCHAR(255) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_seq INT;
    v_new_id VARCHAR(64);
    v_ohid VARCHAR(64);
    v_qr VARCHAR(255);
BEGIN
    v_new_id := COALESCE(p_id, 'p-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    
    -- Sequential sequence generation for OneHealth ID
    SELECT COUNT(*) + 1001 INTO v_seq FROM oh_id.patients;
    v_ohid := 'OHID-IND-2026-' || LPAD(v_seq::TEXT, 5, '0');
    v_qr := 'QR-OHID-' || MD5(v_ohid || v_new_id || 'SECRET_KEY_2026');

    INSERT INTO oh_id.patients (
        id, onehealth_id, qr_token, name, age, gender, phone, email,
        address, emergency_contact, blood_group, diagnosis, hospital_id, status
    ) VALUES (
        v_new_id, v_ohid, v_qr, p_name, p_age, p_gender, p_phone, p_email,
        p_address, p_emergency_contact, p_blood_group, p_diagnosis, p_hospital_id, 'ACTIVE'
    );

    -- Audit log
    INSERT INTO oh_id.audit_logs (id, actor_id, actor_name, action, resource_type, resource_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        p_created_by, 'System/Staff', 'PATIENT_REGISTERED', 'PATIENT', v_new_id,
        json_build_object('onehealth_id', v_ohid, 'name', p_name, 'age', p_age)::jsonb
    );

    o_patient_id := v_new_id;
    o_onehealth_id := v_ohid;
    o_qr_token := v_qr;
END;
$$;

-- Procedure: Update Patient
CREATE OR REPLACE PROCEDURE oh_id.sp_update_patient(
    p_patient_id VARCHAR(64),
    p_name VARCHAR(150),
    p_age INT,
    p_diagnosis TEXT,
    p_phone VARCHAR(20),
    p_address TEXT,
    p_actor_id VARCHAR(64)
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE oh_id.patients
    SET 
        name = COALESCE(p_name, name),
        age = COALESCE(p_age, age),
        diagnosis = COALESCE(p_diagnosis, diagnosis),
        phone = COALESCE(p_phone, phone),
        address = COALESCE(p_address, address),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_patient_id;

    INSERT INTO oh_id.audit_logs (id, actor_id, actor_name, action, resource_type, resource_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        p_actor_id, 'System/Staff', 'PATIENT_UPDATED', 'PATIENT', p_patient_id,
        json_build_object('name', p_name, 'age', p_age, 'diagnosis', p_diagnosis)::jsonb
    );
END;
$$;

-- Procedure: Book Appointment
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
BEGIN
    v_new_id := COALESCE(p_id, 'a-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

    -- Determine Department and Hospital if not provided
    IF p_hospital_id IS NULL OR p_department_id IS NULL THEN
        SELECT hospital_id, department_id INTO v_hosp, v_dept FROM oh_id.doctors WHERE id = p_doctor_id;
    ELSE
        v_hosp := p_hospital_id;
        v_dept := p_department_id;
    END IF;

    -- Calculate next token for doctor
    SELECT COALESCE(MAX(token_number), 0) + 1 INTO v_token 
    FROM oh_id.appointments 
    WHERE doctor_id = p_doctor_id AND slot::DATE = (SUBSTRING(p_slot FROM 1 FOR 10))::DATE;

    INSERT INTO oh_id.appointments (
        id, patient_id, doctor_id, hospital_id, department_id, slot, status, token_number, notes, booked_by
    ) VALUES (
        v_new_id, p_patient_id, p_doctor_id, v_hosp, v_dept, p_slot, COALESCE(p_status, 'scheduled'), v_token, p_notes, p_booked_by
    );

    -- Insert into Live Queue if confirmed or checked in or scheduled
    INSERT INTO oh_id.queue_entries (
        id, hospital_id, doctor_id, department_id, appointment_id, patient_id, token_number, status, estimated_wait_minutes
    ) VALUES (
        'q-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        v_hosp, p_doctor_id, v_dept, v_new_id, p_patient_id, v_token, 'WAITING', (v_token * 15)
    );

    -- Audit log
    INSERT INTO oh_id.audit_logs (id, actor_id, actor_name, action, resource_type, resource_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        p_booked_by, 'System/Staff', 'APPOINTMENT_BOOKED', 'APPOINTMENT', v_new_id,
        json_build_object('patient_id', p_patient_id, 'doctor_id', p_doctor_id, 'slot', p_slot, 'token', v_token)::jsonb
    );

    o_appointment_id := v_new_id;
    o_token_number := v_token;
END;
$$;

-- Procedure: Update Appointment Status
CREATE OR REPLACE PROCEDURE oh_id.sp_update_appointment_status(
    p_appointment_id VARCHAR(64),
    p_status VARCHAR(50),
    p_actor_id VARCHAR(64)
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE oh_id.appointments
    SET status = p_status, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_appointment_id;

    -- Update linked queue if completed or cancelled
    IF p_status IN ('completed', 'cancelled') THEN
        UPDATE oh_id.queue_entries
        SET status = CASE WHEN p_status = 'completed' THEN 'COMPLETED' ELSE 'SKIPPED' END,
            completed_at = CURRENT_TIMESTAMP
        WHERE appointment_id = p_appointment_id;
    ELSIF p_status = 'in_progress' THEN
        UPDATE oh_id.queue_entries
        SET status = 'IN_CONSULTATION', called_at = CURRENT_TIMESTAMP
        WHERE appointment_id = p_appointment_id;
    END IF;

    INSERT INTO oh_id.audit_logs (id, actor_id, actor_name, action, resource_type, resource_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        p_actor_id, 'System/Staff', 'APPOINTMENT_STATUS_UPDATED', 'APPOINTMENT', p_appointment_id,
        json_build_object('status', p_status)::jsonb
    );
END;
$$;

-- Procedure: Queue Actions (CALL_NEXT, HOLD, COMPLETE, SKIP, RECALL)
CREATE OR REPLACE PROCEDURE oh_id.sp_queue_action(
    p_queue_id VARCHAR(64),
    p_action VARCHAR(50),
    p_actor_id VARCHAR(64),
    INOUT o_new_status VARCHAR(50) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_appt_id VARCHAR(64);
BEGIN
    SELECT appointment_id INTO v_appt_id FROM oh_id.queue_entries WHERE id = p_queue_id;

    IF p_action = 'CALL_NEXT' THEN
        UPDATE oh_id.queue_entries 
        SET status = 'CALLING', called_at = CURRENT_TIMESTAMP 
        WHERE id = p_queue_id;
        o_new_status := 'CALLING';
    ELSIF p_action = 'START_CONSULT' THEN
        UPDATE oh_id.queue_entries 
        SET status = 'IN_CONSULTATION' 
        WHERE id = p_queue_id;
        IF v_appt_id IS NOT NULL THEN
            UPDATE oh_id.appointments SET status = 'in_progress' WHERE id = v_appt_id;
        END IF;
        o_new_status := 'IN_CONSULTATION';
    ELSIF p_action = 'COMPLETE' THEN
        UPDATE oh_id.queue_entries 
        SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP 
        WHERE id = p_queue_id;
        IF v_appt_id IS NOT NULL THEN
            UPDATE oh_id.appointments SET status = 'completed' WHERE id = v_appt_id;
        END IF;
        o_new_status := 'COMPLETED';
    ELSIF p_action = 'HOLD' THEN
        UPDATE oh_id.queue_entries 
        SET status = 'ON_HOLD' 
        WHERE id = p_queue_id;
        o_new_status := 'ON_HOLD';
    ELSIF p_action = 'SKIP' THEN
        UPDATE oh_id.queue_entries 
        SET status = 'SKIPPED' 
        WHERE id = p_queue_id;
        o_new_status := 'SKIPPED';
    END IF;

    INSERT INTO oh_id.audit_logs (id, actor_id, actor_name, action, resource_type, resource_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        p_actor_id, 'Doctor/Staff', 'QUEUE_ACTION_' || p_action, 'QUEUE', p_queue_id,
        json_build_object('action', p_action, 'status', o_new_status)::jsonb
    );
END;
$$;

-- Procedure: Create Doctor Profile
CREATE OR REPLACE PROCEDURE oh_id.sp_create_doctor(
    p_id VARCHAR(64),
    p_name VARCHAR(150),
    p_specialty VARCHAR(100),
    p_department_id VARCHAR(64),
    p_hospital_id VARCHAR(64),
    p_phone VARCHAR(20),
    p_email VARCHAR(100),
    p_room_number VARCHAR(50),
    p_consultation_fee NUMERIC(10, 2),
    p_actor_id VARCHAR(64),
    INOUT o_doctor_id VARCHAR(64) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_id VARCHAR(64);
BEGIN
    v_new_id := COALESCE(p_id, 'd-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

    INSERT INTO oh_id.doctors (
        id, name, specialty, department_id, hospital_id, phone, email, room_number, consultation_fee, is_available
    ) VALUES (
        v_new_id, p_name, p_specialty, p_department_id, p_hospital_id, p_phone, p_email,
        COALESCE(p_room_number, 'Room 101'), COALESCE(p_consultation_fee, 500.00), TRUE
    );

    INSERT INTO oh_id.audit_logs (id, actor_id, actor_name, action, resource_type, resource_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        p_actor_id, 'Admin', 'DOCTOR_CREATED', 'DOCTOR', v_new_id,
        json_build_object('name', p_name, 'specialty', p_specialty)::jsonb
    );

    o_doctor_id := v_new_id;
END;
$$;

-- Procedure: Generate Invoice
CREATE OR REPLACE PROCEDURE oh_id.sp_generate_invoice(
    p_patient_id VARCHAR(64),
    p_hospital_id VARCHAR(64),
    p_appointment_id VARCHAR(64),
    p_subtotal NUMERIC(12, 2),
    p_tax_gst NUMERIC(12, 2),
    p_discount NUMERIC(12, 2),
    p_total_amount NUMERIC(12, 2),
    p_created_by VARCHAR(64),
    INOUT o_invoice_id VARCHAR(64) DEFAULT NULL,
    INOUT o_invoice_number VARCHAR(50) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_id VARCHAR(64);
    v_inv_num VARCHAR(50);
BEGIN
    v_new_id := 'inv-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8);
    v_inv_num := 'INV-2026-' || LPAD((SELECT COUNT(*) + 101 FROM oh_id.invoices)::TEXT, 6, '0');

    INSERT INTO oh_id.invoices (
        id, invoice_number, patient_id, hospital_id, appointment_id,
        subtotal, tax_gst, discount, total_amount, paid_amount, balance_amount, payment_status
    ) VALUES (
        v_new_id, v_inv_num, p_patient_id, p_hospital_id, p_appointment_id,
        p_subtotal, p_tax_gst, p_discount, p_total_amount, 0.00, p_total_amount, 'PENDING'
    );

    INSERT INTO oh_id.audit_logs (id, actor_id, actor_name, action, resource_type, resource_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        p_created_by, 'Billing Staff', 'INVOICE_GENERATED', 'INVOICE', v_new_id,
        json_build_object('invoice_number', v_inv_num, 'total', p_total_amount)::jsonb
    );

    o_invoice_id := v_new_id;
    o_invoice_number := v_inv_num;
END;
$$;

-- Procedure: Record Payment
CREATE OR REPLACE PROCEDURE oh_id.sp_record_payment(
    p_invoice_id VARCHAR(64),
    p_amount NUMERIC(12, 2),
    p_payment_mode VARCHAR(50),
    p_transaction_ref VARCHAR(100),
    p_recorded_by VARCHAR(64),
    INOUT o_payment_id VARCHAR(64) DEFAULT NULL,
    INOUT o_payment_status VARCHAR(50) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_id VARCHAR(64);
    v_total NUMERIC(12, 2);
    v_paid NUMERIC(12, 2);
    v_new_paid NUMERIC(12, 2);
    v_new_bal NUMERIC(12, 2);
    v_status VARCHAR(50);
BEGIN
    v_new_id := 'pay-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8);

    INSERT INTO oh_id.payments (id, invoice_id, amount, payment_mode, transaction_ref, status, recorded_by)
    VALUES (v_new_id, p_invoice_id, p_amount, p_payment_mode, p_transaction_ref, 'SUCCESS', p_recorded_by);

    SELECT total_amount, paid_amount INTO v_total, v_paid FROM oh_id.invoices WHERE id = p_invoice_id;
    v_new_paid := v_paid + p_amount;
    v_new_bal := GREATEST(0.00, v_total - v_new_paid);

    IF v_new_bal = 0.00 THEN
        v_status := 'PAID';
    ELSE
        v_status := 'PARTIALLY_PAID';
    END IF;

    UPDATE oh_id.invoices 
    SET paid_amount = v_new_paid, balance_amount = v_new_bal, payment_status = v_status 
    WHERE id = p_invoice_id;

    INSERT INTO oh_id.audit_logs (id, actor_id, actor_name, action, resource_type, resource_id, details)
    VALUES (
        'aud-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
        p_recorded_by, 'Billing/Cashier', 'PAYMENT_RECORDED', 'PAYMENT', v_new_id,
        json_build_object('invoice_id', p_invoice_id, 'amount', p_amount, 'mode', p_payment_mode)::jsonb
    );

    o_payment_id := v_new_id;
    o_payment_status := v_status;
END;
$$;
