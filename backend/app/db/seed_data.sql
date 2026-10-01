-- ==============================================================================
-- Seed Data for OneHealth ID (OH-ID) Enterprise
-- ==============================================================================

-- 1. Tenant
INSERT INTO oh_id.tenants (id, name, code, subscription_plan)
VALUES ('ten-001', 'Apollo Global Healthcare Network', 'APOLLO-NET', 'ENTERPRISE')
ON CONFLICT (id) DO NOTHING;

-- 2. Hospitals
INSERT INTO oh_id.hospitals (id, tenant_id, name, code, city, state, phone, email)
VALUES 
('hosp-001', 'ten-001', 'Apollo City Hospital - Chennai Central', 'APOLLO-CHE-01', 'Chennai', 'Tamil Nadu', '+91 44 2829 0200', 'chennai@apollo.org'),
('hosp-002', 'ten-001', 'Apollo Multi-Specialty Hospital - Bangalore', 'APOLLO-BLR-01', 'Bengaluru', 'Karnataka', '+91 80 2630 4050', 'blr@apollo.org')
ON CONFLICT (id) DO NOTHING;

-- 3. Departments
INSERT INTO oh_id.departments (id, hospital_id, name, code, floor_number)
VALUES 
('dept-101', 'hosp-001', 'General Medicine & OPD', 'MED-OPD', 'Ground Floor, Wing A'),
('dept-102', 'hosp-001', 'Cardiology & Intensive Care', 'CARDIO', '2nd Floor, Wing B'),
('dept-103', 'hosp-001', 'Pediatrics & Neonatology', 'PED', '1st Floor, Wing C'),
('dept-104', 'hosp-001', 'Orthopedics & Trauma', 'ORTHO', '3rd Floor, Wing A'),
('dept-105', 'hosp-001', 'Diagnostic Radiology & Lab', 'DIAG', 'Basement 1')
ON CONFLICT (id) DO NOTHING;

-- 4. Default Enterprise Users (Hashed with salted bcrypt)
INSERT INTO oh_id.users (id, tenant_id, hospital_id, username, email, full_name, role, password_hash)
VALUES 
('usr-admin', 'ten-001', 'hosp-001', 'admin', 'admin@hospital.org', 'Dr. Administrator', 'SUPER_ADMIN', '$2b$12$NWKP4piq0wShBlDXdhtzh.gcFQc/vrOcGc40nX/1xwr6EXe0ZB.6a'),
('usr-doctor', 'ten-001', 'hosp-001', 'doctor', 'house@hospital.org', 'Dr. Gregory House', 'DOCTOR', '$2b$12$NWKP4piq0wShBlDXdhtzh.gcFQc/vrOcGc40nX/1xwr6EXe0ZB.6a'),
('usr-receptionist', 'ten-001', 'hosp-001', 'receptionist', 'reception@hospital.org', 'Sarah Jenkins', 'RECEPTIONIST', '$2b$12$NWKP4piq0wShBlDXdhtzh.gcFQc/vrOcGc40nX/1xwr6EXe0ZB.6a'),
('usr-patient', 'ten-001', 'hosp-001', 'patient', 'alice.smith@example.com', 'Alice Smith', 'PATIENT', '$2b$12$NWKP4piq0wShBlDXdhtzh.gcFQc/vrOcGc40nX/1xwr6EXe0ZB.6a')
ON CONFLICT (username) DO NOTHING;

