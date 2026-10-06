"""
Database Migration: Enhanced Patient Prescriptions, Validity Engine, Shares & Audit Logs
Creates tables, extends columns, updates views, and seeds benchmark prescriptions.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
import json
import uuid
from datetime import datetime, date, timedelta
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/onehealth_db")

def run_migration():
    print(f"Connecting to database: {DATABASE_URL.split('@')[-1]}")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        print("\n--- 1. Extending oh_id.prescriptions Table ---")
        cur.execute("""
            ALTER TABLE oh_id.prescriptions
            ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS validity_type VARCHAR(32) DEFAULT 'CALENDAR_DAYS',
            ADD COLUMN IF NOT EXISTS validity_source VARCHAR(64) DEFAULT 'PRESCRIBING_PHYSICIAN',
            ADD COLUMN IF NOT EXISTS superseded_by_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS supersession_reason TEXT,
            ADD COLUMN IF NOT EXISTS parent_prescription_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS vitals_snapshot JSONB,
            ADD COLUMN IF NOT EXISTS allergies_snapshot JSONB,
            ADD COLUMN IF NOT EXISTS chief_complaint TEXT,
            ADD COLUMN IF NOT EXISTS clinical_advice TEXT,
            ADD COLUMN IF NOT EXISTS follow_up_appointment_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
            ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(64),
            ADD COLUMN IF NOT EXISTS is_patient_visible BOOLEAN DEFAULT TRUE;
        """)
        print("[OK] oh_id.prescriptions columns extended successfully.")

        print("\n--- 2. Creating oh_id.prescription_shares Table ---")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.prescription_shares (
                id VARCHAR(64) PRIMARY KEY,
                prescription_id VARCHAR(64) NOT NULL REFERENCES oh_id.prescriptions(id) ON DELETE CASCADE,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                created_by_user_id VARCHAR(64) NOT NULL,
                share_token VARCHAR(128) UNIQUE NOT NULL,
                recipient_label VARCHAR(255),
                access_level VARCHAR(32) NOT NULL DEFAULT 'VIEW_ONLY', -- VIEW_ONLY, DOWNLOAD_ALLOWED
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                is_revoked BOOLEAN DEFAULT FALSE,
                access_count INTEGER DEFAULT 0,
                last_accessed_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_prescription_shares_token ON oh_id.prescription_shares(share_token);
            CREATE INDEX IF NOT EXISTS idx_prescription_shares_rx_patient ON oh_id.prescription_shares(prescription_id, patient_id);
        """)
        print("[OK] oh_id.prescription_shares table created successfully.")

        print("\n--- 3. Creating oh_id.prescription_audit_logs Table ---")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.prescription_audit_logs (
                id VARCHAR(64) PRIMARY KEY,
                prescription_id VARCHAR(64) NOT NULL,
                patient_id VARCHAR(64) NOT NULL,
                user_id VARCHAR(64),
                action VARCHAR(32) NOT NULL, -- VIEW, DOWNLOAD_PDF, PRINT, SHARE, REVOKE_SHARE, VERIFY, CREATE, SUPERSEDE, CANCEL
                details JSONB,
                ip_address VARCHAR(64),
                user_agent TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_prescription_audit_rx ON oh_id.prescription_audit_logs(prescription_id);
            CREATE INDEX IF NOT EXISTS idx_prescription_audit_patient ON oh_id.prescription_audit_logs(patient_id);
        """)
        print("[OK] oh_id.prescription_audit_logs table created successfully.")

        print("\n--- 4. Updating View oh_id.vw_prescriptions_full ---")
        cur.execute("DROP VIEW IF EXISTS oh_id.vw_prescriptions_full CASCADE;")
        cur.execute("""
            CREATE OR REPLACE VIEW oh_id.vw_prescriptions_full AS
            SELECT 
                p.id,
                p.consultation_id,
                p.visit_id,
                p.encounter_id,
                p.patient_id,
                pat.name AS patient_name,
                pat.onehealth_id,
                pat.age AS patient_age,
                pat.gender AS patient_gender,
                pat.blood_group AS patient_blood_group,
                pat.phone AS patient_phone,
                pat.dob AS patient_dob,
                p.doctor_id,
                doc.name AS doctor_name,
                doc.specialty AS doctor_specialty,
                COALESCE(doc.registration_number, 'TN-MCI-2026-REG') AS doctor_registration,
                COALESCE(doc.qualification, 'MBBS, MD') AS doctor_qualification,
                COALESCE(p.hospital_id, doc.hospital_id, pat.hospital_id, 'hosp-kedar') AS hospital_id,
                hosp.name AS hospital_name,
                hosp.code AS hospital_code,
                hosp.address AS hospital_address,
                hosp.area AS hospital_area,
                hosp.city AS hospital_city,
                hosp.pin_code AS hospital_pin_code,
                hosp.phone AS hospital_phone,
                hosp.email AS hospital_email,
                p.diagnosis,
                p.chief_complaint,
                p.clinical_advice,
                p.instructions,
                p.doctor_notes,
                p.follow_up_days,
                p.follow_up_date,
                p.follow_up_appointment_id,
                p.status,
                p.valid_from,
                p.valid_until,
                p.validity_type,
                p.validity_source,
                p.superseded_by_id,
                p.superseded_at,
                p.supersession_reason,
                p.parent_prescription_id,
                p.vitals_snapshot,
                p.allergies_snapshot,
                p.cancellation_reason,
                p.cancelled_at,
                p.cancelled_by,
                p.is_patient_visible,
                p.requires_pin,
                p.verification_token,
                p.signed_by,
                p.signed_at,
                p.digital_signature_hash,
                p.created_by,
                p.created_at,
                p.updated_at,
                p.version,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', pi.id,
                                'medicine_name', pi.medicine_name,
                                'generic_name', pi.generic_name,
                                'brand_name', pi.brand_name,
                                'strength', pi.strength,
                                'dosage_form', pi.dosage_form,
                                'route', pi.route,
                                'dose', pi.dose,
                                'dosage', pi.dosage,
                                'frequency', pi.frequency,
                                'timing_morning', pi.timing_morning,
                                'timing_afternoon', pi.timing_afternoon,
                                'timing_evening', pi.timing_evening,
                                'timing_night', pi.timing_night,
                                'food_instruction', pi.food_instruction,
                                'duration_days', pi.duration_days,
                                'duration_value', pi.duration_value,
                                'duration_unit', pi.duration_unit,
                                'start_date', pi.start_date,
                                'end_date', pi.end_date,
                                'quantity', pi.quantity,
                                'refills', pi.refills,
                                'specific_instructions', pi.specific_instructions,
                                'is_prn', pi.is_prn,
                                'prn_indication', pi.prn_indication,
                                'is_dispensed', pi.is_dispensed,
                                'dispensed_quantity', pi.dispensed_quantity,
                                'batch_number', pi.batch_number,
                                'expiry_date', pi.expiry_date,
                                'item_status', pi.item_status
                            ) ORDER BY pi.id ASC
                        )
                        FROM oh_id.prescription_items pi
                        WHERE pi.prescription_id = p.id
                    ), '[]'::json
                ) AS items
            FROM oh_id.prescriptions p
            LEFT JOIN oh_id.patients pat ON p.patient_id = pat.id
            LEFT JOIN oh_id.doctors doc ON p.doctor_id = doc.id
            LEFT JOIN oh_id.hospitals hosp ON COALESCE(p.hospital_id, doc.hospital_id, pat.hospital_id, 'hosp-kedar') = hosp.id;
        """)
        print("[OK] oh_id.vw_prescriptions_full recreated successfully.")

        print("\n--- 5. Seeding Canonical Benchmark Prescriptions ---")
        today = date.today()
        
        # 1. Benchmark Active Prescription: RX-20261003-00124 (Issued today, valid for 30 days)
        rx_active_id = "RX-20261003-00124"
        valid_from_act = today
        valid_until_act = today + timedelta(days=30)
        followup_act = today + timedelta(days=12)

        vitals_active = json.dumps({
            "bp": "120/80 mmHg",
            "pulse": "74 bpm",
            "weight_kg": 72.5,
            "height_cm": 175,
            "bmi": 23.7,
            "temperature_f": "98.4 °F",
            "spo2": "99%"
        })

        allergies_active = json.dumps(["Penicillin", "Sulfa Drugs"])

        cur.execute("""
            INSERT INTO oh_id.prescriptions (
                id, consultation_id, visit_id, patient_id, doctor_id, hospital_id,
                diagnosis, chief_complaint, clinical_advice, instructions, doctor_notes,
                valid_from, valid_until, validity_type, validity_source,
                follow_up_days, follow_up_date, status, version,
                vitals_snapshot, allergies_snapshot, requires_pin, verification_token,
                signed_by, signed_at, digital_signature_hash, created_by, created_at, updated_at
            ) VALUES (
                %s, NULL, 'vis-20261003-01', 'p-101', 'doc-k-01', 'hosp-kedar',
                'Hypertension Stage 1 & Mild Dyslipidemia',
                'Routine quarterly cardiovascular checkup, mild exertional fatigue, morning headache',
                'Adopt low-sodium DASH diet (less than 2g sodium/day). 30 minutes brisk aerobic walking 5 days a week. Maintain daily home BP log.',
                'Take morning dose with a full glass of water. Avoid skipping doses.',
                'Patient exhibits compliant medication history. Resting BP slightly elevated at 134/88 in clinic.',
                %s, %s, 'CALENDAR_DAYS', 'PRESCRIBING_PHYSICIAN',
                12, %s, 'ACTIVE', 1,
                %s, %s, false, 'vtok-rx-20261003-00124',
                'Dr. Arun Kumar', CURRENT_TIMESTAMP, 'SHA256:7f9a2e8c1b4d3e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f', 'dr.kumar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                diagnosis = EXCLUDED.diagnosis,
                chief_complaint = EXCLUDED.chief_complaint,
                clinical_advice = EXCLUDED.clinical_advice,
                instructions = EXCLUDED.instructions,
                valid_from = EXCLUDED.valid_from,
                valid_until = EXCLUDED.valid_until,
                status = 'ACTIVE',
                vitals_snapshot = EXCLUDED.vitals_snapshot,
                allergies_snapshot = EXCLUDED.allergies_snapshot,
                hospital_id = EXCLUDED.hospital_id,
                updated_at = CURRENT_TIMESTAMP;
        """, (rx_active_id, valid_from_act, valid_until_act, followup_act, vitals_active, allergies_active))

        # Clear and insert structured items for RX-20261003-00124
        cur.execute("DELETE FROM oh_id.prescription_items WHERE prescription_id = %s;", (rx_active_id,))
        cur.execute("""
            INSERT INTO oh_id.prescription_items (
                id, prescription_id, medicine_name, generic_name, brand_name, strength, dosage_form,
                route, dose, dosage, frequency, timing_morning, timing_afternoon, timing_evening, timing_night,
                food_instruction, duration_days, duration_value, duration_unit, start_date, end_date,
                quantity, refills, is_prn, specific_instructions, item_status
            ) VALUES 
            (
                'rxi-act-01', %s, 'Telmisartan 40mg', 'Telmisartan', 'Telma 40', '40 mg', 'Tablet',
                'Oral', '1 tablet', '40 mg', 'Once daily (1-0-0)', true, false, false, false,
                'Before food in morning', 30, 30, 'days', %s, %s,
                30, 2, false, 'Take every morning at the same time. Monitor BP weekly.', 'ACTIVE'
            ),
            (
                'rxi-act-02', %s, 'Atorvastatin 10mg', 'Atorvastatin Calcium', 'Atorva 10', '10 mg', 'Tablet',
                'Oral', '1 tablet', '10 mg', 'Once daily at bedtime (0-0-1)', false, false, false, true,
                'After dinner / At bedtime', 30, 30, 'days', %s, %s,
                30, 1, false, 'Take at night before sleep. Report any unexplained muscle aches immediately.', 'ACTIVE'
            ),
            (
                'rxi-act-03', %s, 'Amlodipine 5mg', 'Amlodipine Besylate', 'Amlong 5', '5 mg', 'Tablet',
                'Oral', '1 tablet', '5 mg', 'Once daily (0-0-1)', false, false, false, true,
                'After food at night', 30, 30, 'days', %s, %s,
                30, 2, false, 'Check for pedal swelling. Continue prescribed exercise routine.', 'ACTIVE'
            );
        """, (
            rx_active_id, valid_from_act, valid_until_act,
            rx_active_id, valid_from_act, valid_until_act,
            rx_active_id, valid_from_act, valid_until_act
        ))

        # 2. Benchmark Expired Prescription: RX-20260715-00088 (Issued 15 July 2026, expired 15 August 2026)
        rx_expired_id = "RX-20260715-00088"
        valid_from_exp = date(2026, 7, 15)
        valid_until_exp = date(2026, 8, 15)

        vitals_exp = json.dumps({
            "bp": "138/90 mmHg",
            "pulse": "82 bpm",
            "weight_kg": 74.0,
            "height_cm": 175,
            "temperature_f": "101.2 °F"
        })

        cur.execute("""
            INSERT INTO oh_id.prescriptions (
                id, consultation_id, visit_id, patient_id, doctor_id, hospital_id,
                diagnosis, chief_complaint, clinical_advice, instructions, doctor_notes,
                valid_from, valid_until, validity_type, validity_source,
                follow_up_days, follow_up_date, status, version,
                vitals_snapshot, allergies_snapshot, requires_pin, verification_token,
                signed_by, signed_at, digital_signature_hash, created_by, created_at, updated_at
            ) VALUES (
                %s, NULL, 'vis-20260715-01', 'p-101', 'doc-k-01', 'hosp-kedar',
                'Acute Bronchitis with Febrile Illness',
                'Persistent productive cough for 5 days, low-grade fever, sore throat',
                'Warm saline gargles 3 times daily. Steam inhalation twice daily. Adequate oral hydration (2.5 - 3 Litres/day).',
                'Complete the full 7-day course of antibiotic. Do not discontinue early even if symptoms improve.',
                'Chest auscultation revealed bilateral rhonchi without focal crepitations.',
                %s, %s, 'CALENDAR_DAYS', 'PRESCRIBING_PHYSICIAN',
                7, '2026-07-22', 'EXPIRED', 1,
                %s, %s, false, 'vtok-rx-20260715-00088',
                'Dr. Arun Kumar', '2026-07-15 11:30:00+00', 'SHA256:8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b', 'dr.kumar', '2026-07-15 11:30:00+00', '2026-08-16 00:00:00+00'
            )
            ON CONFLICT (id) DO UPDATE SET
                diagnosis = EXCLUDED.diagnosis,
                chief_complaint = EXCLUDED.chief_complaint,
                valid_from = EXCLUDED.valid_from,
                valid_until = EXCLUDED.valid_until,
                status = 'EXPIRED',
                vitals_snapshot = EXCLUDED.vitals_snapshot,
                hospital_id = EXCLUDED.hospital_id;
        """, (rx_expired_id, valid_from_exp, valid_until_exp, vitals_exp, allergies_active))

        cur.execute("DELETE FROM oh_id.prescription_items WHERE prescription_id = %s;", (rx_expired_id,))
        cur.execute("""
            INSERT INTO oh_id.prescription_items (
                id, prescription_id, medicine_name, generic_name, brand_name, strength, dosage_form,
                route, dose, dosage, frequency, timing_morning, timing_afternoon, timing_evening, timing_night,
                food_instruction, duration_days, duration_value, duration_unit, start_date, end_date,
                quantity, refills, is_prn, specific_instructions, item_status
            ) VALUES 
            (
                'rxi-exp-01', %s, 'Amoxicillin + Clavulanic Acid 625mg', 'Amoxicillin and Potassium Clavulanate', 'Augmentin 625 Duo', '625 mg', 'Tablet',
                'Oral', '1 tablet', '625 mg', 'Twice daily (1-0-1)', true, false, false, true,
                'Take with meals or after food', 7, 7, 'days', '2026-07-15', '2026-07-22',
                14, 0, false, 'Take with food to avoid gastric irritation. Finish entire course.', 'COMPLETED'
            ),
            (
                'rxi-exp-02', %s, 'Paracetamol 650mg', 'Paracetamol / Acetaminophen', 'Dolo 650', '650 mg', 'Tablet',
                'Oral', '1 tablet', '650 mg', 'Thrice daily as needed for fever (1-1-1)', true, true, false, true,
                'After food', 5, 5, 'days', '2026-07-15', '2026-07-20',
                15, 0, true, 'Take only if fever > 100°F or body ache. Maintain minimum 6 hours interval.', 'COMPLETED'
            ),
            (
                'rxi-exp-03', %s, 'Levocetirizine + Montelukast', 'Levocetirizine 5mg + Montelukast 10mg', 'Montair LC', '10 mg', 'Tablet',
                'Oral', '1 tablet', '10 mg', 'Once daily at night (0-0-1)', false, false, false, true,
                'At bedtime', 10, 10, 'days', '2026-07-15', '2026-07-25',
                10, 0, false, 'May cause mild drowsiness. Take at night before sleeping.', 'COMPLETED'
            );
        """, (rx_expired_id, rx_expired_id, rx_expired_id))

        # 3. Benchmark Superseded Prescription: RX-20260901-00045 (Replaced by RX-20261003-00124)
        rx_sup_id = "RX-20260901-00045"
        valid_from_sup = date(2026, 9, 1)
        valid_until_sup = date(2026, 10, 1)

        cur.execute("""
            INSERT INTO oh_id.prescriptions (
                id, consultation_id, visit_id, patient_id, doctor_id, hospital_id,
                diagnosis, chief_complaint, clinical_advice, instructions, doctor_notes,
                valid_from, valid_until, validity_type, validity_source,
                superseded_by_id, superseded_at, supersession_reason,
                status, version, vitals_snapshot, requires_pin, verification_token,
                signed_by, signed_at, digital_signature_hash, created_by, created_at, updated_at
            ) VALUES (
                %s, NULL, 'vis-20260901-01', 'p-101', 'doc-k-01', 'hosp-kedar',
                'Essential Hypertension (Monotherapy Trial)',
                'Initial hypertension diagnosis workup',
                'Low sodium diet and exercise.',
                'Take single morning dose daily.',
                'Initial dosage trial of Telmisartan 20mg.',
                %s, %s, 'CALENDAR_DAYS', 'PRESCRIBING_PHYSICIAN',
                %s, '2026-10-03 10:30:00+00', 'Dosage increased to 40mg and added Amlodipine combination on review visit.',
                'SUPERSEDED', 1, %s, false, 'vtok-rx-20260901-00045',
                'Dr. Arun Kumar', '2026-09-01 10:00:00+00', 'SHA256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b', 'dr.kumar', '2026-09-01 10:00:00+00', '2026-10-03 10:30:00+00'
            )
            ON CONFLICT (id) DO UPDATE SET
                superseded_by_id = EXCLUDED.superseded_by_id,
                superseded_at = EXCLUDED.superseded_at,
                supersession_reason = EXCLUDED.supersession_reason,
                status = 'SUPERSEDED',
                hospital_id = EXCLUDED.hospital_id;
        """, (rx_sup_id, valid_from_sup, valid_until_sup, rx_active_id, vitals_exp))

        cur.execute("DELETE FROM oh_id.prescription_items WHERE prescription_id = %s;", (rx_sup_id,))
        cur.execute("""
            INSERT INTO oh_id.prescription_items (
                id, prescription_id, medicine_name, generic_name, brand_name, strength, dosage_form,
                route, dose, dosage, frequency, timing_morning, timing_afternoon, timing_evening, timing_night,
                food_instruction, duration_days, duration_value, duration_unit, start_date, end_date,
                quantity, refills, is_prn, specific_instructions, item_status
            ) VALUES 
            (
                'rxi-sup-01', %s, 'Telmisartan 20mg', 'Telmisartan', 'Telma 20', '20 mg', 'Tablet',
                'Oral', '1 tablet', '20 mg', 'Once daily in morning (1-0-0)', true, false, false, false,
                'Before food', 30, 30, 'days', '2026-09-01', '2026-10-01',
                30, 0, false, 'Discontinued on 03 Oct 2026 and replaced with Telmisartan 40mg.', 'SUPERSEDED'
            );
        """, (rx_sup_id,))

        # 4. Benchmark Completed Prescription: RX-20260910-00092
        rx_comp_id = "RX-20260910-00092"
        cur.execute("""
            INSERT INTO oh_id.prescriptions (
                id, consultation_id, visit_id, patient_id, doctor_id, hospital_id,
                diagnosis, chief_complaint, clinical_advice, instructions, doctor_notes,
                valid_from, valid_until, status, version, requires_pin, verification_token,
                signed_by, signed_at, digital_signature_hash, created_by, created_at, updated_at
            ) VALUES (
                %s, NULL, 'vis-20260910-01', 'p-101', 'doc-k-01', 'hosp-kedar',
                'Acute Gastroenteritis & Dehydration',
                'Abdominal cramps, watery diarrhea for 24 hours, nausea',
                'Oral rehydration salts (ORS) 1 sachet per 1 litre boiled and cooled water. Light khichdi / curd rice diet.',
                'Maintain hydration. Complete 5 days course of probiotic and antispasmodic.',
                'Abdomen soft, non-tender, mild hyperperistalsis. Rehydrated in daycare.',
                '2026-09-10', '2026-09-25', 'COMPLETED', 1, false, 'vtok-rx-20260910-00092',
                'Dr. Arun Kumar', '2026-09-10 14:00:00+00', 'SHA256:9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e', 'dr.kumar', '2026-09-10 14:00:00+00', '2026-09-20 00:00:00+00'
            )
            ON CONFLICT (id) DO UPDATE SET
                diagnosis = EXCLUDED.diagnosis,
                status = 'COMPLETED',
                hospital_id = EXCLUDED.hospital_id;
        """, (rx_comp_id,))

        cur.execute("DELETE FROM oh_id.prescription_items WHERE prescription_id = %s;", (rx_comp_id,))
        cur.execute("""
            INSERT INTO oh_id.prescription_items (
                id, prescription_id, medicine_name, generic_name, brand_name, strength, dosage_form,
                route, dose, dosage, frequency, timing_morning, timing_afternoon, timing_evening, timing_night,
                food_instruction, duration_days, duration_value, duration_unit, start_date, end_date,
                quantity, refills, is_prn, specific_instructions, item_status
            ) VALUES 
            (
                'rxi-comp-01', %s, 'Bacillus clausii Probiotic Spores', 'Bacillus clausii', 'Enterogermina 2B', '2 Billion Spores', 'Mini Bottle / Liquid',
                'Oral', '1 mini bottle', '2 Billion Spores', 'Twice daily (1-0-1)', true, false, false, true,
                'Drink directly between meals', 5, 5, 'days', '2026-09-10', '2026-09-15',
                10, 0, false, 'Shake well before drinking.', 'COMPLETED'
            ),
            (
                'rxi-comp-02', %s, 'Dicyclomine + Paracetamol', 'Dicyclomine Hydrochloride + Paracetamol', 'Cyclopam', '20mg + 500mg', 'Tablet',
                'Oral', '1 tablet', '20mg + 500mg', 'As needed for stomach spasms (PRN)', false, false, false, false,
                'After food', 3, 3, 'days', '2026-09-10', '2026-09-13',
                6, 0, true, 'Take only if acute abdominal cramping occurs.', 'COMPLETED'
            );
        """, (rx_comp_id, rx_comp_id))

        # 5. Benchmark Cancelled Prescription: RX-20260820-00031
        rx_canc_id = "RX-20260820-00031"
        cur.execute("""
            INSERT INTO oh_id.prescriptions (
                id, consultation_id, visit_id, patient_id, doctor_id, hospital_id,
                diagnosis, chief_complaint, instructions, cancellation_reason, cancelled_at, cancelled_by,
                valid_from, valid_until, status, version, requires_pin, verification_token,
                signed_by, signed_at, digital_signature_hash, created_by, created_at, updated_at
            ) VALUES (
                %s, NULL, 'vis-20260820-01', 'p-101', 'doc-k-01', 'hosp-kedar',
                'Acute Sinusitis (Cancelled)',
                'Facial pain, congestion',
                'Cancelled due to immediate drug allergy reaction reported by patient.',
                'Patient developed urticarial skin rash after first dose of Ciprofloxacin. Drug discontinued and prescription cancelled.',
                '2026-08-20 16:00:00+00', 'Dr. Arun Kumar',
                '2026-08-20', '2026-09-05', 'CANCELLED', 1, false, 'vtok-rx-20260820-00031',
                'Dr. Arun Kumar', '2026-08-20 10:00:00+00', 'SHA256:0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b', 'dr.kumar', '2026-08-20 10:00:00+00', '2026-08-20 16:00:00+00'
            )
            ON CONFLICT (id) DO UPDATE SET
                status = 'CANCELLED',
                cancellation_reason = EXCLUDED.cancellation_reason,
                cancelled_at = EXCLUDED.cancelled_at,
                cancelled_by = EXCLUDED.cancelled_by,
                hospital_id = EXCLUDED.hospital_id;
        """, (rx_canc_id,))

        cur.execute("DELETE FROM oh_id.prescription_items WHERE prescription_id = %s;", (rx_canc_id,))
        cur.execute("""
            INSERT INTO oh_id.prescription_items (
                id, prescription_id, medicine_name, generic_name, brand_name, strength, dosage_form,
                route, dose, dosage, frequency, timing_morning, timing_afternoon, timing_evening, timing_night,
                food_instruction, duration_days, duration_value, duration_unit, start_date, end_date,
                quantity, refills, is_prn, specific_instructions, item_status
            ) VALUES 
            (
                'rxi-canc-01', %s, 'Ciprofloxacin 500mg', 'Ciprofloxacin', 'Ciplox 500', '500 mg', 'Tablet',
                'Oral', '1 tablet', '500 mg', 'Twice daily (1-0-1)', true, false, false, true,
                'After food', 5, 5, 'days', '2026-08-20', '2026-08-25',
                10, 0, false, 'DISCONTINUED: Allergic rash reaction.', 'CANCELLED'
            );
        """, (rx_canc_id,))

        cur.execute("DELETE FROM oh_id.prescription_items WHERE prescription_id = %s;", (rx_canc_id,))
        cur.execute("""
            INSERT INTO oh_id.prescription_items (
                id, prescription_id, medicine_name, generic_name, brand_name, strength, dosage_form,
                route, dose, dosage, frequency, timing_morning, timing_afternoon, timing_evening, timing_night,
                food_instruction, duration_days, duration_value, duration_unit, start_date, end_date,
                quantity, refills, is_prn, specific_instructions, item_status
            ) VALUES 
            (
                'rxi-canc-01', %s, 'Ciprofloxacin 500mg', 'Ciprofloxacin', 'Ciplox 500', '500 mg', 'Tablet',
                'Oral', '1 tablet', '500 mg', 'Twice daily (1-0-1)', true, false, false, true,
                'After food', 5, 5, 'days', '2026-08-20', '2026-08-25',
                10, 0, false, 'DISCONTINUED: Allergic rash reaction.', 'CANCELLED'
            );
        """, (rx_canc_id,))

        conn.commit()
        print("\n[OK] Migration completed successfully! Benchmark prescriptions seeded.")

    except Exception as e:
        conn.rollback()
        print(f"\n[FAIL] Migration failed with error: {e}")
        raise e
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
