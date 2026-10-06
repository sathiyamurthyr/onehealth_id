"""
OneHealth ID (OH-ID) Family Healthcare Model — Schema & Data Migration
Implements:
1. `oh_id.family_relationships` table with configurable relationships, minor/guardian flags, and granular consent/permissions.
2. `oh_id.family_audit_logs` table for strict logging of all family record access.
3. `oh_id.vw_family_members` view for comprehensive family member metadata and metrics.
4. Seeds additional healthcare providers (Children's Specialty Clinic, City Care Hospital).
5. Seeds independent patient identities, unique OH-IDs, zero-knowledge QR tokens, and distinct multi-hospital clinical encounters, prescriptions, lab reports, appointments, documents, and bills for:
   - Primary: Alice Smith (p-101, OHID-IND-2026-01001)
   - Spouse: Bob Smith (p-102, OHID-IND-2026-01002)
   - Child (Minor): Charlie Smith (p-103, OHID-IND-2026-01003)
   - Mother: Dorothy Smith (p-104, OHID-IND-2026-01004)
"""

from backend.app.database.session import get_db_cursor
import json

FAMILY_MIGRATION_SQL = """
-- 1. Create Extra Hospitals if not exist
INSERT INTO oh_id.hospitals (id, name, code, address, city, state, country, phone, email, is_active, hospital_ref_id)
VALUES 
('hosp-child-01', 'Children''s Specialty Clinic & Pediatric Care', 'CHILD-CHE-01', '45 Gandhi Road, Anna Nagar', 'Chennai', 'Tamil Nadu', 'India', '+91 44 2619 4400', 'care@childrensclinic.org', TRUE, 'hosp-child-01'),
('hosp-city-01', 'City Care Multi-Specialty Hospital & Diagnostic Centre', 'CITY-CHE-01', '12 Velachery Main Road', 'Chennai', 'Tamil Nadu', 'India', '+91 44 2243 5500', 'info@citycarehospital.in', TRUE, 'hosp-city-01')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    city = EXCLUDED.city;

-- 2. Create Doctors for New Hospitals
INSERT INTO oh_id.doctors (id, hospital_id, name, specialty, qualification, registration_number, phone, email, is_available)
VALUES 
('doc-ped-01', 'hosp-child-01', 'Dr. Ananya Swaminathan', 'Pediatrics & Pediatric Pulmonology', 'MBBS, MD (Pediatrics), DNB', 'TN-MCI-2018-88219', '+91 98402 11223', 'ananya.ped@childrensclinic.org', TRUE),
('doc-rheum-01', 'hosp-city-01', 'Dr. Meenakshi Sundaram', 'Rheumatology & Geriatric Medicine', 'MBBS, MD (Medicine), DM (Rheum)', 'TN-MCI-2012-44190', '+91 98403 44556', 'meenakshi.s@citycarehospital.in', TRUE),
('doc-card-01', 'hosp-001', 'Dr. S. Ramanathan', 'Cardiology & Internal Medicine', 'MBBS, MD, DM (Cardio)', 'TN-MCI-2010-33211', '+91 98401 55667', 'ramanathan.cardio@apollo.org', TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    specialty = EXCLUDED.specialty,
    hospital_id = EXCLUDED.hospital_id;

-- 3. Create oh_id.family_relationships Table
CREATE TABLE IF NOT EXISTS oh_id.family_relationships (
    id VARCHAR(64) PRIMARY KEY,
    primary_patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
    member_patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
    relationship VARCHAR(50) NOT NULL, -- SPOUSE, SON, DAUGHTER, FATHER, MOTHER, BROTHER, SISTER, GRANDFATHER, GRANDMOTHER, GRANDCHILD, LEGAL_GUARDIAN, DEPENDENT, OTHER
    is_guardian BOOLEAN DEFAULT FALSE,
    is_minor BOOLEAN DEFAULT FALSE,
    consent_status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, PENDING_APPROVAL, REVOKED
    permissions JSONB DEFAULT '{"view_appointments": true, "book_appointments": true, "view_records": true, "view_prescriptions": true, "view_lab_reports": true, "view_bills": true, "manage_profile": false, "receive_notifications": true}'::jsonb,
    emergency_contact_priority INT DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_family_pair UNIQUE (primary_patient_id, member_patient_id)
);

-- 4. Create oh_id.family_audit_logs Table
CREATE TABLE IF NOT EXISTS oh_id.family_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor_user_id VARCHAR(64) NOT NULL,
    actor_patient_id VARCHAR(64) NOT NULL,
    target_patient_id VARCHAR(64) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    hospital_id VARCHAR(64),
    authorization_basis VARCHAR(100) NOT NULL, -- AUTHORIZED_GUARDIAN_ACCESS, ACTIVE_FAMILY_CONSENT, SELF_ACCESS
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Add dob column to patients if not exists
ALTER TABLE oh_id.patients ADD COLUMN IF NOT EXISTS dob VARCHAR(20);

-- 6. Seed / Update Distinct Patient Records for Family Members
INSERT INTO oh_id.patients (
    id, onehealth_id, name, age, dob, gender, phone, email, address, city, state,
    blood_group, emergency_contact, qr_token, status, diagnosis, hospital_id
)
VALUES 
(
    'p-102', 'OHID-IND-2026-01002', 'Bob Smith', 36, '1990-04-12', 'Male', '+91 98401 23457', 'bob.smith@example.com',
    'Plot 14, River View Colony, Manapakkam', 'Chennai', 'Tamil Nadu',
    'O+ Positive', 'Alice Smith (+91 98401 23456)', 'ZK-QR-BOB-01002-2026', 'ACTIVE',
    'Essential Hypertension Stage 1 & Dyslipidemia', 'hosp-001'
),
(
    'p-103', 'OHID-IND-2026-01003', 'Charlie Smith', 7, '2019-06-15', 'Male', '+91 98401 23456', 'alice.smith@example.com',
    'Plot 14, River View Colony, Manapakkam', 'Chennai', 'Tamil Nadu',
    'B+ Positive', 'Alice Smith (Mother) (+91 98401 23456)', 'ZK-QR-CHARLIE-01003-2026', 'ACTIVE',
    'Childhood Allergic Bronchitis & Rhinitis', 'hosp-child-01'
),
(
    'p-104', 'OHID-IND-2026-01004', 'Dorothy Smith', 62, '1964-03-22', 'Female', '+91 98401 99881', 'dorothy.smith@example.com',
    'Flat 3B, Sunshine Apartments, Velachery', 'Chennai', 'Tamil Nadu',
    'A+ Positive', 'Alice Smith (Daughter-in-law) (+91 98401 23456)', 'ZK-QR-DOROTHY-01004-2026', 'ACTIVE',
    'Bilateral Knee Osteoarthritis Grade 2 & Osteopenia', 'hosp-city-01'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    onehealth_id = EXCLUDED.onehealth_id,
    age = EXCLUDED.age,
    dob = EXCLUDED.dob,
    gender = EXCLUDED.gender,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    blood_group = EXCLUDED.blood_group,
    emergency_contact = EXCLUDED.emergency_contact,
    diagnosis = EXCLUDED.diagnosis,
    hospital_id = EXCLUDED.hospital_id;

-- 7. Link Family Relationships for Alice Smith (p-101)
INSERT INTO oh_id.family_relationships (
    id, primary_patient_id, member_patient_id, relationship, is_guardian, is_minor,
    consent_status, permissions, emergency_contact_priority, notes
)
VALUES 
(
    'rel-101-102', 'p-101', 'p-102', 'SPOUSE', FALSE, FALSE,
    'ACTIVE',
    '{"view_appointments": true, "book_appointments": true, "view_records": true, "view_prescriptions": true, "view_lab_reports": true, "view_bills": true, "manage_profile": false, "receive_notifications": true}'::jsonb,
    1, 'Spouse - Authorized Adult Medical Records & Appointment Access'
),
(
    'rel-101-103', 'p-101', 'p-103', 'SON', TRUE, TRUE,
    'ACTIVE',
    '{"view_appointments": true, "book_appointments": true, "view_records": true, "view_prescriptions": true, "view_lab_reports": true, "view_bills": true, "manage_profile": true, "receive_notifications": true}'::jsonb,
    1, 'Minor Child - Authorized Legal Guardian Full Healthcare Management'
),
(
    'rel-101-104', 'p-101', 'p-104', 'MOTHER', FALSE, FALSE,
    'ACTIVE',
    '{"view_appointments": true, "book_appointments": true, "view_records": true, "view_prescriptions": true, "view_lab_reports": true, "view_bills": true, "manage_profile": false, "receive_notifications": true}'::jsonb,
    2, 'Mother - Authorized Health Records Access & Appointment Scheduling'
)
ON CONFLICT (id) DO UPDATE SET
    relationship = EXCLUDED.relationship,
    is_guardian = EXCLUDED.is_guardian,
    is_minor = EXCLUDED.is_minor,
    consent_status = EXCLUDED.consent_status,
    permissions = EXCLUDED.permissions,
    notes = EXCLUDED.notes;

-- 8. Seed Appointments for Family Members (Separated Ownership)
INSERT INTO oh_id.appointments (
    id, patient_id, doctor_id, hospital_id, slot, status, token_number, priority, notes
)
VALUES 
(
    'appt-bob-01', 'p-102', 'doc-card-01', 'hosp-001',
    '2026-10-07 16:00', 'scheduled', 14, 'NORMAL',
    'Quarterly Cardiology & BP Review (Dr. S. Ramanathan)'
),
(
    'appt-charlie-01', 'p-103', 'doc-ped-01', 'hosp-child-01',
    '2026-10-05 09:00', 'scheduled', 3, 'HIGH',
    'Pediatric Allergy & Wheezing Evaluation (Dr. Ananya Swaminathan)'
),
(
    'appt-dorothy-01', 'p-104', 'doc-rheum-01', 'hosp-city-01',
    '2026-10-12 11:30', 'scheduled', 8, 'NORMAL',
    'Rheumatology Joint Pain Review & DEXA Analysis (Dr. Meenakshi Sundaram)'
)
ON CONFLICT (id) DO UPDATE SET
    slot = EXCLUDED.slot,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes;

-- 9. Seed OPD Consultations for Family Members
INSERT INTO oh_id.opd_consultations (
    id, appointment_id, patient_id, doctor_id, hospital_id, symptoms, diagnosis, clinical_notes,
    vitals, chief_complaint, examination, medical_history, diagnoses, consultation_status, created_at
)
VALUES 
(
    'c-bob-01', 'appt-bob-01', 'p-102', 'doc-card-01', 'hosp-001',
    'Occasional occipital headache, fatigue on exertion',
    'Stage 1 Essential Hypertension & Dyslipidemia',
    'BP elevated at 138/88 mmHg. Started Telmisartan 40mg and Rosuvastatin 10mg. Advised low sodium diet and 30 mins brisk walking daily.',
    '{"bp": "138/88 mmHg", "pulse": 76, "spo2": 98, "temperature": "98.4 °F", "weight_kg": 78}'::jsonb,
    '{"reason": "Headaches and routine health check", "duration": "1 month"}'::jsonb,
    '{"general": "Patient active, no peripheral edema", "cvs": "S1 S2 heard, no murmur"}'::jsonb,
    '{"allergies": [], "chronic_conditions": ["Hypertension"]}'::jsonb,
    '[{"code": "I10", "name": "Essential (primary) hypertension", "type": "Primary", "status": "Confirmed"}, {"code": "E78.5", "name": "Hyperlipidemia, unspecified", "type": "Secondary", "status": "Confirmed"}]'::jsonb,
    'COMPLETED', '2026-09-20 16:30:00+00'
),
(
    'c-charlie-01', 'appt-charlie-01', 'p-103', 'doc-ped-01', 'hosp-child-01',
    'Dry barking cough, chest tightness especially during night, clear nasal discharge',
    'Childhood Allergic Bronchitis with Mild Hyperactive Airway',
    'Chest bilateral mild rhonchi. Prescribed Levocetirizine and Budesonide nebulization for acute flares. Avoid cold allergens and dust.',
    '{"bp": "100/65 mmHg", "pulse": 88, "spo2": 99, "temperature": "98.6 °F", "weight_kg": 22}'::jsonb,
    '{"reason": "Persistent dry cough", "duration": "2 weeks"}'::jsonb,
    '{"general": "Child alert, playful, no cyanosis", "respiratory": "Bilateral expiratory rhonchi"}'::jsonb,
    '{"allergies": [{"allergen": "Dust mites", "severity": "Moderate"}], "chronic_conditions": ["Allergic Rhinitis"]}'::jsonb,
    '[{"code": "J45.0", "name": "Predominantly allergic asthma", "type": "Primary", "status": "Confirmed"}]'::jsonb,
    'COMPLETED', '2026-09-10 10:15:00+00'
),
(
    'c-dorothy-01', 'appt-dorothy-01', 'p-104', 'doc-rheum-01', 'hosp-city-01',
    'Dull aching pain in both knee joints, difficulty climbing stairs, morning stiffness for 15 minutes',
    'Bilateral Primary Osteoarthritis of Knee & Spine Osteopenia',
    'Crepitus noted in bilateral patellofemoral joints. DEXA shows spine osteopenia (T-Score -1.8). Started Calcium + Vit D3 and Glucosamine.',
    '{"bp": "130/82 mmHg", "pulse": 74, "spo2": 97, "temperature": "98.1 °F", "weight_kg": 64}'::jsonb,
    '{"reason": "Bilateral knee joint pain", "duration": "6 months"}'::jsonb,
    '{"general": "Elderly female, ambulatory with mild antalgic gait", "musculoskeletal": "Bilateral knee crepitus, no effusion"}'::jsonb,
    '{"allergies": [], "chronic_conditions": ["Osteoarthritis", "Osteopenia"]}'::jsonb,
    '[{"code": "M17.0", "name": "Bilateral primary osteoarthritis of knee", "type": "Primary", "status": "Confirmed"}, {"code": "M85.8", "name": "Other specified disorders of bone density and structure", "type": "Secondary", "status": "Confirmed"}]'::jsonb,
    'COMPLETED', '2026-08-15 11:45:00+00'
)
ON CONFLICT (id) DO UPDATE SET
    diagnosis = EXCLUDED.diagnosis,
    clinical_notes = EXCLUDED.clinical_notes;

-- 10. Seed Prescriptions for Family Members
INSERT INTO oh_id.prescriptions (
    id, consultation_id, patient_id, doctor_id, valid_from, valid_until,
    instructions, status, signed_at, signed_by, created_at
)
VALUES 
(
    'rx-bob-01', 'c-bob-01', 'p-102', 'doc-card-01', '2026-09-20', '2026-10-20',
    'Take blood pressure medicine every morning after breakfast. Rosuvastatin at night.',
    'ACTIVE', '2026-09-20 16:45:00+00', 'Dr. S. Ramanathan (TN-MCI-2010-33211)', '2026-09-20 16:45:00+00'
),
(
    'rx-charlie-01', 'c-charlie-01', 'p-103', 'doc-ped-01', '2026-09-10', '2026-09-25',
    'Levocetirizine syrup daily at bedtime. Nebulize with Budesonide only during cough flare-ups.',
    'COMPLETED', '2026-09-10 10:30:00+00', 'Dr. Ananya Swaminathan (TN-MCI-2018-88219)', '2026-09-10 10:30:00+00'
),
(
    'rx-dorothy-01', 'c-dorothy-01', 'p-104', 'doc-rheum-01', '2026-08-15', '2026-11-15',
    'Calcium supplement once daily with milk. Paracetamol only when knee pain is severe.',
    'ACTIVE', '2026-08-15 12:00:00+00', 'Dr. Meenakshi Sundaram (TN-MCI-2012-44190)', '2026-08-15 12:00:00+00'
)
ON CONFLICT (id) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    status = EXCLUDED.status;

-- Seed Prescription Items
INSERT INTO oh_id.prescription_items (
    id, prescription_id, medicine_name, generic_name, dosage, dosage_form,
    frequency, duration_days, food_instruction, specific_instructions
)
VALUES 
('pi-bob-01', 'rx-bob-01', 'Telma 40', 'Telmisartan', '40 mg', 'Tablet', '1-0-0', 30, 'AFTER_FOOD', 'Morning after breakfast'),
('pi-bob-02', 'rx-bob-01', 'Rosuvas 10', 'Rosuvastatin', '10 mg', 'Tablet', '0-0-1', 30, 'AFTER_FOOD', 'Night before bedtime'),
('pi-chr-01', 'rx-charlie-01', 'Levocet Syrup', 'Levocetirizine', '2.5 mg/5ml', 'Syrup', '0-0-1', 7, 'AFTER_FOOD', '2.5 ml at bedtime'),
('pi-chr-02', 'rx-charlie-01', 'Budecort Respules 0.5', 'Budesonide', '0.5 mg', 'Respule', '1-0-1', 5, 'INHALATION', 'Nebulization BD'),
('pi-dor-01', 'rx-dorothy-01', 'Shelcal-HD', 'Calcium Citrate + Vitamin D3', '500 mg + 1000 IU', 'Tablet', '1-0-0', 90, 'AFTER_FOOD', 'After breakfast'),
('pi-dor-02', 'rx-dorothy-01', 'Jointace Trio', 'Glucosamine + Collagen', '1500 mg', 'Tablet', '1-0-0', 60, 'AFTER_FOOD', 'Knee cartilage support'),
('pi-dor-03', 'rx-dorothy-01', 'Dolo 650', 'Paracetamol', '650 mg', 'Tablet', 'SOS', 10, 'AFTER_FOOD', 'Max 2 tablets/day during acute pain')
ON CONFLICT (id) DO UPDATE SET
    dosage = EXCLUDED.dosage,
    duration_days = EXCLUDED.duration_days;

-- 11. Seed Lab Orders & Catalog for Family Members
INSERT INTO oh_id.lab_test_catalog (id, name, code, category, price, turnaround_hours, normal_range)
VALUES 
('lt-06', 'Pediatric Serum IgE & Absolute Eosinophil Count', 'IGE-PED-01', 'Immunology', 750.00, 4, 'Total IgE < 100 IU/mL'),
('lt-07', 'DEXA Bone Mineral Density (BMD) Scan', 'DEXA-01', 'Radiology', 1800.00, 2, 'T-Score > -1.0 Normal'),
('lt-08', 'Serum Uric Acid & ESR Profile', 'URIC-01', 'Biochemistry', 400.00, 2, '2.5 - 6.5 mg/dL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO oh_id.lab_orders (
    id, patient_id, test_id, doctor_id, hospital_id, status, priority,
    result_value, result_unit, is_abnormal, verified_by, ordered_at, completed_at
)
VALUES 
(
    'lo-bob-01', 'p-102', 'lt-03', 'doc-card-01', 'hosp-001', 'COMPLETED', 'ROUTINE',
    'Total: 228 mg/dL, LDL: 145 mg/dL, HDL: 44 mg/dL, Triglycerides: 195 mg/dL', 'mg/dL', TRUE,
    'Dr. Pathologist', '2026-09-20 16:30:00+00', '2026-09-20 18:00:00+00'
),
(
    'lo-chr-01', 'p-103', 'lt-06', 'doc-ped-01', 'hosp-child-01', 'COMPLETED', 'ROUTINE',
    'Total IgE: 320 IU/mL, AEC: 650 /mcL (Reference: <100 IU/mL)', 'IU/mL', TRUE,
    'Dr. Ananya Swaminathan', '2026-09-10 10:30:00+00', '2026-09-10 12:00:00+00'
),
(
    'lo-dor-01', 'p-104', 'lt-07', 'doc-rheum-01', 'hosp-city-01', 'COMPLETED', 'ROUTINE',
    'Lumbar Spine T-Score: -1.8, Femoral Neck: -1.6 (Osteopenia)', 'T-Score', TRUE,
    'Dr. Radiologist', '2026-08-15 11:45:00+00', '2026-08-15 14:00:00+00'
),
(
    'lo-dor-02', 'p-104', 'lt-08', 'doc-rheum-01', 'hosp-city-01', 'COMPLETED', 'ROUTINE',
    '5.1 mg/dL (Normal: 2.5 - 6.5 mg/dL)', 'mg/dL', FALSE,
    'Dr. Pathologist', '2026-08-15 11:45:00+00', '2026-08-15 13:30:00+00'
)
ON CONFLICT (id) DO UPDATE SET
    result_value = EXCLUDED.result_value,
    is_abnormal = EXCLUDED.is_abnormal,
    status = EXCLUDED.status;

-- 12. Seed Medical Documents for Family Members
INSERT INTO oh_id.medical_documents (
    id, patient_id, hospital_id, doctor_id, title, category,
    file_type, file_size_kb, document_date, reference_id, notes
)
VALUES 
(
    'doc-bob-01', 'p-102', 'hosp-001', 'doc-card-01', 'Cardiology Evaluation & Lipid Assessment Report',
    'LAB_REPORT', 'PDF', 280, '2026-09-20', 'lab-bob-01', 'Issued by Cardiology Department, Apollo City Hospital'
),
(
    'doc-bob-02', 'p-102', 'hosp-001', 'doc-card-01', 'Cardiology Prescription RX-BOB-01',
    'PRESCRIPTION', 'PDF', 165, '2026-09-20', 'rx-bob-01', 'Signed by Dr. S. Ramanathan'
),
(
    'doc-charlie-01', 'p-103', 'hosp-child-01', 'doc-ped-01', 'Pediatric Immunization Record & Growth Milestone Chart',
    'CERTIFICATE', 'PDF', 450, '2026-09-10', 'doc-imm-01', 'Complete MMR, DTaP, Polio & Varicella records verified'
),
(
    'doc-charlie-02', 'p-103', 'hosp-child-01', 'doc-ped-01', 'Pediatric Allergy & IgE Diagnostic Analysis',
    'LAB_REPORT', 'PDF', 210, '2026-09-10', 'lab-charlie-01', 'Children''s Specialty Clinic Diagnostic Laboratory'
),
(
    'doc-dorothy-01', 'p-104', 'hosp-city-01', 'doc-rheum-01', 'DEXA Bone Mineral Density Scan & Imaging Summary',
    'LAB_REPORT', 'PDF', 520, '2026-08-15', 'lab-dorothy-01', 'City Care Multi-Specialty Hospital Imaging Wing'
),
(
    'doc-dorothy-02', 'p-104', 'hosp-city-01', 'doc-rheum-01', 'Rheumatology Prescription & Joint Protocol',
    'PRESCRIPTION', 'PDF', 175, '2026-08-15', 'rx-dorothy-01', 'Signed by Dr. Meenakshi Sundaram'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category;

-- 13. Seed Invoices for Family Members
INSERT INTO oh_id.invoices (
    id, invoice_number, patient_id, hospital_id, appointment_id,
    subtotal, tax_gst, discount, total_amount, paid_amount, balance_amount, payment_status, created_at
)
VALUES 
(
    'inv-bob-01', 'INV-2026-BOB-8812', 'p-102', 'hosp-001', 'appt-bob-01',
    1200.00, 0.00, 0.00, 1200.00, 1200.00, 0.00, 'PAID', '2026-09-20 17:15:00+00'
),
(
    'inv-charlie-01', 'INV-2026-CHR-4401', 'p-103', 'hosp-child-01', 'appt-charlie-01',
    950.00, 0.00, 0.00, 950.00, 950.00, 0.00, 'PAID', '2026-09-10 11:15:00+00'
),
(
    'inv-dorothy-01', 'INV-2026-DOR-9910', 'p-104', 'hosp-city-01', 'appt-dorothy-01',
    2800.00, 0.00, 0.00, 2800.00, 2800.00, 0.00, 'PAID', '2026-08-15 13:45:00+00'
)
ON CONFLICT (id) DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    paid_amount = EXCLUDED.paid_amount,
    payment_status = EXCLUDED.payment_status;

-- 14. Create View oh_id.vw_family_members
CREATE OR REPLACE VIEW oh_id.vw_family_members AS
SELECT 
    fr.id AS relationship_id,
    fr.primary_patient_id,
    p_primary.name AS primary_patient_name,
    p_primary.onehealth_id AS primary_onehealth_id,
    fr.member_patient_id,
    fr.relationship,
    fr.is_guardian,
    fr.is_minor,
    fr.consent_status,
    fr.permissions,
    fr.emergency_contact_priority,
    fr.notes,
    fr.created_at,
    fr.updated_at,
    p_mem.onehealth_id AS member_onehealth_id,
    p_mem.name AS member_name,
    p_mem.age AS member_age,
    p_mem.dob AS member_dob,
    p_mem.gender AS member_gender,
    p_mem.blood_group AS member_blood_group,
    p_mem.phone AS member_phone,
    p_mem.email AS member_email,
    p_mem.address AS member_address,
    p_mem.city AS member_city,
    p_mem.state AS member_state,
    p_mem.emergency_contact AS member_emergency_contact,
    p_mem.qr_token AS member_qr_token,
    p_mem.diagnosis AS member_primary_condition,
    p_mem.hospital_id AS member_primary_hospital_id,
    COALESCE(h.name, 'Multi-Hospital Patient') AS member_primary_hospital_name,
    (
        SELECT COUNT(DISTINCT COALESCE(c.hospital_id, a.hospital_id, p_mem.hospital_id))
        FROM oh_id.patients p_sub
        LEFT JOIN oh_id.opd_consultations c ON c.patient_id = p_mem.id
        LEFT JOIN oh_id.appointments a ON a.patient_id = p_mem.id
        WHERE p_sub.id = p_mem.id
    ) AS hospitals_count,
    (
        SELECT COUNT(*)
        FROM oh_id.appointments a2
        WHERE a2.patient_id = p_mem.id
    ) AS upcoming_appointments_count
FROM oh_id.family_relationships fr
JOIN oh_id.patients p_primary ON fr.primary_patient_id = p_primary.id
JOIN oh_id.patients p_mem ON fr.member_patient_id = p_mem.id
LEFT JOIN oh_id.hospitals h ON p_mem.hospital_id = h.id;
"""

def run_migration():
    print("Executing OH-ID Family Healthcare Model Migration...")
    with get_db_cursor() as cur:
        cur.execute(FAMILY_MIGRATION_SQL)
    print("Family Migration Completed Successfully!")

if __name__ == "__main__":
    run_migration()