-- 5. Doctors
INSERT INTO oh_id.doctors (id, user_id, hospital_id, department_id, name, specialty, qualification, phone, email, room_number, opd_timings, consultation_fee, rating, is_available)
VALUES 
('d-201', 'usr-doctor', 'hosp-001', 'dept-101', 'Dr. Gregory House', 'Diagnostic Medicine', 'MBBS, MD (Diagnostics)', '+91 98401 23456', 'house@hospital.org', 'Room 101', '09:00 AM - 01:00 PM', 800.00, 4.9, TRUE),
('d-202', NULL, 'hosp-001', 'dept-102', 'Dr. Allison Cameron', 'Immunology', 'MBBS, MD (Immunology)', '+91 98402 34567', 'cameron@hospital.org', 'Room 102', '10:00 AM - 02:00 PM', 750.00, 4.8, TRUE),
('d-203', NULL, 'hosp-001', 'dept-102', 'Dr. James Wilson', 'Oncology', 'MBBS, MD, DM (Oncology)', '+91 98403 45678', 'wilson@hospital.org', 'Room 103', '02:00 PM - 06:00 PM', 900.00, 5.0, TRUE),
('d-204', NULL, 'hosp-001', 'dept-103', 'Dr. Lisa Cuddy', 'Endocrinology', 'MBBS, MD (Endo)', '+91 98404 56789', 'cuddy@hospital.org', 'Room 104', '09:30 AM - 01:30 PM', 850.00, 4.9, TRUE),
('d-205', NULL, 'hosp-001', 'dept-104', 'Dr. Robert Chase', 'Intensive Care & Surgery', 'MBBS, MS (General Surgery)', '+91 98405 67890', 'chase@hospital.org', 'Room 105', '11:00 AM - 04:00 PM', 700.00, 4.7, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 6. Initial Patients
INSERT INTO oh_id.patients (id, onehealth_id, qr_token, name, age, gender, phone, email, address, emergency_contact, blood_group, diagnosis, hospital_id, tenant_id, status)
VALUES 
('p-101', 'OHID-IND-2026-01001', 'QR-OHID-p-101-SECURE', 'Alice Smith', 32, 'Female', '+91 98842 40519', 'alice.smith@example.com', '12 Anna Salai, T. Nagar, Chennai', '+91 94440 12345 (Spouse)', 'O+ Positive', 'Type 2 Diabetes', 'hosp-001', 'ten-001', 'ACTIVE'),
('p-102', 'OHID-IND-2026-01002', 'QR-OHID-p-102-SECURE', 'Robert Johnson', 45, 'Male', '+91 98843 51620', 'robert.j@example.com', '45 Mount Road, Guindy, Chennai', '+91 94441 23456 (Brother)', 'B+ Positive', 'Hypertension', 'hosp-001', 'ten-001', 'ACTIVE'),
('p-103', 'OHID-IND-2026-01003', 'QR-OHID-p-103-SECURE', 'Emily Davis', 26, 'Female', '+91 98844 62731', 'emily.davis@example.com', '88 Besant Avenue, Adyar, Chennai', '+91 94442 34567 (Mother)', 'A+ Positive', 'Migraine & Fatigue', 'hosp-001', 'ten-001', 'ACTIVE'),
('p-104', 'OHID-IND-2026-01004', 'QR-OHID-p-104-SECURE', 'Michael Wilson', 58, 'Male', '+91 98845 73842', 'm.wilson@example.com', '102 Nelson Manickam Rd, Aminjikarai, Chennai', '+91 94443 45678 (Daughter)', 'AB+ Positive', 'Cardiovascular Checkup', 'hosp-001', 'ten-001', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 7. Initial Appointments & Queue
INSERT INTO oh_id.appointments (id, patient_id, doctor_id, hospital_id, department_id, slot, status, token_number, priority, notes)
VALUES 
('a-301', 'p-101', 'd-201', 'hosp-001', 'dept-101', '2026-10-02 09:30', 'scheduled', 1, 'NORMAL', 'Quarterly diabetes review & HbA1c test'),
('a-302', 'p-102', 'd-202', 'hosp-001', 'dept-102', '2026-10-02 11:00', 'scheduled', 2, 'NORMAL', 'Blood pressure monitoring follow-up'),
('a-303', 'p-103', 'd-203', 'hosp-001', 'dept-102', '2026-10-01 14:00', 'completed', 3, 'NORMAL', 'Routine oncology screen - cleared')
ON CONFLICT (id) DO NOTHING;

INSERT INTO oh_id.queue_entries (id, hospital_id, doctor_id, department_id, appointment_id, patient_id, token_number, status, estimated_wait_minutes)
VALUES 
('q-101', 'hosp-001', 'd-201', 'dept-101', 'a-301', 'p-101', 1, 'WAITING', 10),
('q-102', 'hosp-001', 'd-202', 'dept-102', 'a-302', 'p-102', 2, 'WAITING', 25)
ON CONFLICT (id) DO NOTHING;

-- 8. Wards and Beds
INSERT INTO oh_id.wards (id, hospital_id, name, ward_type, floor_number)
VALUES 
('w-01', 'hosp-001', 'Main General Ward', 'GENERAL', '1st Floor'),
('w-02', 'hosp-001', 'Executive Deluxe Ward', 'PRIVATE', '3rd Floor'),
('w-03', 'hosp-001', 'Cardiac Intensive Care Unit', 'ICU', '2nd Floor')
ON CONFLICT (id) DO NOTHING;

INSERT INTO oh_id.beds (id, ward_id, bed_number, daily_charge, is_occupied, current_patient_id)
VALUES 
('b-101', 'w-01', 'Bed G-101', 1200.00, FALSE, NULL),
('b-102', 'w-01', 'Bed G-102', 1200.00, FALSE, NULL),
('b-103', 'w-01', 'Bed G-103', 1200.00, FALSE, NULL),
('b-201', 'w-02', 'Suite P-201', 4500.00, TRUE, 'p-104'),
('b-301', 'w-03', 'ICU-301', 8500.00, FALSE, NULL)
ON CONFLICT (id) DO NOTHING;

-- 9. IPD Admission for patient 104
INSERT INTO oh_id.ipd_admissions (id, patient_id, bed_id, admitting_doctor_id, hospital_id, status, reason_for_admission)
VALUES 
('adm-001', 'p-104', 'b-201', 'd-203', 'hosp-001', 'ADMITTED', 'Post-procedure cardiac monitoring and angiography observation')
ON CONFLICT (id) DO NOTHING;

-- 10. Lab Catalog & Orders
INSERT INTO oh_id.lab_test_catalog (id, name, code, category, price, turnaround_hours, normal_range)
VALUES 
('lt-01', 'Complete Blood Count (CBC)', 'CBC-01', 'Hematology', 450.00, 2, '4.5 - 11.0 x 10^9/L'),
('lt-02', 'Glycated Hemoglobin (HbA1c)', 'HBA1C-01', 'Biochemistry', 650.00, 4, '< 5.7% Normal'),
('lt-03', 'Lipid Profile Comprehensive', 'LIPID-01', 'Biochemistry', 850.00, 4, 'Cholesterol < 200 mg/dL'),
('lt-04', 'Serum Creatinine & Kidney Profile', 'KFT-01', 'Nephrology', 500.00, 3, '0.7 - 1.3 mg/dL'),
('lt-05', 'Electrocardiogram (12-Lead ECG)', 'ECG-01', 'Cardiology', 350.00, 1, 'Normal Sinus Rhythm')
ON CONFLICT (id) DO NOTHING;

INSERT INTO oh_id.lab_orders (id, patient_id, test_id, doctor_id, hospital_id, status, priority, result_value, result_unit, is_abnormal)
VALUES 
('lo-01', 'p-101', 'lt-02', 'd-201', 'hosp-001', 'COMPLETED', 'ROUTINE', '6.8', '%', TRUE),
('lo-02', 'p-104', 'lt-05', 'd-203', 'hosp-001', 'COMPLETED', 'URGENT', 'Normal Sinus Rhythm, 72 bpm', 'bpm', FALSE),
('lo-03', 'p-102', 'lt-03', 'd-202', 'hosp-001', 'PROCESSING', 'ROUTINE', NULL, NULL, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 11. Pharmacy Catalog & Prescriptions
INSERT INTO oh_id.pharmacy_medicines (id, name, generic_name, category, unit_price, stock_quantity)
VALUES 
('med-01', 'Metformin 500mg', 'Metformin Hydrochloride', 'Antidiabetic', 4.50, 1200),
('med-02', 'Amlodipine 5mg', 'Amlodipine Besylate', 'Antihypertensive', 6.00, 850),
('med-03', 'Atorvastatin 10mg', 'Atorvastatin Calcium', 'Cardiovascular', 12.00, 600),
('med-04', 'Paracetamol 650mg', 'Acetaminophen', 'Analgesic', 2.50, 2500),
('med-05', 'Azithromycin 500mg', 'Azithromycin', 'Antibiotic', 24.00, 400)
ON CONFLICT (id) DO NOTHING;

-- 12. Invoices & Payments
INSERT INTO oh_id.invoices (id, invoice_number, patient_id, hospital_id, appointment_id, subtotal, tax_gst, discount, total_amount, paid_amount, balance_amount, payment_status)
VALUES 
('inv-001', 'INV-2026-000101', 'p-101', 'hosp-001', 'a-301', 800.00, 0.00, 0.00, 800.00, 800.00, 0.00, 'PAID'),
('inv-002', 'INV-2026-000102', 'p-102', 'hosp-001', 'a-302', 750.00, 0.00, 50.00, 700.00, 700.00, 0.00, 'PAID'),
('inv-003', 'INV-2026-000103', 'p-104', 'hosp-001', NULL, 5350.00, 267.50, 0.00, 5617.50, 2000.00, 3617.50, 'PARTIALLY_PAID')
ON CONFLICT (id) DO NOTHING;

INSERT INTO oh_id.invoice_items (id, invoice_id, item_type, description, quantity, unit_price, total_price)
VALUES 
('ii-01', 'inv-001', 'CONSULTATION', 'General Medicine Consultation - Dr. Gregory House', 1, 800.00, 800.00),
('ii-02', 'inv-002', 'CONSULTATION', 'Immunology Consultation - Dr. Allison Cameron', 1, 750.00, 750.00),
('ii-03', 'inv-003', 'BED', 'Executive Deluxe Room Charge (1 Day)', 1, 4500.00, 4500.00),
('ii-04', 'inv-003', 'LAB', 'Electrocardiogram (12-Lead ECG)', 1, 350.00, 350.00),
('ii-05', 'inv-003', 'LAB', 'Lipid Profile Comprehensive', 1, 500.00, 500.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO oh_id.payments (id, invoice_id, amount, payment_mode, transaction_ref, status, recorded_by)
VALUES 
('pay-01', 'inv-001', 800.00, 'UPI', 'UPI-TXN-9840129384', 'SUCCESS', 'usr-receptionist'),
('pay-02', 'inv-002', 700.00, 'CARD', 'CARD-REF-4820194810', 'SUCCESS', 'usr-receptionist'),
('pay-03', 'inv-003', 2000.00, 'NETBANKING', 'NETB-HDFC-819203810', 'SUCCESS', 'usr-receptionist')
ON CONFLICT (id) DO NOTHING;

-- 13. Notifications
INSERT INTO oh_id.notifications (id, user_id, patient_id, title, message, category, is_read)
VALUES 
('notif-01', 'usr-patient', 'p-101', 'Appointment Scheduled', 'Your consultation with Dr. Gregory House is confirmed for 2026-10-02 at 09:30 AM.', 'APPOINTMENT', FALSE),
('notif-02', 'usr-doctor', 'p-101', 'New Patient in Queue', 'Token #1 Alice Smith is waiting in OPD Queue.', 'QUEUE', FALSE),
('notif-03', 'usr-patient', 'p-101', 'Lab Results Ready', 'Your HbA1c Lab Report has been verified and uploaded.', 'LAB', TRUE)
ON CONFLICT (id) DO NOTHING;
