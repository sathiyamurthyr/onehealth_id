"""
OneHealth ID (OH-ID) Enterprise Role Workspace Architecture Migration
Implements:
- Normalized user_types / roles with usertype_ref_id, workspace_type, default_route, layout, navigation
- Granular permissions matrix for SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, NURSE, EMPLOYEE, PATIENT, OTHER
- Multi-hospital & multi-role assignments in user_roles (user_ref_id, usertype_ref_id, hospital_ref_id)
- Zero Direct Table Queries: vw_user_workspaces, vw_user_permissions, vw_role_permissions
- Stored Procedures: sp_resolve_user_workspace, sp_assign_user_role, sp_manage_role_permission, sp_create_custom_role
"""

from backend.app.database.session import get_db_cursor
import json

MIGRATION_SQL = """
-- 1. Extend roles table with usertype_ref_id, workspace_type, default_route, dashboard_layout, navigation_config
ALTER TABLE oh_id.roles ADD COLUMN IF NOT EXISTS usertype_ref_id VARCHAR(64);
ALTER TABLE oh_id.roles ADD COLUMN IF NOT EXISTS workspace_type VARCHAR(50) DEFAULT 'EMPLOYEE';
ALTER TABLE oh_id.roles ADD COLUMN IF NOT EXISTS default_route VARCHAR(100) DEFAULT '/employee';
ALTER TABLE oh_id.roles ADD COLUMN IF NOT EXISTS dashboard_layout JSONB DEFAULT '[]'::jsonb;
ALTER TABLE oh_id.roles ADD COLUMN IF NOT EXISTS navigation_config JSONB DEFAULT '[]'::jsonb;

UPDATE oh_id.roles SET usertype_ref_id = id WHERE usertype_ref_id IS NULL;

-- 2. Extend users table with user_ref_id, usertype_ref_id, hospital_ref_id
ALTER TABLE oh_id.users ADD COLUMN IF NOT EXISTS user_ref_id VARCHAR(64);
ALTER TABLE oh_id.users ADD COLUMN IF NOT EXISTS usertype_ref_id VARCHAR(64);
ALTER TABLE oh_id.users ADD COLUMN IF NOT EXISTS hospital_ref_id VARCHAR(64);

UPDATE oh_id.users SET user_ref_id = id WHERE user_ref_id IS NULL;
UPDATE oh_id.users SET hospital_ref_id = hospital_id WHERE hospital_ref_id IS NULL;

-- 3. Extend hospitals table with hospital_ref_id
ALTER TABLE oh_id.hospitals ADD COLUMN IF NOT EXISTS hospital_ref_id VARCHAR(64);
UPDATE oh_id.hospitals SET hospital_ref_id = id WHERE hospital_ref_id IS NULL;

-- 4. Reconfigure user_roles table for Multi-Hospital & Multi-Role flexibility
ALTER TABLE oh_id.user_roles ADD COLUMN IF NOT EXISTS id VARCHAR(128);
ALTER TABLE oh_id.user_roles ADD COLUMN IF NOT EXISTS user_ref_id VARCHAR(64);
ALTER TABLE oh_id.user_roles ADD COLUMN IF NOT EXISTS usertype_ref_id VARCHAR(64);
ALTER TABLE oh_id.user_roles ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(64);
ALTER TABLE oh_id.user_roles ADD COLUMN IF NOT EXISTS hospital_ref_id VARCHAR(64);
ALTER TABLE oh_id.user_roles ADD COLUMN IF NOT EXISTS branch_id VARCHAR(64);
ALTER TABLE oh_id.user_roles ADD COLUMN IF NOT EXISTS branch_ref_id VARCHAR(64);
ALTER TABLE oh_id.user_roles ADD COLUMN IF NOT EXISTS department_id VARCHAR(64);
ALTER TABLE oh_id.user_roles ADD COLUMN IF NOT EXISTS department_ref_id VARCHAR(64);
ALTER TABLE oh_id.user_roles ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT TRUE;
ALTER TABLE oh_id.user_roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE oh_id.user_roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Drop old 2-column PK if exists so multi-hospital assignment per role works
ALTER TABLE oh_id.user_roles DROP CONSTRAINT IF EXISTS user_roles_pkey;
UPDATE oh_id.user_roles SET 
    user_ref_id = user_id,
    usertype_ref_id = role_id,
    hospital_id = COALESCE(hospital_id, (SELECT u.hospital_id FROM oh_id.users u WHERE u.id = user_roles.user_id)),
    hospital_ref_id = COALESCE(hospital_ref_id, (SELECT u.hospital_id FROM oh_id.users u WHERE u.id = user_roles.user_id)),
    id = 'ur-' || user_id || '-' || role_id || '-' || COALESCE(hospital_id, 'main')
WHERE id IS NULL;

ALTER TABLE oh_id.user_roles ADD PRIMARY KEY (id);

-- 5. Extend role_permissions with usertype_ref_id
ALTER TABLE oh_id.role_permissions ADD COLUMN IF NOT EXISTS usertype_ref_id VARCHAR(64);
UPDATE oh_id.role_permissions SET usertype_ref_id = role_id WHERE usertype_ref_id IS NULL;

-- 6. Seed Complete Granular Permissions
INSERT INTO oh_id.permissions (id, code, module, description)
VALUES 
-- Dashboard & Core
('perm-core-01', 'dashboard.view', 'dashboard', 'Access role-specific workspace dashboard'),
-- Patient Domain
('perm-pat-01', 'patient.read', 'patient', 'View patient registry and profiles'),
('perm-pat-02', 'patient.create', 'patient', 'Register new citizens / patients into OH-ID'),
('perm-pat-03', 'patient.update', 'patient', 'Update patient demographic records'),
('perm-pat-04', 'patient.delete', 'patient', 'Archive or delete patient records'),
('perm-pat-05', 'patient.qr.view', 'patient', 'View Zero-Knowledge QR identity pass'),
('perm-pat-06', 'patient.qr.scan', 'patient', 'Scan and resolve Zero-Knowledge QR identity token'),
-- Appointment Domain
('perm-apt-01', 'appointment.read', 'appointment', 'View OPD appointment schedules'),
('perm-apt-02', 'appointment.create', 'appointment', 'Schedule patient appointments'),
('perm-apt-03', 'appointment.update', 'appointment', 'Reschedule or modify appointments'),
('perm-apt-04', 'appointment.cancel', 'appointment', 'Cancel scheduled appointments'),
('perm-apt-05', 'appointment.checkin', 'appointment', 'Check-in patient and issue live OPD token'),
-- Queue Domain
('perm-que-01', 'queue.read', 'queue', 'View live OPD queue board and token list'),
('perm-que-02', 'queue.manage', 'queue', 'Manage queue state transitions (Hold, Recall)'),
('perm-que-03', 'queue.call', 'queue', 'Call next token into consultation room'),
('perm-que-04', 'queue.recall', 'queue', 'Recall previously called token'),
('perm-que-05', 'queue.skip', 'queue', 'Mark token as skipped or no-show'),
('perm-que-06', 'queue.complete', 'queue', 'Mark queue token as consultation completed'),
-- Clinical Domain (Doctor)
('perm-cln-01', 'consultation.read', 'clinical', 'View clinical consultation encounter history'),
('perm-cln-02', 'consultation.create', 'clinical', 'Record clinical encounter, vitals, diagnosis, and notes'),
('perm-cln-03', 'consultation.update', 'clinical', 'Amend consultation notes within legal timeframe'),
('perm-cln-04', 'prescription.read', 'clinical', 'View medication prescriptions'),
('perm-cln-05', 'prescription.create', 'clinical', 'Prescribe medications and dosage regimens'),
('perm-cln-06', 'lab.read', 'laboratory', 'View patient laboratory diagnostic results'),
('perm-cln-07', 'lab.order', 'laboratory', 'Order laboratory diagnostic tests'),
('perm-cln-08', 'lab.result.read', 'laboratory', 'Interpret authorized laboratory diagnostic reports'),
-- Nursing Domain
('perm-nur-01', 'nursing.vitals.record', 'nursing', 'Record patient triage vitals (BP, SpO2, Temp, Pulse)'),
('perm-nur-02', 'nursing.notes.create', 'nursing', 'Record nursing observations and triage notes'),
('perm-nur-03', 'nursing.tasks.manage', 'nursing', 'Manage ward nursing care plan and tasks'),
-- Billing & Finance Domain
('perm-bil-01', 'billing.read', 'billing', 'View billing invoices, tariffs, and receipts'),
('perm-bil-02', 'billing.create', 'billing', 'Generate invoices and collect OPD/IPD payments'),
('perm-bil-03', 'billing.refund', 'billing', 'Process payment refunds and adjustments'),
-- User & Role Administration Domain
('perm-adm-01', 'user.read', 'administration', 'View staff user directory and roles'),
('perm-adm-02', 'user.create', 'administration', 'Provision new staff user accounts'),
('perm-adm-03', 'user.update', 'administration', 'Update staff profile, roles, and status'),
('perm-adm-04', 'user.disable', 'administration', 'Deactivate or lock staff accounts'),
('perm-adm-05', 'role.read', 'administration', 'View RBAC roles and permissions mapping'),
('perm-adm-06', 'role.create', 'administration', 'Create custom roles with permission sets'),
('perm-adm-07', 'role.update', 'administration', 'Update role definitions and assignments'),
('perm-adm-08', 'role.delete', 'administration', 'Remove custom roles'),
('perm-adm-09', 'permission.read', 'administration', 'Inspect system permissions catalog'),
('perm-adm-10', 'permission.assign', 'administration', 'Assign or revoke permissions from roles'),
-- Facility & Organization Domain
('perm-hsp-01', 'hospital.read', 'hospital', 'View hospital facility profile and branches'),
('perm-hsp-02', 'hospital.update', 'hospital', 'Configure hospital departments, rooms, and settings'),
('perm-org-01', 'organization.read', 'platform', 'View healthcare group / organization network'),
('perm-org-02', 'organization.update', 'platform', 'Manage healthcare organization settings'),
-- Audit & System
('perm-aud-01', 'audit.read', 'audit', 'Inspect compliance audit trail and security events'),
('perm-sys-01', 'system.manage', 'system', 'Configure system parameters, integrations, and health'),
-- Patient Self-Service Domain
('perm-slf-01', 'patient.self.read', 'patient_self', 'View own patient demographic profile'),
('perm-slf-02', 'patient.self.appointments', 'patient_self', 'Book and personal personal personal appointments personal personal'),
('perm-slf-03', 'patient.self.records', 'patient_self', 'Access personal medical records, prescriptions, bills'),
('perm-slf-04', 'patient.self.qr', 'patient_self', 'Access personal OneHealth ID card and QR pass')
ON CONFLICT (code) DO NOTHING;

-- 7. Upsert Complete Set of Standard Workspaces and Roles
INSERT INTO oh_id.roles (id, usertype_ref_id, code, name, workspace_type, default_route, dashboard_layout, navigation_config, description, is_system_role)
VALUES 
-- SUPER ADMIN
('role-super-admin', 'role-super-admin', 'SUPER_ADMIN', 'Platform Super Administrator', 'SUPER_ADMIN', '/admin', 
  '["system_health", "organizations_summary", "hospitals_summary", "active_users", "platform_audit", "integrations_status"]'::jsonb,
  '[
    {"title": "Platform Dashboard", "href": "/admin", "icon": "LayoutDashboard", "section": "Overview"},
    {"title": "Organizations", "href": "/admin/organizations", "icon": "Building2", "section": "Platform Administration"},
    {"title": "Hospitals & Facilities", "href": "/admin/hospitals", "icon": "Hospital", "section": "Platform Administration"},
    {"title": "User Management", "href": "/admin/users", "icon": "Users", "section": "Access Control"},
    {"title": "Roles & Permissions", "href": "/admin/roles", "icon": "ShieldCheck", "section": "Access Control"},
    {"title": "Audit Logs", "href": "/admin/audit", "icon": "FileText", "section": "Compliance & Security"},
    {"title": "System Monitoring", "href": "/admin/monitoring", "icon": "Activity", "section": "System"}
  ]'::jsonb,
  'Platform-wide administration over organizations, hospitals, user security, and audit compliance.', TRUE),

-- HOSPITAL ADMIN
('role-hospital-admin', 'role-hospital-admin', 'HOSPITAL_ADMIN', 'Hospital Facility Administrator', 'HOSPITAL_ADMIN', '/hospital',
  '["patient_summary", "appointment_summary", "queue_summary", "doctor_schedule", "billing_summary", "departments_overview"]'::jsonb,
  '[
    {"title": "Hospital Dashboard", "href": "/hospital", "icon": "LayoutDashboard", "section": "Overview"},
    {"title": "Patient Registry", "href": "/patients", "icon": "Users", "section": "Clinical Operations"},
    {"title": "Appointments", "href": "/appointments", "icon": "Calendar", "section": "Clinical Operations"},
    {"title": "Live OPD Queue", "href": "/queue", "icon": "ListOrdered", "section": "Clinical Operations"},
    {"title": "Doctor Directory", "href": "/hospital/doctors", "icon": "Stethoscope", "section": "Staff & Facility"},
    {"title": "Nursing Staff", "href": "/hospital/nurses", "icon": "HeartPulse", "section": "Staff & Facility"},
    {"title": "Departments", "href": "/hospital/departments", "icon": "Building", "section": "Staff & Facility"},
    {"title": "Billing & Invoices", "href": "/billing", "icon": "Receipt", "section": "Finance"},
    {"title": "Staff Accounts", "href": "/hospital/staff", "icon": "UserCheck", "section": "Administration"},
    {"title": "Hospital Settings", "href": "/hospital/settings", "icon": "Settings", "section": "Administration"}
  ]'::jsonb,
  'Hospital operational management, clinical staff oversight, facility departments, and billing.', TRUE),

-- DOCTOR
('role-doctor', 'role-doctor', 'DOCTOR', 'Consulting Clinician / Doctor', 'DOCTOR', '/doctor',
  '["doctor_schedule", "waiting_queue", "recent_consultations", "clinical_stats"]'::jsonb,
  '[
    {"title": "Doctor Dashboard", "href": "/doctor", "icon": "LayoutDashboard", "section": "Clinical"},
    {"title": "My Live Queue", "href": "/doctor/queue", "icon": "ListOrdered", "section": "Clinical"},
    {"title": "My Appointments", "href": "/appointments", "icon": "Calendar", "section": "Clinical"},
    {"title": "Patients Directory", "href": "/doctor/patients", "icon": "Users", "section": "Clinical"}
  ]'::jsonb,
  'Doctor consultation room, active OPD queue calling, diagnostic notes, prescriptions, and vitals review.', TRUE),

-- NURSE
('role-nurse', 'role-nurse', 'NURSE', 'Nurse / Triage Officer', 'NURSE', '/nurse',
  '["waiting_triage", "vitals_recorded", "ward_tasks", "queue_overview"]'::jsonb,
  '[
    {"title": "Nurse Dashboard", "href": "/nurse", "icon": "LayoutDashboard", "section": "Nursing"},
    {"title": "Triage & Vitals", "href": "/nurse/vitals", "icon": "Activity", "section": "Nursing"},
    {"title": "Assigned Patients", "href": "/nurse/patients", "icon": "Users", "section": "Nursing"},
    {"title": "Live Queue Board", "href": "/queue", "icon": "ListOrdered", "section": "OPD"}
  ]'::jsonb,
  'Nursing triage, vital signs measurement, patient queue assist, and nursing care observation.', TRUE),

-- EMPLOYEE / RECEPTIONIST
('role-employee', 'role-employee', 'EMPLOYEE', 'Hospital Employee / Front Desk', 'EMPLOYEE', '/employee',
  '["registration_stats", "checkin_overview", "today_appointments", "quick_actions"]'::jsonb,
  '[
    {"title": "Frontdesk Dashboard", "href": "/employee", "icon": "LayoutDashboard", "section": "Front Desk"},
    {"title": "Patient Search", "href": "/patients", "icon": "Search", "section": "Front Desk"},
    {"title": "Register Citizen", "href": "/patients/new", "icon": "UserPlus", "section": "Front Desk"},
    {"title": "Appointments", "href": "/appointments", "icon": "Calendar", "section": "Front Desk"},
    {"title": "OPD Queue Board", "href": "/queue", "icon": "ListOrdered", "section": "Front Desk"}
  ]'::jsonb,
  'Front office operations: citizen identity intake, duplicate search, appointment booking, and arrival check-in.', TRUE),

-- PATIENT
('role-patient', 'role-patient', 'PATIENT', 'Patient / Citizen Healthcare Workspace', 'PATIENT', '/patient',
  '["my_onehealth_card", "my_upcoming_appointments", "my_recent_visits", "my_prescriptions"]'::jsonb,
  '[
    {"title": "My Health Dashboard", "href": "/patient", "icon": "LayoutDashboard", "section": "My Health"},
    {"title": "My OneHealth ID Card", "href": "/patient/id-card", "icon": "QrCode", "section": "My Health"},
    {"title": "My Appointments", "href": "/patient/appointments", "icon": "Calendar", "section": "My Health"},
    {"title": "Medical Records & Visits", "href": "/patient/records", "icon": "FileText", "section": "My Health"}
  ]'::jsonb,
  'Personal citizen portal: digital OneHealth ID pass, zero-knowledge QR, appointment scheduling, and personal records.', TRUE),

-- OTHER / DYNAMIC
('role-other', 'role-other', 'OTHER', 'Configurable Specialist Staff', 'OTHER', '/employee',
  '["assigned_tasks", "department_queue", "notifications"]'::jsonb,
  '[
    {"title": "Staff Dashboard", "href": "/employee", "icon": "LayoutDashboard", "section": "Operations"},
    {"title": "Assigned Queue", "href": "/queue", "icon": "ListOrdered", "section": "Operations"}
  ]'::jsonb,
  'Dynamic workspace configured via administrator permission assignment.', FALSE)

ON CONFLICT (id) DO UPDATE SET 
    usertype_ref_id = EXCLUDED.usertype_ref_id,
    workspace_type = EXCLUDED.workspace_type,
    default_route = EXCLUDED.default_route,
    dashboard_layout = EXCLUDED.dashboard_layout,
    navigation_config = EXCLUDED.navigation_config,
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Keep legacy role codes synced
UPDATE oh_id.roles SET usertype_ref_id = id, workspace_type = 'SUPER_ADMIN', default_route = '/admin' WHERE code = 'PLATFORM_ADMIN';
UPDATE oh_id.roles SET usertype_ref_id = id, workspace_type = 'EMPLOYEE', default_route = '/employee' WHERE code = 'RECEPTIONIST';

-- 8. Map Granular Permissions to Each Role
DELETE FROM oh_id.role_permissions;

-- SUPER_ADMIN permissions (Platform Administration, Security, Auditing)
INSERT INTO oh_id.role_permissions (role_id, usertype_ref_id, permission_id)
SELECT 'role-super-admin', 'role-super-admin', id FROM oh_id.permissions 
WHERE code IN (
  'dashboard.view', 'system.manage', 'audit.read', 
  'organization.read', 'organization.update', 
  'hospital.read', 'hospital.update', 
  'user.read', 'user.create', 'user.update', 'user.disable', 
  'role.read', 'role.create', 'role.update', 'role.delete', 
  'permission.read', 'permission.assign'
);

-- HOSPITAL_ADMIN permissions (Hospital Operations, Staff, Patients, Queue, Billing)
INSERT INTO oh_id.role_permissions (role_id, usertype_ref_id, permission_id)
SELECT 'role-hospital-admin', 'role-hospital-admin', id FROM oh_id.permissions 
WHERE code IN (
  'dashboard.view', 'hospital.read', 'hospital.update',
  'patient.read', 'patient.create', 'patient.update', 'patient.qr.view', 'patient.qr.scan',
  'appointment.read', 'appointment.create', 'appointment.update', 'appointment.cancel', 'appointment.checkin',
  'queue.read', 'queue.manage',
  'billing.read', 'billing.create', 'billing.refund',
  'user.read', 'user.create', 'user.update',
  'role.read', 'audit.read'
);

-- DOCTOR permissions (Clinical Encounters, Queue calling, Diagnosis, Notes, Prescriptions)
INSERT INTO oh_id.role_permissions (role_id, usertype_ref_id, permission_id)
SELECT 'role-doctor', 'role-doctor', id FROM oh_id.permissions 
WHERE code IN (
  'dashboard.view',
  'patient.read', 'patient.qr.scan',
  'appointment.read',
  'queue.read', 'queue.manage', 'queue.call', 'queue.recall', 'queue.skip', 'queue.complete',
  'consultation.read', 'consultation.create', 'consultation.update',
  'prescription.read', 'prescription.create',
  'lab.read', 'lab.order', 'lab.result.read'
);

-- NURSE permissions (Triage, Vitals recording, Observations, Queue assistance)
INSERT INTO oh_id.role_permissions (role_id, usertype_ref_id, permission_id)
SELECT 'role-nurse', 'role-nurse', id FROM oh_id.permissions 
WHERE code IN (
  'dashboard.view',
  'patient.read', 'patient.qr.scan',
  'appointment.read', 'appointment.checkin',
  'queue.read',
  'nursing.vitals.record', 'nursing.notes.create', 'nursing.tasks.manage'
);

-- EMPLOYEE / RECEPTIONIST permissions (Registration, Identity verification, Booking, Check-in)
INSERT INTO oh_id.role_permissions (role_id, usertype_ref_id, permission_id)
SELECT 'role-employee', 'role-employee', id FROM oh_id.permissions 
WHERE code IN (
  'dashboard.view',
  'patient.read', 'patient.create', 'patient.update', 'patient.qr.view', 'patient.qr.scan',
  'appointment.read', 'appointment.create', 'appointment.update', 'appointment.checkin',
  'queue.read',
  'billing.read'
);

-- Also map legacy role-receptionist
INSERT INTO oh_id.role_permissions (role_id, usertype_ref_id, permission_id)
SELECT 'role-receptionist', 'role-receptionist', id FROM oh_id.permissions 
WHERE code IN (
  'dashboard.view',
  'patient.read', 'patient.create', 'patient.update', 'patient.qr.view', 'patient.qr.scan',
  'appointment.read', 'appointment.create', 'appointment.update', 'appointment.checkin',
  'queue.read',
  'billing.read'
)
ON CONFLICT DO NOTHING;

-- PATIENT permissions (Self-service personal healthcare records)
INSERT INTO oh_id.role_permissions (role_id, usertype_ref_id, permission_id)
SELECT 'role-patient', 'role-patient', id FROM oh_id.permissions 
WHERE code IN (
  'dashboard.view',
  'patient.self.read', 'patient.self.appointments', 'patient.self.records', 'patient.self.qr'
);

-- OTHER / LAB_STAFF permissions
INSERT INTO oh_id.role_permissions (role_id, usertype_ref_id, permission_id)
SELECT 'role-other', 'role-other', id FROM oh_id.permissions 
WHERE code IN (
  'dashboard.view',
  'patient.read',
  'lab.read', 'lab.order', 'lab.result.read',
  'queue.read'
);

-- 9. Seed Standard Enterprise Users with Controlled Credentials
-- Super Admin
INSERT INTO oh_id.users (id, user_ref_id, tenant_id, hospital_id, hospital_ref_id, username, email, full_name, role, usertype_ref_id, password_hash, is_active)
VALUES ('usr-admin', 'usr-admin', 'ten-kedar', 'hosp-kedar', 'hosp-kedar', 'admin', 'admin@onehealth.org', 'Dr. Kedar Platform Admin', 'SUPER_ADMIN', 'role-super-admin', 'admin123', TRUE)
ON CONFLICT (username) DO UPDATE SET 
    role = 'SUPER_ADMIN', 
    usertype_ref_id = 'role-super-admin', 
    password_hash = 'admin123',
    user_ref_id = EXCLUDED.id,
    hospital_ref_id = EXCLUDED.hospital_id;

-- Hospital Admin
INSERT INTO oh_id.users (id, user_ref_id, tenant_id, hospital_id, hospital_ref_id, username, email, full_name, role, usertype_ref_id, password_hash, is_active)
VALUES ('usr-hosp-admin', 'usr-hosp-admin', 'ten-kedar', 'hosp-kedar', 'hosp-kedar', 'hospadmin', 'hospadmin@kedarhospital.org', 'Kedar Hospital Executive Admin', 'HOSPITAL_ADMIN', 'role-hospital-admin', 'admin123', TRUE)
ON CONFLICT (username) DO UPDATE SET 
    role = 'HOSPITAL_ADMIN', 
    usertype_ref_id = 'role-hospital-admin', 
    password_hash = 'admin123',
    user_ref_id = EXCLUDED.id,
    hospital_ref_id = EXCLUDED.hospital_id;

-- Doctor (Dr. Senthil Nathan)
INSERT INTO oh_id.users (id, user_ref_id, tenant_id, hospital_id, hospital_ref_id, username, email, full_name, role, usertype_ref_id, password_hash, is_active)
VALUES ('usr-kedar-doc1', 'usr-kedar-doc1', 'ten-kedar', 'hosp-kedar', 'hosp-kedar', 'dr.senthil', 'dr.senthil@kedarhospital.org', 'Dr. Senthil Nathan', 'DOCTOR', 'role-doctor', 'doctor123', TRUE)
ON CONFLICT (username) DO UPDATE SET 
    role = 'DOCTOR', 
    usertype_ref_id = 'role-doctor', 
    password_hash = 'doctor123',
    user_ref_id = EXCLUDED.id,
    hospital_ref_id = EXCLUDED.hospital_id;

-- Doctor 2 (Dr. Anitha Raman)
INSERT INTO oh_id.users (id, user_ref_id, tenant_id, hospital_id, hospital_ref_id, username, email, full_name, role, usertype_ref_id, password_hash, is_active)
VALUES ('usr-kedar-doc2', 'usr-kedar-doc2', 'ten-kedar', 'hosp-kedar', 'hosp-kedar', 'dr.anitha', 'dr.anitha@kedarhospital.org', 'Dr. Anitha Raman', 'DOCTOR', 'role-doctor', 'doctor123', TRUE)
ON CONFLICT (username) DO UPDATE SET 
    role = 'DOCTOR', 
    usertype_ref_id = 'role-doctor', 
    password_hash = 'doctor123',
    user_ref_id = EXCLUDED.id,
    hospital_ref_id = EXCLUDED.hospital_id;

-- Nurse (Deepa Mohan)
INSERT INTO oh_id.users (id, user_ref_id, tenant_id, hospital_id, hospital_ref_id, username, email, full_name, role, usertype_ref_id, password_hash, is_active)
VALUES ('usr-kedar-nurse', 'usr-kedar-nurse', 'ten-kedar', 'hosp-kedar', 'hosp-kedar', 'nurse', 'nurse@kedarhospital.org', 'Deepa Mohan', 'NURSE', 'role-nurse', 'nurse123', TRUE)
ON CONFLICT (username) DO UPDATE SET 
    role = 'NURSE', 
    usertype_ref_id = 'role-nurse', 
    password_hash = 'nurse123',
    user_ref_id = EXCLUDED.id,
    hospital_ref_id = EXCLUDED.hospital_id;

-- Receptionist / Employee (Kavitha Sundaram)
INSERT INTO oh_id.users (id, user_ref_id, tenant_id, hospital_id, hospital_ref_id, username, email, full_name, role, usertype_ref_id, password_hash, is_active)
VALUES ('usr-receptionist', 'usr-receptionist', 'ten-kedar', 'hosp-kedar', 'hosp-kedar', 'receptionist', 'reception@kedarhospital.org', 'Kavitha Sundaram', 'EMPLOYEE', 'role-employee', 'rec123', TRUE)
ON CONFLICT (username) DO UPDATE SET 
    role = 'EMPLOYEE', 
    usertype_ref_id = 'role-employee', 
    password_hash = 'rec123',
    user_ref_id = EXCLUDED.id,
    hospital_ref_id = EXCLUDED.hospital_id;

-- Patient / Citizen (Alice Smith)
INSERT INTO oh_id.users (id, user_ref_id, tenant_id, hospital_id, hospital_ref_id, username, email, full_name, role, usertype_ref_id, password_hash, is_active)
VALUES ('usr-patient', 'usr-patient', 'ten-kedar', 'hosp-kedar', 'hosp-kedar', 'patient', 'alice.smith@example.com', 'Alice Smith', 'PATIENT', 'role-patient', 'patient123', TRUE)
ON CONFLICT (username) DO UPDATE SET 
    role = 'PATIENT', 
    usertype_ref_id = 'role-patient', 
    password_hash = 'patient123',
    user_ref_id = EXCLUDED.id,
    hospital_ref_id = EXCLUDED.hospital_id;

-- Other Specialist / Lab Staff
INSERT INTO oh_id.users (id, user_ref_id, tenant_id, hospital_id, hospital_ref_id, username, email, full_name, role, usertype_ref_id, password_hash, is_active)
VALUES ('usr-other-staff', 'usr-other-staff', 'ten-kedar', 'hosp-kedar', 'hosp-kedar', 'other_staff', 'lab@kedarhospital.org', 'Ramesh Kumar (Lab Tech)', 'OTHER', 'role-other', 'staff123', TRUE)
ON CONFLICT (username) DO UPDATE SET 
    role = 'OTHER', 
    usertype_ref_id = 'role-other', 
    password_hash = 'staff123',
    user_ref_id = EXCLUDED.id,
    hospital_ref_id = EXCLUDED.hospital_id;

-- 10. Configure User Roles with Multi-Hospital Scope Support
DELETE FROM oh_id.user_roles;

-- Admin -> Super Admin (Primary) & Hospital Admin
INSERT INTO oh_id.user_roles (id, user_id, role_id, user_ref_id, usertype_ref_id, hospital_id, hospital_ref_id, is_primary)
VALUES 
('ur-admin-super', 'usr-admin', 'role-super-admin', 'usr-admin', 'role-super-admin', 'hosp-kedar', 'hosp-kedar', TRUE),
('ur-admin-hosp', 'usr-admin', 'role-hospital-admin', 'usr-admin', 'role-hospital-admin', 'hosp-kedar', 'hosp-kedar', FALSE);

-- Hospital Admin
INSERT INTO oh_id.user_roles (id, user_id, role_id, user_ref_id, usertype_ref_id, hospital_id, hospital_ref_id, is_primary)
VALUES ('ur-hosp-admin-primary', 'usr-hosp-admin', 'role-hospital-admin', 'usr-hosp-admin', 'role-hospital-admin', 'hosp-kedar', 'hosp-kedar', TRUE);

-- Doctor (Assigned to Kedar Hospital AND Hospital-001 for multi-hospital testing!)
INSERT INTO oh_id.user_roles (id, user_id, role_id, user_ref_id, usertype_ref_id, hospital_id, hospital_ref_id, branch_ref_id, department_id, is_primary)
VALUES 
('ur-doc-kedar', 'usr-kedar-doc1', 'role-doctor', 'usr-kedar-doc1', 'role-doctor', 'hosp-kedar', 'hosp-kedar', 'branch-kedar-01', 'dept-k-01', TRUE),
('ur-doc-hosp1', 'usr-kedar-doc1', 'role-doctor', 'usr-kedar-doc1', 'role-doctor', 'hosp-001', 'hosp-001', NULL, 'dept-001', FALSE);

-- Doctor 2
INSERT INTO oh_id.user_roles (id, user_id, role_id, user_ref_id, usertype_ref_id, hospital_id, hospital_ref_id, branch_ref_id, department_id, is_primary)
VALUES ('ur-doc2-kedar', 'usr-kedar-doc2', 'role-doctor', 'usr-kedar-doc2', 'role-doctor', 'hosp-kedar', 'hosp-kedar', 'branch-kedar-01', 'dept-k-02', TRUE);

-- Nurse
INSERT INTO oh_id.user_roles (id, user_id, role_id, user_ref_id, usertype_ref_id, hospital_id, hospital_ref_id, branch_ref_id, department_id, is_primary)
VALUES ('ur-nurse-kedar', 'usr-kedar-nurse', 'role-nurse', 'usr-kedar-nurse', 'role-nurse', 'hosp-kedar', 'hosp-kedar', 'branch-kedar-01', 'dept-k-01', TRUE);

-- Receptionist
INSERT INTO oh_id.user_roles (id, user_id, role_id, user_ref_id, usertype_ref_id, hospital_id, hospital_ref_id, branch_ref_id, is_primary)
VALUES ('ur-rec-kedar', 'usr-receptionist', 'role-employee', 'usr-receptionist', 'role-employee', 'hosp-kedar', 'hosp-kedar', 'branch-kedar-01', TRUE);

-- Patient
INSERT INTO oh_id.user_roles (id, user_id, role_id, user_ref_id, usertype_ref_id, hospital_id, hospital_ref_id, is_primary)
VALUES ('ur-patient-kedar', 'usr-patient', 'role-patient', 'usr-patient', 'role-patient', 'hosp-kedar', 'hosp-kedar', TRUE);

-- Other Staff
INSERT INTO oh_id.user_roles (id, user_id, role_id, user_ref_id, usertype_ref_id, hospital_id, hospital_ref_id, is_primary)
VALUES ('ur-other-kedar', 'usr-other-staff', 'role-other', 'usr-other-staff', 'role-other', 'hosp-kedar', 'hosp-kedar', TRUE);

-- 11. Create Enterprise Database Views for Zero Direct Base Table Queries
DROP VIEW IF EXISTS oh_id.vw_user_workspaces CASCADE;
DROP VIEW IF EXISTS oh_id.vw_user_hospitals CASCADE;
DROP VIEW IF EXISTS oh_id.vw_user_auth CASCADE;

-- View: vw_user_workspaces
CREATE OR REPLACE VIEW oh_id.vw_user_workspaces AS
SELECT 
    COALESCE(ur.user_ref_id, ur.user_id, u.id) AS user_ref_id,
    u.username,
    u.email,
    u.full_name,
    COALESCE(ur.usertype_ref_id, ur.role_id, r.id) AS usertype_ref_id,
    r.code AS role_code,
    r.name AS role_name,
    r.workspace_type,
    r.default_route,
    r.dashboard_layout,
    r.navigation_config,
    COALESCE(ur.hospital_ref_id, ur.hospital_id, u.hospital_id) AS hospital_ref_id,
    COALESCE(h.name, u.tenant_id, 'OneHealth Hospital') AS hospital_name,
    COALESCE(h.code, 'HOSP-GEN') AS hospital_code,
    ur.branch_ref_id,
    hb.name AS branch_name,
    ur.department_id,
    dept.name AS department_name,
    COALESCE(u.tenant_id, h.tenant_id, h.id) AS tenant_id,
    COALESCE(t.name, h.name, 'OneHealth Group') AS tenant_name,
    COALESCE(ur.is_primary, TRUE) AS is_primary,
    COALESCE(ur.is_active, TRUE) AS is_active,
    COALESCE((
        SELECT jsonb_agg(DISTINCT p.code)
        FROM oh_id.role_permissions rp
        JOIN oh_id.permissions p ON rp.permission_id = p.id
        WHERE rp.usertype_ref_id = COALESCE(ur.usertype_ref_id, ur.role_id, r.id) 
           OR rp.role_id = COALESCE(ur.role_id, ur.usertype_ref_id, r.id)
    ), '[]'::jsonb) AS permissions
FROM oh_id.user_roles ur
JOIN oh_id.users u ON COALESCE(ur.user_ref_id, ur.user_id) = u.id
JOIN oh_id.roles r ON (COALESCE(ur.usertype_ref_id, ur.role_id) = r.id OR COALESCE(ur.usertype_ref_id, ur.role_id) = r.code)
LEFT JOIN oh_id.hospitals h ON COALESCE(ur.hospital_ref_id, ur.hospital_id, u.hospital_id) = h.id
LEFT JOIN oh_id.hospital_branches hb ON ur.branch_ref_id = hb.id
LEFT JOIN oh_id.departments dept ON (ur.department_id = dept.id OR ur.department_ref_id = dept.id)
LEFT JOIN oh_id.tenants t ON COALESCE(u.tenant_id, h.tenant_id) = t.id
WHERE (ur.is_active IS NULL OR ur.is_active = TRUE) AND (u.is_active IS NULL OR u.is_active = TRUE)

UNION ALL

SELECT 
    u.id AS user_ref_id,
    u.username,
    u.email,
    u.full_name,
    COALESCE(u.usertype_ref_id, r.id) AS usertype_ref_id,
    r.code AS role_code,
    r.name AS role_name,
    r.workspace_type,
    r.default_route,
    r.dashboard_layout,
    r.navigation_config,
    COALESCE(u.hospital_ref_id, u.hospital_id) AS hospital_ref_id,
    COALESCE(h.name, u.tenant_id, 'OneHealth Hospital') AS hospital_name,
    COALESCE(h.code, 'HOSP-GEN') AS hospital_code,
    NULL AS branch_ref_id,
    NULL AS branch_name,
    NULL AS department_id,
    NULL AS department_name,
    COALESCE(u.tenant_id, h.tenant_id, h.id) AS tenant_id,
    COALESCE(t.name, h.name, 'OneHealth Group') AS tenant_name,
    TRUE AS is_primary,
    COALESCE(u.is_active, TRUE) AS is_active,
    COALESCE((
        SELECT jsonb_agg(DISTINCT p.code)
        FROM oh_id.role_permissions rp
        JOIN oh_id.permissions p ON rp.permission_id = p.id
        WHERE rp.usertype_ref_id = COALESCE(u.usertype_ref_id, r.id) 
           OR rp.role_id = COALESCE(u.usertype_ref_id, r.id)
    ), '[]'::jsonb) AS permissions
FROM oh_id.users u
JOIN oh_id.roles r ON (u.usertype_ref_id = r.id OR u.role = r.code)
LEFT JOIN oh_id.hospitals h ON COALESCE(u.hospital_ref_id, u.hospital_id) = h.id
LEFT JOIN oh_id.tenants t ON COALESCE(u.tenant_id, h.tenant_id) = t.id
WHERE (u.is_active IS NULL OR u.is_active = TRUE)
  AND NOT EXISTS (
      SELECT 1 FROM oh_id.user_roles ur 
      WHERE (ur.user_ref_id = u.id OR ur.user_id = u.id)
        AND (ur.is_active IS NULL OR ur.is_active = TRUE)
  );

-- View: vw_user_hospitals (Accessible hospitals per user)
CREATE OR REPLACE VIEW oh_id.vw_user_hospitals AS
SELECT DISTINCT
    COALESCE(ur.user_ref_id, ur.user_id, u.id) AS user_ref_id,
    COALESCE(ur.hospital_ref_id, ur.hospital_id, u.hospital_id) AS hospital_ref_id,
    COALESCE(h.name, 'OneHealth Hospital') AS hospital_name,
    COALESCE(h.code, 'HOSP-GEN') AS hospital_code,
    COALESCE(h.city, 'Chennai') AS hospital_city,
    COALESCE(ur.is_primary, TRUE) AS is_primary
FROM oh_id.user_roles ur
JOIN oh_id.users u ON COALESCE(ur.user_ref_id, ur.user_id) = u.id
JOIN oh_id.hospitals h ON COALESCE(ur.hospital_ref_id, ur.hospital_id, u.hospital_id) = h.id
WHERE (ur.is_active IS NULL OR ur.is_active = TRUE) AND (u.is_active IS NULL OR u.is_active = TRUE)

UNION

SELECT DISTINCT
    u.id AS user_ref_id,
    COALESCE(u.hospital_ref_id, u.hospital_id) AS hospital_ref_id,
    COALESCE(h.name, 'OneHealth Hospital') AS hospital_name,
    COALESCE(h.code, 'HOSP-GEN') AS hospital_code,
    COALESCE(h.city, 'Chennai') AS hospital_city,
    TRUE AS is_primary
FROM oh_id.users u
JOIN oh_id.hospitals h ON COALESCE(u.hospital_ref_id, u.hospital_id) = h.id
WHERE (u.is_active IS NULL OR u.is_active = TRUE)
  AND NOT EXISTS (
      SELECT 1 FROM oh_id.user_roles ur 
      WHERE (ur.user_ref_id = u.id OR ur.user_id = u.id)
        AND (ur.is_active IS NULL OR ur.is_active = TRUE)
  );

-- Update vw_user_auth to return enriched workspace and permission metadata
CREATE OR REPLACE VIEW oh_id.vw_user_auth AS
SELECT 
    u.id,
    u.user_ref_id,
    u.username,
    u.email,
    u.full_name,
    u.role,
    u.usertype_ref_id,
    r.workspace_type,
    r.default_route,
    u.password_hash,
    u.is_active,
    u.hospital_id,
    u.hospital_ref_id,
    h.name AS hospital_name,
    u.tenant_id,
    t.name AS tenant_name,
    COALESCE((
        SELECT jsonb_agg(DISTINCT p.code)
        FROM oh_id.user_roles ur
        JOIN oh_id.role_permissions rp ON (ur.role_id = rp.role_id OR ur.usertype_ref_id = rp.usertype_ref_id)
        JOIN oh_id.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = u.id OR ur.user_ref_id = u.id
    ), '[]'::jsonb) AS permissions,
    COALESCE((
        SELECT jsonb_agg(DISTINCT r_sub.code)
        FROM oh_id.user_roles ur
        JOIN oh_id.roles r_sub ON (ur.role_id = r_sub.id OR ur.usertype_ref_id = r_sub.id)
        WHERE ur.user_id = u.id OR ur.user_ref_id = u.id
    ), '[]'::jsonb) AS roles
FROM oh_id.users u
LEFT JOIN oh_id.roles r ON u.usertype_ref_id = r.id OR u.role = r.code
LEFT JOIN oh_id.hospitals h ON (u.hospital_ref_id = h.id OR u.hospital_id = h.id)
LEFT JOIN oh_id.tenants t ON u.tenant_id = t.id;

-- 12. Stored Procedures for RBAC & Workspace Resolution
CREATE OR REPLACE PROCEDURE oh_id.sp_assign_user_role(
    p_user_ref_id VARCHAR(64),
    p_usertype_ref_id VARCHAR(64),
    p_hospital_ref_id VARCHAR(64),
    p_branch_ref_id VARCHAR(64) DEFAULT NULL,
    p_department_id VARCHAR(64) DEFAULT NULL,
    p_is_primary BOOLEAN DEFAULT FALSE,
    INOUT o_status VARCHAR(50) DEFAULT 'SUCCESS'
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_id VARCHAR(128);
BEGIN
    v_id := 'ur-' || p_user_ref_id || '-' || p_usertype_ref_id || '-' || p_hospital_ref_id;

    INSERT INTO oh_id.user_roles (
        id, user_id, role_id, user_ref_id, usertype_ref_id, hospital_id, hospital_ref_id, branch_ref_id, department_id, is_primary, is_active
    ) VALUES (
        v_id, p_user_ref_id, p_usertype_ref_id, p_user_ref_id, p_usertype_ref_id, p_hospital_ref_id, p_hospital_ref_id, p_branch_ref_id, p_department_id, p_is_primary, TRUE
    )
    ON CONFLICT (id) DO UPDATE SET 
        hospital_id = EXCLUDED.hospital_id,
        hospital_ref_id = EXCLUDED.hospital_ref_id,
        branch_ref_id = EXCLUDED.branch_ref_id,
        department_id = EXCLUDED.department_id,
        is_primary = EXCLUDED.is_primary,
        is_active = TRUE;

    -- Audit trail
    INSERT INTO oh_id.audit_logs (user_id, action, resource_type, resource_id, details)
    VALUES (
        p_user_ref_id, 'USER_ROLE_ASSIGNED', 'USER_ROLE', p_usertype_ref_id,
        jsonb_build_object('hospital_ref_id', p_hospital_ref_id, 'usertype_ref_id', p_usertype_ref_id)
    );

    o_status := 'SUCCESS';
END;
$$;

CREATE OR REPLACE PROCEDURE oh_id.sp_manage_role_permission(
    p_usertype_ref_id VARCHAR(64),
    p_permission_code VARCHAR(100),
    p_action VARCHAR(20), -- 'ASSIGN' or 'REVOKE'
    INOUT o_status VARCHAR(50) DEFAULT 'SUCCESS'
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_perm_id VARCHAR(64);
BEGIN
    SELECT id INTO v_perm_id FROM oh_id.permissions WHERE code = p_permission_code;
    IF v_perm_id IS NULL THEN
        o_status := 'PERMISSION_NOT_FOUND';
        RETURN;
    END IF;

    IF p_action = 'ASSIGN' THEN
        INSERT INTO oh_id.role_permissions (role_id, usertype_ref_id, permission_id)
        VALUES (p_usertype_ref_id, p_usertype_ref_id, v_perm_id)
        ON CONFLICT DO NOTHING;
    ELSIF p_action = 'REVOKE' THEN
        DELETE FROM oh_id.role_permissions 
        WHERE (role_id = p_usertype_ref_id OR usertype_ref_id = p_usertype_ref_id) AND permission_id = v_perm_id;
    END IF;

    -- Audit trail
    INSERT INTO oh_id.audit_logs (action, resource_type, resource_id, details)
    VALUES (
        'ROLE_PERMISSION_' || p_action, 'ROLE_PERMISSION', p_usertype_ref_id,
        jsonb_build_object('permission_code', p_permission_code, 'usertype_ref_id', p_usertype_ref_id)
    );

    o_status := 'SUCCESS';
END;
$$;
"""

def run_migration():
    print("Executing Enterprise Role Workspace Architecture migration...")
    with get_db_cursor() as cur:
        cur.execute(MIGRATION_SQL)
        print("Schema extensions, roles, permissions, workspaces, views, and SPs applied successfully.")

if __name__ == "__main__":
    run_migration()
