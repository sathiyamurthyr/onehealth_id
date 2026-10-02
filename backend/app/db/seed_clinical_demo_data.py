"""
Seed script for OneHealth ID (OH-ID) Clinical Demo Data:
- Realistic historical consultations & clinical notes
- FHIR MedicationRequests (active & completed)
- Lab tests with multi-period trend comparison (Hb, Blood Glucose, Creatinine)
- Doctor referrals & follow-up plans
- Doctor time allocations & OPD session slots
"""
import psycopg2
import json
from datetime import date, datetime, timedelta
from backend.app.core.config import settings

def seed_clinical_data():
    conn = psycopg2.connect(settings.DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    try:
        # Get patient IDs
        cur.execute("SELECT id, name, onehealth_id FROM oh_id.patients LIMIT 5;")
        patients = cur.fetchall()
        if not patients:
            print("No patients found to seed.")
            return

        p1_id, p1_name, p1_ohid = patients[0] # Usually Ramesh Kumar or similar
        print(f"Seeding rich clinical data for primary patient {p1_name} ({p1_ohid})...")

        # Get doctors
        cur.execute("SELECT id, name, specialty, hospital_id FROM oh_id.doctors LIMIT 4;")
        doctors = cur.fetchall()
        doc1_id = doctors[0][0] if doctors else "doc-k-01"
        doc2_id = doctors[1][0] if len(doctors) > 1 else doc1_id
        hosp_id = doctors[0][3] if doctors else "hosp-kedar"

        today = date.today()
        d_minus_60 = today - timedelta(days=60)
        d_minus_30 = today - timedelta(days=30)
        d_minus_14 = today - timedelta(days=14)
        d_plus_14 = today + timedelta(days=14)

        # 1. Seed Doctor Schedules
        cur.execute("""
            INSERT INTO oh_id.doctor_schedules (
                id, doctor_id, hospital_id, day_of_week, working_start_time, working_end_time,
                break_start_time, break_end_time, appointment_duration_minutes, buffer_time_minutes,
                emergency_slots_count, followup_slots_count, new_patient_slots_count, overbooking_allowed, overbooking_max
            ) VALUES 
            ('ds-mon-01', %s, %s, 'Monday', '09:00', '17:00', '13:00', '14:00', 15, 5, 2, 4, 8, true, 2),
            ('ds-tue-01', %s, %s, 'Tuesday', '09:00', '17:00', '13:00', '14:00', 15, 5, 2, 4, 8, true, 2),
            ('ds-wed-01', %s, %s, 'Wednesday', '09:00', '17:00', '13:00', '14:00', 15, 5, 2, 4, 8, true, 2),
            ('ds-thu-01', %s, %s, 'Thursday', '09:00', '17:00', '13:00', '14:00', 15, 5, 2, 4, 8, true, 2),
            ('ds-fri-01', %s, %s, 'Friday', '09:00', '17:00', '13:00', '14:00', 15, 5, 2, 4, 8, true, 2),
            ('ds-sat-01', %s, %s, 'Saturday', '09:00', '13:00', '11:00', '11:30', 15, 5, 1, 3, 5, false, 0)
            ON CONFLICT (doctor_id, day_of_week) DO UPDATE SET
                working_start_time = EXCLUDED.working_start_time,
                working_end_time = EXCLUDED.working_end_time,
                appointment_duration_minutes = EXCLUDED.appointment_duration_minutes;
        """, (doc1_id, hosp_id, doc1_id, hosp_id, doc1_id, hosp_id, doc1_id, hosp_id, doc1_id, hosp_id, doc1_id, hosp_id))

        # 2. Seed Previous OPD Consultation (30 days ago)
        cur.execute("""
            INSERT INTO oh_id.opd_consultations (
                id, patient_id, doctor_id, symptoms, diagnosis, clinical_notes, vitals,
                chief_complaint, examination, medical_history, diagnoses, consultation_status, created_at
            ) VALUES (
                'c-hist-01', %s, %s, 
                'Chronic dry cough, high post-prandial fatigue, burning sensation in feet',
                'Type 2 Diabetes Mellitus with Peripheral Neuropathy, Upper Respiratory Tract Irritation',
                'Patient advised strict carbohydrate restriction, 45 min brisk walking, and proper footwear for foot neuropathy.',
                %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, 'COMPLETED', %s
            ) ON CONFLICT (id) DO UPDATE SET diagnosis = EXCLUDED.diagnosis;
        """, (
            p1_id, doc1_id,
            json.dumps({"bp": "130/84 mmHg", "pulse": 76, "spo2": 98, "temperature": "98.4 °F", "weight_kg": 72, "height_cm": 174, "bmi": 23.8, "pain_score": 3}),
            json.dumps({
                "reason": "Routine Diabetic Follow-up & Cough",
                "duration": "2 weeks",
                "severity": "Moderate",
                "onset": "Subacute",
                "symptoms": ["Dry Cough", "Post-prandial lethargy", "Bilateral pedal tingling"]
            }),
            json.dumps({
                "general": {"pallor": False, "icterus": False, "cyanosis": False, "clubbing": False, "lymphadenopathy": False, "edema": "Mild bilateral ankle edema (+1)"},
                "systems": {
                    "cvs": "S1 S2 heard, no murmurs",
                    "rs": "Bilateral vesicular breath sounds, mild rhonchi right lower zone",
                    "pa": "Soft, non-tender, no hepatosplenomegaly",
                    "cns": "Conscious, oriented. Reduced pinprick sensation in glove-and-stocking distribution over feet."
                },
                "doctor_notes": "Pedal pulses palpable. No active ulceration or skin breakdown on feet."
            }),
            json.dumps({
                "illnesses": "Type 2 Diabetes Mellitus diagnosed in 2021; Primary Hypertension diagnosed in 2023",
                "surgeries": "Laparoscopic appendectomy (2018)",
                "chronic_conditions": ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
                "family_history": "Father had CAD and T2DM; Mother has osteoporosis",
                "social_history": "Non-smoker, occasional alcohol (social), sedentary software profession",
                "allergies": [{"allergen": "Penicillin", "type": "Drug", "severity": "Severe", "reaction": "Urticaria & Bronchospasm"}],
                "current_medications": ["Metformin 500mg PO BD", "Telmisartan 40mg PO OD"]
            }),
            json.dumps([
                {"type": "Primary", "code": "E11.40", "name": "Type 2 diabetes mellitus with diabetic neuropathy, unspecified", "status": "Confirmed"},
                {"type": "Secondary", "code": "I10", "name": "Essential (primary) hypertension", "status": "Confirmed"},
                {"type": "Secondary", "code": "J06.9", "name": "Acute upper respiratory infection, unspecified", "status": "Provisional"}
            ]),
            d_minus_30
        ))

        # 3. Seed Previous Prescription (FHIR MedicationRequest)
        cur.execute("""
            INSERT INTO oh_id.prescriptions (
                id, consultation_id, patient_id, doctor_id, diagnosis, instructions, status,
                valid_from, valid_until, signed_by, signed_at, digital_signature_hash, created_by, created_at, version
            ) VALUES (
                'rx-hist-01', 'c-hist-01', %s, %s,
                'Type 2 Diabetes Mellitus with Peripheral Neuropathy',
                'Take medications strictly after meals. Monitor morning fasting blood sugar twice a week. Carry diabetic identification card.',
                'ACTIVE', %s, %s, 'Dr. Anitha (MD Gen Med)', %s, 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
                'Dr. Anitha', %s, 1
            ) ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';
        """, (p1_id, doc1_id, d_minus_30, today + timedelta(days=30), d_minus_30, d_minus_30))

        # 4. Seed Prescription Items (Structured FHIR lines)
        cur.execute("DELETE FROM oh_id.prescription_items WHERE prescription_id = 'rx-hist-01';")
        cur.execute("""
            INSERT INTO oh_id.prescription_items (
                id, prescription_id, medicine_name, dosage, duration_days, generic_name, brand_name, strength, dosage_form,
                route, dose, frequency, timing_morning, timing_afternoon, timing_evening, timing_night,
                food_instruction, duration_value, duration_unit, start_date, end_date, quantity,
                expected_supply_duration, refills, is_prn, prn_indication, specific_instructions,
                is_dispensed, dispensed_quantity, batch_number, expiry_date, item_status
            ) VALUES 
            (
                'rxi-01', 'rx-hist-01', 'Metformin 500mg', '500 mg', 60, 'Metformin Hydrochloride', 'Glycomet 500', '500 mg',
                'Tablet', 'Oral', '1 tablet', 'Twice daily (1-0-1)', true, false, false, true,
                'AFTER_FOOD', 60, 'Days', %s, %s, 120, 60, 2, false, null,
                'Swallow whole with a full glass of water. Do not crush.',
                true, 60, 'GLY-2026-A12', '2028-05-31', 'ACTIVE'
            ),
            (
                'rxi-02', 'rx-hist-01', 'Telmisartan 40mg', '40 mg', 60, 'Telmisartan', 'Telma 40', '40 mg',
                'Tablet', 'Oral', '1 tablet', 'Once daily (1-0-0)', true, false, false, false,
                'AFTER_FOOD', 60, 'Days', %s, %s, 60, 60, 2, false, null,
                'Take morning after breakfast. Monitor BP weekly.',
                true, 60, 'TEL-40-B99', '2028-11-30', 'ACTIVE'
            ),
            (
                'rxi-03', 'rx-hist-01', 'Methylcobalamin 1500mcg + Pregabalin 75mg', '75 mg', 30, 'Methylcobalamin + Pregabalin', 'Pregeb M OD', '75 mg',
                'Capsule', 'Oral', '1 capsule', 'Once daily at bedtime (0-0-0-1)', false, false, false, true,
                'AFTER_FOOD', 30, 'Days', %s, %s, 30, 30, 1, false, null,
                'May cause mild dizziness initially. Avoid driving immediately after dose.',
                true, 30, 'PGM-77-C01', '2027-09-30', 'ACTIVE'
            ),
            (
                'rxi-04', 'rx-hist-01', 'Levosalbutamol + Ambroxol Syrup', '5 ml', 5, 'Levosalbutamol + Ambroxol', 'Ascoril LS', '5 ml',
                'Syrup', 'Oral', '5 ml', 'Three times daily (1-1-1)', true, true, false, true,
                'AFTER_FOOD', 5, 'Days', %s, %s, 1, 5, 0, false, null,
                'Use measuring cup. Drink warm water after dose.',
                true, 1, 'ASC-902', '2027-12-31', 'COMPLETED'
            );
        """, (
            d_minus_30, today + timedelta(days=30),
            d_minus_30, today + timedelta(days=30),
            d_minus_30, today,
            d_minus_30, d_minus_30 + timedelta(days=5)
        ))

        # 5. Seed Multi-Period Lab Test Results for Trend Comparison
        lab_items = [
            ('lo-hb-01', 'lt-01', '11.4', 'g/dL', True, d_minus_60),
            ('lo-hb-02', 'lt-01', '12.1', 'g/dL', False, d_minus_30),
            ('lo-hb-03', 'lt-01', '12.8', 'g/dL', False, d_minus_14),
            ('lo-fbs-01', 'lt-02', '8.9', '%', True, d_minus_60),
            ('lo-fbs-02', 'lt-02', '8.1', '%', True, d_minus_30),
            ('lo-fbs-03', 'lt-02', '7.4', '%', True, d_minus_14),
            ('lo-creat-01', 'lt-04', '1.3', 'mg/dL', True, d_minus_60),
            ('lo-creat-02', 'lt-04', '1.1', 'mg/dL', False, d_minus_14),
        ]
        for lid, tid, val, unit, abn, dt in lab_items:
            cur.execute("""
                INSERT INTO oh_id.lab_orders (
                    id, patient_id, test_id, doctor_id, hospital_id, status, priority,
                    result_value, result_unit, is_abnormal, verified_by, ordered_at, completed_at
                ) VALUES (%s, %s, %s, %s, %s, 'COMPLETED', 'ROUTINE', %s, %s, %s, 'Dr. Pathologist', %s, %s)
                ON CONFLICT (id) DO UPDATE SET result_value = EXCLUDED.result_value;
            """, (lid, p1_id, tid, doc1_id, hosp_id, val, unit, abn, dt, dt))

        # 6. Seed Referrals
        cur.execute("""
            INSERT INTO oh_id.referrals (
                id, patient_id, referring_doctor_id, receiving_doctor_id, referral_type,
                specialty, receiving_doctor_name, reason, clinical_summary, priority,
                requested_evaluation, status, created_at
            ) VALUES (
                'ref-01', %s, %s, %s, 'INTERNAL', 'Cardiology', 'Dr. Sundaramoorthy (DM Cardio)',
                'Persistent borderline hypertension and baseline ECG showing mild LV strain',
                'Patient is a 54yo known T2DM and hypertensive on Telmisartan 40mg. ECG shows left ventricular strain pattern.',
                'ROUTINE', '2D Echocardiogram, Treadmill Stress Test (TMT), and assessment for ACEi/ARB optimization.',
                'ACCEPTED', %s
            ) ON CONFLICT (id) DO NOTHING;
        """, (p1_id, doc1_id, doc2_id, d_minus_14))

        # 7. Seed Follow-up Plan
        cur.execute("""
            INSERT INTO oh_id.follow_up_plans (
                id, patient_id, doctor_id, department_id, scheduled_date, scheduled_time,
                duration_minutes, reason, required_investigations, instructions, status, created_at
            ) VALUES (
                'fup-01', %s, %s, 'dept-k-01', %s, '10:30 AM', 15,
                'Diabetic Glycemic Control & Neuropathy Assessment',
                '["Fasting Blood Sugar", "HbA1c", "Serum Creatinine", "Urine Microalbumin"]'::jsonb,
                'Fast for minimum 10 hours before morning lab draw. Bring blood sugar diary and previous lab slips.',
                'PLANNED', %s
            ) ON CONFLICT (id) DO NOTHING;
        """, (p1_id, doc1_id, d_plus_14, today))

        print("Successfully seeded clinical demo data!")
    except Exception as e:
        print(f"Error seeding clinical data: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_clinical_data()
