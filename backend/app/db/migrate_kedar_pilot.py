"""
Kedar Hospital Pilot MVP — Database Schema Extension & Seed Migration
Adds multi-tenant organization/branch tables, RBAC roles & permissions,
and seeds Kedar Hospital (Mugalivakkam Branch, Chennai) configuration.
"""

from backend.app.database.session import get_db_cursor

SCHEMA_EXTENSIONS = """
-- 1. Organizations
CREATE TABLE IF NOT EXISTS oh_id.organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add organization_id to hospitals if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'oh_id' AND table_name = 'hospitals' AND column_name = 'organization_id'
    ) THEN 
        ALTER TABLE oh_id.hospitals ADD COLUMN organization_id VARCHAR(64) REFERENCES oh_id.organizations(id);
    END IF;
END $$;

-- 2. Hospital Branches
CREATE TABLE IF NOT EXISTS oh_id.hospital_branches (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT,
    area VARCHAR(100) DEFAULT 'Mugalivakkam',
    city VARCHAR(100) DEFAULT 'Chennai',
    state VARCHAR(100) DEFAULT 'Tamil Nadu',
    pincode VARCHAR(20) DEFAULT '600125',
    phone VARCHAR(20),
    email VARCHAR(100),
    is_main_branch BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Granular RBAC: Roles, Permissions, RolePermissions, UserRoles
CREATE TABLE IF NOT EXISTS oh_id.roles (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.permissions (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oh_id.role_permissions (
    role_id VARCHAR(64) REFERENCES oh_id.roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(64) REFERENCES oh_id.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS oh_id.user_roles (
    user_id VARCHAR(64) REFERENCES oh_id.users(id) ON DELETE CASCADE,
    role_id VARCHAR(64) REFERENCES oh_id.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Add identity_type and identity_number to patients if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'oh_id' AND table_name = 'patients' AND column_name = 'identity_type'
    ) THEN 
        ALTER TABLE oh_id.patients ADD COLUMN identity_type VARCHAR(50) DEFAULT 'NATIONAL_ID';
        ALTER TABLE oh_id.patients ADD COLUMN identity_number VARCHAR(100);
        ALTER TABLE oh_id.patients ADD COLUMN branch_id VARCHAR(64) REFERENCES oh_id.hospital_branches(id);
        ALTER TABLE oh_id.patients ADD COLUMN is_demo_data BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'oh_id' AND table_name = 'appointments' AND column_name = 'branch_id'
    ) THEN 
        ALTER TABLE oh_id.appointments ADD COLUMN branch_id VARCHAR(64) REFERENCES oh_id.hospital_branches(id);
        ALTER TABLE oh_id.appointments ADD COLUMN is_demo_data BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'oh_id' AND table_name = 'queue_entries' AND column_name = 'branch_id'
    ) THEN 
        ALTER TABLE oh_id.queue_entries ADD COLUMN branch_id VARCHAR(64) REFERENCES oh_id.hospital_branches(id);
    END IF;
END $$;
"""

