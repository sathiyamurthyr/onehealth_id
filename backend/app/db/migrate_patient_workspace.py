"""
OneHealth ID (OH-ID) Patient Workspace Architecture Migration
Implements:
- Direct linkage of users.user_ref_id to patients.user_id
- Multi-hospital insurance, consent, and document records
- Comprehensive multi-hospital clinical encounters and invoices for p-101
- Clean 16-item Patient-Only Left Navigation configuration in oh_id.roles
"""

from backend.app.database.session import get_db_cursor
import json

MIGRATION_SQL = """
-- 1. Ensure user_id column in oh_id.patients and hospital_id in opd_consultations
ALTER TABLE oh_id.patients ADD COLUMN IF NOT EXISTS user_id VARCHAR(64);
ALTER TABLE oh_id.opd_consultations ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(64);
UPDATE oh_id.patients SET user_id = 'usr-patient' WHERE email = 'alice.smith@example.com' OR id = 'p-101';

-- 2. Create Insurance Table & View
CREATE TABLE IF NOT EXISTS oh_id.patient_insurances (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL,
    provider_name VARCHAR(150) NOT NULL,
    policy_number VARCHAR(100) NOT NULL,
    policy_type VARCHAR(100) DEFAULT 'Comprehensive Health Floater',
    coverage_amount NUMERIC(12, 2) DEFAULT 500000.00,
    valid_from DATE DEFAULT '2026-01-01',
    valid_until DATE DEFAULT '2027-03-31',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    tpa_name VARCHAR(150) DEFAULT 'Medi Assist TPA Services',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE VIEW oh_id.vw_patient_insurances AS
SELECT 
    pi.id,
    pi.patient_id,
    p.name AS patient_name,
    p.onehealth_id,
    pi.provider_name,
    pi.policy_number,
    pi.policy_type,
    pi.coverage_amount,
    pi.valid_from,
    pi.valid_until,
    pi.status,
    pi.tpa_name,
    pi.created_at
FROM oh_id.patient_insurances pi
LEFT JOIN oh_id.patients p ON pi.patient_id = p.id;

-- Seed Patient Insurance
INSERT INTO oh_id.patient_insurances (id, patient_id, provider_name, policy_number, policy_type, coverage_amount, valid_from, valid_until, status, tpa_name)
VALUES 
('ins-101-01', 'p-101', 'Star Health & Allied Insurance', 'SH-FLOATER-2026-88192', 'Family Health Optima Comprehensive', 500000.00, '2026-01-01', '2027-03-31', 'ACTIVE', 'Star Health In-House TPA'),
('ins-101-02', 'p-101', 'HDFC ERGO General Insurance', 'HDFC-TOPUP-2026-44120', 'my:Health Suraksha Super Top-Up', 1000000.00, '2026-04-01', '2027-03-31', 'ACTIVE', 'HDFC ERGO TPA')
ON CONFLICT (id) DO UPDATE SET
    provider_name = EXCLUDED.provider_name,
    policy_number = EXCLUDED.policy_number,
    coverage_amount = EXCLUDED.coverage_amount,
    valid_until = EXCLUDED.valid_until,
    status = EXCLUDED.status;

-- 3. Create Patient Consents & Privacy Table & View
CREATE TABLE IF NOT EXISTS oh_id.patient_consents (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL,
    hospital_id VARCHAR(64) NOT NULL,
    purpose VARCHAR(100) NOT NULL,
    scope VARCHAR(100) DEFAULT 'ALL_RECORDS',
    status VARCHAR(50) DEFAULT 'GRANTED',
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ DEFAULT '2027-12-31 23:59:59+00',
    data_types JSONB DEFAULT '["PRESCRIPTIONS", "DIAGNOSES", "LAB_REPORTS", "DISCHARGE_SUMMARIES"]'::jsonb
);

CREATE OR REPLACE VIEW oh_id.vw_patient_consents AS
SELECT 
    pc.id,
    pc.patient_id,
    p.name AS patient_name,
    p.onehealth_id,
    pc.hospital_id,
    h.name AS hospital_name,
    h.code AS hospital_code,
    pc.purpose,
    pc.scope,
    pc.status,
    pc.granted_at,
    pc.expires_at,
    pc.data_types
FROM oh_id.patient_consents pc
LEFT JOIN oh_id.patients p ON pc.patient_id = p.id
LEFT JOIN oh_id.hospitals h ON pc.hospital_id = h.id;

-- Seed Consents
INSERT INTO oh_id.patient_consents (id, patient_id, hospital_id, purpose, scope, status, granted_at, expires_at)
VALUES 
('con-101-01', 'p-101', 'hosp-kedar', 'Active Consultation & Continuum of Care', 'EPISODE_AND_HISTORY', 'GRANTED', '2026-09-01 00:00:00+00', '2027-09-01 00:00:00+00'),
('con-101-02', 'p-101', 'hosp-001', 'Primary Outpatient Consultation & Diagnostics', 'EPISODE_AND_HISTORY', 'GRANTED', '2026-08-01 00:00:00+00', '2027-08-01 00:00:00+00')
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    expires_at = EXCLUDED.expires_at;

-- 4. Create Medical Documents Table & View
CREATE TABLE IF NOT EXISTS oh_id.medical_documents (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL,
    hospital_id VARCHAR(64) NOT NULL,
    doctor_id VARCHAR(64),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL, -- PRESCRIPTION, LAB_REPORT, DISCHARGE_SUMMARY, CLINICAL_NOTE, BILL, CERTIFICATE
    file_type VARCHAR(20) DEFAULT 'PDF',
    file_size_kb INT DEFAULT 245,
    document_date DATE DEFAULT CURRENT_DATE,
    reference_id VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE VIEW oh_id.vw_medical_documents AS
SELECT 
    md.id,
    md.patient_id,
    p.name AS patient_name,
    p.onehealth_id,
    md.hospital_id,
    h.name AS hospital_name,
    md.doctor_id,
    d.name AS doctor_name,
    md.title,
    md.category,
    md.file_type,
    md.file_size_kb,
    md.document_date,
    md.reference_id,
    md.notes,
    md.created_at
FROM oh_id.medical_documents md
LEFT JOIN oh_id.patients p ON md.patient_id = p.id
LEFT JOIN oh_id.hospitals h ON md.hospital_id = h.id
LEFT JOIN oh_id.doctors d ON md.doctor_id = d.id;

-- Seed Medical Documents for p-101
INSERT INTO oh_id.medical_documents (id, patient_id, hospital_id, doctor_id, title, category, file_type, file_size_kb, document_date, reference_id, notes)
VALUES 
('doc-101-01', 'p-101', 'hosp-kedar', 'doc-k-kumar', 'Orthopedic Prescription - Cervical Spondylosis', 'PRESCRIPTION', 'PDF', 182, '2026-10-02', 'RX-2026-B8B2BE', 'Issued by Dr. Rajesh Kumar at Kedar Hospital'),
('doc-101-02', 'p-101', 'hosp-001', 'd-201', 'Complete Blood Count (CBC) Diagnostic Report', 'LAB_REPORT', 'PDF', 315, '2026-09-17', 'lo-hb-03', 'Biochemistry Laboratory, Apollo City Hospital'),
('doc-101-03', 'p-101', 'hosp-001', 'd-201', 'Glycated Hemoglobin (HbA1c) Diagnostic Report', 'LAB_REPORT', 'PDF', 270, '2026-08-02', 'lo-fbs-01', 'Result 8.9% - Verified by Dr. Pathologist'),
('doc-101-04', 'p-101', 'hosp-001', 'd-201', 'Comprehensive Diabetic Health Summary', 'CLINICAL_NOTE', 'PDF', 410, '2026-09-01', 'c-hist-01', 'Consultation encounter summary with neuropathy review'),
('doc-101-05', 'p-101', 'hosp-kedar', 'doc-k-kumar', 'OPD Consultation Bill INV-2026-KED-10023', 'BILL', 'PDF', 140, '2026-10-02', 'inv-ked-10023', 'Paid via UPI - Kedar Hospital Mugalivakkam')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    document_date = EXCLUDED.document_date;

-- 5. Seed Additional Multi-Hospital Invoice for p-101 at Kedar Hospital
INSERT INTO oh_id.invoices (id, invoice_number, patient_id, hospital_id, appointment_id, subtotal, tax_gst, discount, total_amount, paid_amount, balance_amount, payment_status, created_at)
VALUES 
('inv-ked-10023', 'INV-2026-KED-10023', 'p-101', 'hosp-kedar', 'appt-kumar-01', 1500.00, 0.00, 0.00, 1500.00, 1500.00, 0.00, 'PAID', '2026-10-02 10:15:00+00')
ON CONFLICT (id) DO UPDATE SET
    invoice_number = EXCLUDED.invoice_number,
    total_amount = EXCLUDED.total_amount,
    paid_amount = EXCLUDED.paid_amount,
    payment_status = EXCLUDED.payment_status;

INSERT INTO oh_id.invoice_items (id, invoice_id, item_type, description, quantity, unit_price, total_price)
VALUES 
('ii-ked-01', 'inv-ked-10023', 'CONSULTATION', 'Orthopedic Specialist Consultation - Dr. Rajesh Kumar', 1, 800.00, 800.00),
('ii-ked-02', 'inv-ked-10023', 'PROCEDURE', 'Cervical Spine Ergonomic & Physical Assessment', 1, 700.00, 700.00)
ON CONFLICT (id) DO UPDATE SET
    total_price = EXCLUDED.total_price;

INSERT INTO oh_id.payments (id, invoice_id, payment_mode, amount, transaction_ref, status)
VALUES 
('pay-ked-01', 'inv-ked-10023', 'UPI', 1500.00, 'UPI-KEDAR-9928192', 'COMPLETED')
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Additional OPD Encounters across Hospitals for p-101
INSERT INTO oh_id.opd_consultations (
    id, appointment_id, patient_id, doctor_id, hospital_id, symptoms, diagnosis, clinical_notes,
    vitals, chief_complaint, examination, medical_history, diagnoses, consultation_status, created_at
)
VALUES 
(
    'c-ked-01', 'appt-kumar-01', 'p-101', 'doc-k-kumar', 'hosp-kedar',
    'Neck stiffness radiating to right shoulder, dull aching pain aggravated by desk work',
    'Cervical Spondylosis without Myelopathy',
    'Prescribed muscle relaxants and analgesics. Advised ergonomic cervical pillow and 10 days physiotherapy review.',
    '{"bp": "124/80 mmHg", "pulse": 72, "spo2": 99, "temperature": "98.2 °F", "pain_score": 5, "weight_kg": 71}'::jsonb,
    '{"reason": "Cervical pain and stiffness", "duration": "3 weeks", "onset": "Gradual", "severity": "Moderate"}'::jsonb,
    '{"general": "Alert, oriented, vitals stable", "systems": {"cns": "Reflexes normal, no motor deficit right upper limb", "musculoskeletal": "Spasm in right trapezius, tender C5-C6 paraspinal area"}}'::jsonb,
    '{"allergies": [{"allergen": "Penicillin", "severity": "Severe"}], "chronic_conditions": ["Type 2 Diabetes Mellitus"]}'::jsonb,
    '[{"code": "M47.812", "name": "Spondylosis without myelopathy, cervical region", "type": "Primary", "status": "Confirmed"}]'::jsonb,
    'COMPLETED', '2026-10-02 09:45:00+00'
)
ON CONFLICT (id) DO UPDATE SET
    symptoms = EXCLUDED.symptoms,
    diagnosis = EXCLUDED.diagnosis,
    clinical_notes = EXCLUDED.clinical_notes;

-- 7. Update vw_opd_encounters to include hospital_id and hospital_name
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
    COALESCE(c.hospital_id, d.hospital_id, p.hospital_id) AS hospital_id,
    COALESCE(h.name, 'Apollo City Hospital - Chennai Central') AS hospital_name,
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
    rx.id AS prescription_id,
    rx.status AS prescription_status,
    rx.valid_from AS prescription_valid_from,
    rx.valid_until AS prescription_valid_until,
    rx.signed_at AS prescription_signed_at,
    rx.signed_by AS prescription_signed_by,
    (SELECT COUNT(*) FROM oh_id.prescription_items pi WHERE pi.prescription_id = rx.id) AS medicines_count
FROM oh_id.opd_consultations c
LEFT JOIN oh_id.patients p ON c.patient_id = p.id
LEFT JOIN oh_id.doctors d ON c.doctor_id = d.id
LEFT JOIN oh_id.hospitals h ON COALESCE(c.hospital_id, d.hospital_id, p.hospital_id) = h.id
LEFT JOIN oh_id.prescriptions rx ON rx.consultation_id = c.id;

-- 8. Seed Patient Notifications for Alice Smith
INSERT INTO oh_id.notifications (id, user_id, patient_id, title, message, category, is_read, created_at)
VALUES 
('notif-p-01', 'usr-patient', 'p-101', 'Doctor Appointment Confirmed', 'Your appointment with Dr. Rajesh Kumar at Kedar Hospital is scheduled for today at 09:00 AM.', 'APPOINTMENT', FALSE, '2026-10-02 07:00:00+00'),
('notif-p-02', 'usr-patient', 'p-101', 'Prescription Available', 'Your prescription from Kedar Hospital (Dr. Rajesh Kumar) is signed and ready for viewing.', 'PRESCRIPTION', FALSE, '2026-10-02 10:00:00+00'),
('notif-p-03', 'usr-patient', 'p-101', 'Lab Report Ready', 'Your Complete Blood Count (CBC) report from Apollo Diagnostics is now available.', 'LAB', TRUE, '2026-09-17 14:30:00+00'),
('notif-p-04', 'usr-patient', 'p-101', 'ABDM Consent Log', 'Kedar Hospital accessed your diagnostic records under authorized consultation consent #con-101-01.', 'CONSENT', TRUE, '2026-10-02 09:30:00+00')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    message = EXCLUDED.message;

-- 9. Update role-patient Navigation Configuration in oh_id.roles to Match the Recommended 16-Item Patient Navigation
UPDATE oh_id.roles SET 
    name = 'Patient / Citizen Healthcare Workspace',
    workspace_type = 'PATIENT',
    default_route = '/patient',
    navigation_config = '[
        {"title": "Overview", "href": "/patient", "icon": "LayoutDashboard", "section": "My Health"},
        {"title": "My Profile", "href": "/patient/profile", "icon": "User", "section": "My Health"},
        {"title": "My OneHealth ID", "href": "/patient/onehealth-id", "icon": "CreditCard", "section": "My Health"},
        {"title": "My QR", "href": "/patient/qr", "icon": "QrCode", "section": "My Health"},
        {"title": "Appointments", "href": "/patient/appointments", "icon": "Calendar", "section": "Medical Journey"},
        {"title": "Visits & History", "href": "/patient/visits", "icon": "Clock", "section": "Medical Journey"},
        {"title": "My Doctors", "href": "/patient/doctors", "icon": "Stethoscope", "section": "Medical Journey"},
        {"title": "My Hospitals", "href": "/patient/hospitals", "icon": "Hospital", "section": "Medical Journey"},
        {"title": "Prescriptions", "href": "/patient/prescriptions", "icon": "Pill", "section": "Clinical Records"},
        {"title": "Lab Reports", "href": "/patient/labs", "icon": "TestTube", "section": "Clinical Records"},
        {"title": "Medical Documents", "href": "/patient/documents", "icon": "FileText", "section": "Clinical Records"},
        {"title": "Diagnoses & Procedures", "href": "/patient/diagnoses", "icon": "Activity", "section": "Clinical Records"},
        {"title": "Bills & Payments", "href": "/patient/bills", "icon": "Receipt", "section": "Account & Privacy"},
        {"title": "Insurance", "href": "/patient/insurance", "icon": "ShieldCheck", "section": "Account & Privacy"},
        {"title": "Notifications", "href": "/patient/notifications", "icon": "Bell", "section": "Account & Privacy"},
        {"title": "Consent & Privacy", "href": "/patient/consent", "icon": "ShieldCheck", "section": "Account & Privacy"}
    ]'::jsonb,
    dashboard_layout = '["my_greeting", "upcoming_events", "health_summary_cards", "recent_visits", "recent_prescriptions", "recent_labs", "timeline_preview", "notifications_preview"]'::jsonb
WHERE id = 'role-patient' OR code = 'PATIENT';

-- Ensure patient permissions cover all self-service actions
INSERT INTO oh_id.permissions (id, code, module, description)
VALUES 
('perm-slf-05', 'patient.self.documents', 'patient_self', 'View and download authorized personal medical documents'),
('perm-slf-06', 'patient.self.billing', 'patient_self', 'View personal healthcare invoices and receipts'),
('perm-slf-07', 'patient.self.insurance', 'patient_self', 'View personal health insurance policies and TPA'),
('perm-slf-08', 'patient.self.consent', 'patient_self', 'Manage ABDM zero-knowledge health record consents')
ON CONFLICT (code) DO NOTHING;

INSERT INTO oh_id.role_permissions (role_id, usertype_ref_id, permission_id)
SELECT 'role-patient', 'role-patient', id FROM oh_id.permissions 
WHERE code LIKE 'patient.self.%' OR code = 'dashboard.view'
ON CONFLICT DO NOTHING;
"""

def run_migration():
    print("Executing Patient Workspace Architecture Migration...")
    with get_db_cursor() as cur:
        cur.execute(MIGRATION_SQL)
    print("Patient Workspace Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