SEED_KEDAR_PILOT = """
-- 1. Organization & Tenant
INSERT INTO oh_id.organizations (id, name, code)
VALUES ('org-kedar', 'Kedar Healthcare Group', 'KEDAR-GRP')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO oh_id.tenants (id, name, code, subscription_plan)
VALUES ('ten-kedar', 'Kedar Hospital Network', 'KEDAR-NET', 'ENTERPRISE')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Hospital & Mugalivakkam Branch
INSERT INTO oh_id.hospitals (id, tenant_id, organization_id, name, code, address, city, state, phone, email)
VALUES 
('hosp-kedar', 'ten-kedar', 'org-kedar', 'Kedar Hospital', 'KEDAR-CHE', 'Mount-Poonamallee High Road, Mugalivakkam', 'Chennai', 'Tamil Nadu', '+91 44 2252 1100', 'contact@kedarhospital.org')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address;

INSERT INTO oh_id.hospital_branches (id, hospital_id, name, code, address, area, city, state, pincode, phone, email, is_main_branch)
VALUES 
('branch-kedar-01', 'hosp-kedar', 'Kedar Hospital - Mugalivakkam Main', 'KEDAR-MUG-01', '124 Mount-Poonamallee High Road', 'Mugalivakkam', 'Chennai', 'Tamil Nadu', '600125', '+91 44 2252 1101', 'mugalivakkam@kedarhospital.org', TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, area = EXCLUDED.area;

-- 3. Departments
INSERT INTO oh_id.departments (id, hospital_id, name, code, floor_number)
VALUES 
('dept-k-01', 'hosp-kedar', 'General Medicine & OPD', 'KED-MED', 'Ground Floor, Wing A'),
('dept-k-02', 'hosp-kedar', 'Cardiology & Intensive Care', 'KED-CARDIO', '1st Floor, Wing B'),
('dept-k-03', 'hosp-kedar', 'Pediatrics & Neonatology', 'KED-PED', '1st Floor, Wing C'),
('dept-k-04', 'hosp-kedar', 'Orthopedics & Joint Care', 'KED-ORTHO', '2nd Floor, Wing A'),
('dept-k-05', 'hosp-kedar', 'Emergency & Triage (24x7)', 'KED-EMERG', 'Ground Floor, Wing E')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 4. Granular Permissions
INSERT INTO oh_id.permissions (id, code, module, description)
VALUES 
('perm-01', 'patient.read', 'patient', 'View patient demographics and registry'),
('perm-02', 'patient.create', 'patient', 'Register new patients into OH-ID'),
('perm-03', 'patient.update', 'patient', 'Update patient demographic information'),
('perm-04', 'patient.qr.view', 'patient', 'View and download Zero-Knowledge QR token card'),
('perm-05', 'patient.qr.scan', 'patient', 'Scan and resolve Zero-Knowledge QR identity token'),
('perm-06', 'appointment.read', 'appointment', 'View hospital appointment schedule'),
('perm-07', 'appointment.create', 'appointment', 'Book outpatient consultation appointment'),
('perm-08', 'appointment.update', 'appointment', 'Reschedule or cancel appointments'),
('perm-09', 'appointment.checkin', 'appointment', 'Check-in patient and issue live OPD token'),
('perm-10', 'queue.read', 'queue', 'View live OPD queue board and token list'),
('perm-11', 'queue.manage', 'queue', 'Perform queue state transitions (Call, Hold, Skip, Complete)'),
('perm-12', 'consultation.read', 'consultation', 'View clinical consultation encounter history'),
('perm-13', 'consultation.create', 'consultation', 'Record doctor diagnostic notes, vitals, and orders'),
('perm-14', 'hospital.manage', 'admin', 'Manage hospital branches, departments, and user roles')
ON CONFLICT (code) DO NOTHING;

-- 5. Standard Roles
INSERT INTO oh_id.roles (id, code, name, description)
VALUES 
('role-platform-admin', 'PLATFORM_ADMIN', 'Platform Administrator', 'Full platform-wide superadmin controls'),
('role-hospital-admin', 'HOSPITAL_ADMIN', 'Hospital Administrator', 'Kedar Hospital facility executive & manager'),
('role-doctor', 'DOCTOR', 'Doctor / Clinician', 'Consulting physician with clinical encounter privileges'),
('role-receptionist', 'RECEPTIONIST', 'Receptionist / Front Desk', 'Patient intake, registration, appointment & queue check-in'),
('role-nurse', 'NURSE', 'Nurse / Triage Staff', 'Clinical triage, vitals recording, and OPD queue management'),
('role-patient', 'PATIENT', 'Patient / Citizen', 'Self-service identity, appointment booking, and records')
ON CONFLICT (code) DO NOTHING;

-- Map Role Permissions
-- Receptionist
INSERT INTO oh_id.role_permissions (role_id, permission_id)
SELECT 'role-receptionist', id FROM oh_id.permissions 
WHERE code IN ('patient.read', 'patient.create', 'patient.update', 'patient.qr.view', 'patient.qr.scan', 'appointment.read', 'appointment.create', 'appointment.update', 'appointment.checkin', 'queue.read')
ON CONFLICT DO NOTHING;

-- Doctor
INSERT INTO oh_id.role_permissions (role_id, permission_id)
SELECT 'role-doctor', id FROM oh_id.permissions 
WHERE code IN ('patient.read', 'patient.qr.scan', 'appointment.read', 'queue.read', 'queue.manage', 'consultation.read', 'consultation.create')
ON CONFLICT DO NOTHING;

-- Hospital Admin
INSERT INTO oh_id.role_permissions (role_id, permission_id)
SELECT 'role-hospital-admin', id FROM oh_id.permissions
ON CONFLICT DO NOTHING;

-- 6. Kedar Hospital Users
INSERT INTO oh_id.users (id, tenant_id, hospital_id, username, email, full_name, role, password_hash)
VALUES 
('usr-kedar-admin', 'ten-kedar', 'hosp-kedar', 'admin', 'admin@kedarhospital.org', 'Dr. Kedar Administrator', 'HOSPITAL_ADMIN', 'admin123'),
('usr-kedar-doc1', 'ten-kedar', 'hosp-kedar', 'dr.senthil', 'dr.senthil@kedarhospital.org', 'Dr. Senthil Nathan', 'DOCTOR', 'doctor123'),
('usr-kedar-doc2', 'ten-kedar', 'hosp-kedar', 'dr.anitha', 'dr.anitha@kedarhospital.org', 'Dr. Anitha Raman', 'DOCTOR', 'doctor123'),
('usr-kedar-rec', 'ten-kedar', 'hosp-kedar', 'receptionist', 'reception@kedarhospital.org', 'Kavitha Sundaram', 'RECEPTIONIST', 'rec123'),
('usr-kedar-nurse', 'ten-kedar', 'hosp-kedar', 'nurse', 'nurse@kedarhospital.org', 'Deepa Mohan', 'NURSE', 'nurse123')
ON CONFLICT (username) DO UPDATE SET 
    hospital_id = EXCLUDED.hospital_id,
    tenant_id = EXCLUDED.tenant_id,
    full_name = EXCLUDED.full_name,
    password_hash = EXCLUDED.password_hash;

-- Link User Roles
INSERT INTO oh_id.user_roles (user_id, role_id)
SELECT id, 'role-hospital-admin' FROM oh_id.users WHERE username = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO oh_id.user_roles (user_id, role_id)
SELECT id, 'role-doctor' FROM oh_id.users WHERE username = 'dr.senthil'
ON CONFLICT DO NOTHING;

INSERT INTO oh_id.user_roles (user_id, role_id)
SELECT id, 'role-doctor' FROM oh_id.users WHERE username = 'dr.anitha'
ON CONFLICT DO NOTHING;

INSERT INTO oh_id.user_roles (user_id, role_id)
SELECT id, 'role-receptionist' FROM oh_id.users WHERE username = 'receptionist'
ON CONFLICT DO NOTHING;

INSERT INTO oh_id.user_roles (user_id, role_id)
SELECT id, 'role-nurse' FROM oh_id.users WHERE username = 'nurse'
ON CONFLICT DO NOTHING;

-- 7. Kedar Doctors
INSERT INTO oh_id.doctors (id, user_id, hospital_id, department_id, name, specialty, qualification, phone, email, room_number, opd_timings, consultation_fee, rating, is_available)
SELECT 'doc-k-01', id, 'hosp-kedar', 'dept-k-01', 'Dr. Senthil Nathan', 'General Medicine & Diabetology', 'MBBS, MD (General Medicine)', '+91 98401 11222', 'dr.senthil@kedarhospital.org', 'Room 101', '08:30 AM - 01:30 PM', 500.00, 4.9, TRUE
FROM oh_id.users WHERE username = 'dr.senthil'
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, specialty = EXCLUDED.specialty;

INSERT INTO oh_id.doctors (id, user_id, hospital_id, department_id, name, specialty, qualification, phone, email, room_number, opd_timings, consultation_fee, rating, is_available)
SELECT 'doc-k-02', id, 'hosp-kedar', 'dept-k-02', 'Dr. Anitha Raman', 'Consultant Cardiologist', 'MBBS, MD, DM (Cardiology)', '+91 98401 33444', 'dr.anitha@kedarhospital.org', 'Room 102', '10:00 AM - 02:00 PM', 750.00, 4.9, TRUE
FROM oh_id.users WHERE username = 'dr.anitha'
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, specialty = EXCLUDED.specialty;

-- 8. Controlled Demo Data for Kedar Pilot (Explicitly Tagged is_demo_data = TRUE)
INSERT INTO oh_id.patients (id, onehealth_id, qr_token, name, age, gender, phone, email, address, emergency_contact, blood_group, diagnosis, hospital_id, tenant_id, status, identity_type, identity_number, is_demo_data)
VALUES 
('p-k-101', 'OHID-KEDAR-2026-0001', 'QR-OHID-KEDAR-p101-SECURE', 'Meenakshi Sundaram [DEMO DATA]', 54, 'Female', '9840199001', 'meenakshi.s@example.com', '14 Sabari Nagar, Mugalivakkam, Chennai', '+91 98401 99002 (Son)', 'O+ Positive', 'Hypertension & Routine Follow-up [DEMO DATA]', 'hosp-kedar', 'ten-kedar', 'ACTIVE', 'VOTER_ID', 'TN/02/124/88921', TRUE),
('p-k-102', 'OHID-KEDAR-2026-0002', 'QR-OHID-KEDAR-p102-SECURE', 'Karthik Subramanian [DEMO DATA]', 36, 'Male', '9840199002', 'karthik.sub@example.com', '78 Manapakkam Main Road, Chennai', '+91 98401 99003 (Spouse)', 'B+ Positive', 'Dyspepsia & Gastrointestinal Screening [DEMO DATA]', 'hosp-kedar', 'ten-kedar', 'ACTIVE', 'DRIVING_LICENSE', 'TN09-2015-0048192', TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Initial Demo Appointments & Queue
INSERT INTO oh_id.appointments (id, patient_id, doctor_id, hospital_id, department_id, slot, status, token_number, priority, notes, is_demo_data)
VALUES 
('appt-k-201', 'p-k-101', 'doc-k-01', 'hosp-kedar', 'dept-k-01', '2026-10-01 09:30', 'checked_in', 1, 'NORMAL', 'Morning follow-up for blood pressure [DEMO DATA]', TRUE),
('appt-k-202', 'p-k-102', 'doc-k-01', 'hosp-kedar', 'dept-k-01', '2026-10-01 10:00', 'scheduled', 2, 'NORMAL', 'Initial consultation [DEMO DATA]', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO oh_id.queue_entries (id, hospital_id, doctor_id, department_id, appointment_id, patient_id, token_number, status, estimated_wait_minutes)
VALUES 
('q-k-301', 'hosp-kedar', 'doc-k-01', 'dept-k-01', 'appt-k-201', 'p-k-101', 1, 'WAITING', 10)
ON CONFLICT (id) DO NOTHING;
"""

def run_migration():
    print("Executing Kedar Hospital Pilot schema extensions...")
    with get_db_cursor() as cur:
        cur.execute(SCHEMA_EXTENSIONS)
        print("Schema extensions applied successfully.")
        cur.execute(SEED_KEDAR_PILOT)
        print("Kedar Hospital Mugalivakkam branch, staff, roles, and demo seeds applied successfully.")

if __name__ == "__main__":
    run_migration()
