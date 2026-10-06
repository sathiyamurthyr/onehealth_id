import os, sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)
os.environ["PYTHONPATH"] = _root_dir

import logging
from backend.app.database.session import get_db_cursor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ohid.migrate_doctor_workspace")

def run_migration():
    logger.info("Starting Doctor Consultation Workspace Database Migration...")

    with get_db_cursor() as cur:
        # 1. Create patient_reported_intake table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS oh_id.patient_reported_intake (
            id VARCHAR(64) PRIMARY KEY,
            patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
            appointment_id VARCHAR(64) REFERENCES oh_id.appointments(id) ON DELETE SET NULL,
            reason_for_visit TEXT NOT NULL,
            duration VARCHAR(64),
            main_concern VARCHAR(255),
            description TEXT,
            severity VARCHAR(32) DEFAULT 'Moderate', -- Mild, Moderate, Severe
            location VARCHAR(128),
            relieving_factors TEXT,
            aggravating_factors TEXT,
            associated_symptoms JSONB DEFAULT '[]'::jsonb,
            previous_treatments TEXT,
            current_medications TEXT,
            known_allergies TEXT,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(32) DEFAULT 'SUBMITTED' -- SUBMITTED, REVIEWED, ARCHIVED
        );
        CREATE INDEX IF NOT EXISTS idx_patient_reported_intake_pid ON oh_id.patient_reported_intake(patient_id);
        CREATE INDEX IF NOT EXISTS idx_patient_reported_intake_appt ON oh_id.patient_reported_intake(appointment_id);
        """)

        # 2. Expand investigation/lab test catalog with multi-category clinical tests
        investigation_catalog = [
            # Blood Tests
            ("test-cbc", "Complete Blood Count (CBC)", "CBC-01", "Blood", 450.00, 4, "WBC: 4000-11000/uL, RBC: 4.5-5.5M/uL, Hb: 13.0-17.0 g/dL, PLT: 150000-450000/uL"),
            ("test-fbs", "Fasting Blood Sugar (FBS)", "GLU-FBS", "Blood", 120.00, 2, "70-99 mg/dL (Normal Fasting)"),
            ("test-ppbs", "Postprandial Blood Sugar (PPBS)", "GLU-PPBS", "Blood", 120.00, 2, "< 140 mg/dL (2 hrs post meal)"),
            ("test-hba1c", "Glycated Hemoglobin (HbA1c)", "HBA1C-01", "Blood", 650.00, 6, "< 5.7% (Normal), 5.7-6.4% (Prediabetes), >= 6.5% (Diabetes)"),
            ("test-lipid", "Lipid Profile Comprehensive", "LIPID-01", "Blood", 850.00, 6, "Total Chol: <200 mg/dL, HDL: >40 mg/dL, LDL: <100 mg/dL, TG: <150 mg/dL"),
            ("test-lft", "Liver Function Tests (LFT)", "LFT-01", "Blood", 950.00, 6, "SGOT/AST: 10-40 U/L, SGPT/ALT: 7-56 U/L, Total Bilirubin: 0.2-1.2 mg/dL, Albumin: 3.5-5.0 g/dL"),
            ("test-kft", "Kidney Function Tests (KFT / RFT)", "KFT-01", "Blood", 800.00, 6, "Urea: 15-45 mg/dL, Creatinine: 0.7-1.3 mg/dL, Uric Acid: 3.5-7.2 mg/dL, eGFR: >90 mL/min"),
            ("test-electrolytes", "Serum Electrolytes (Na+, K+, Cl-)", "ELEC-01", "Blood", 550.00, 3, "Sodium: 135-145 mEq/L, Potassium: 3.5-5.0 mEq/L, Chloride: 96-106 mEq/L"),
            ("test-thyroid", "Thyroid Profile (TSH, Free T3, Free T4)", "THY-01", "Blood", 750.00, 6, "TSH: 0.4-4.0 uIU/mL, FT3: 2.3-4.2 pg/mL, FT4: 0.8-1.8 ng/dL"),
            ("test-crp", "C-Reactive Protein (Quantitative CRP)", "CRP-01", "Blood", 400.00, 3, "< 3.0 mg/L (Normal / Low cardiovascular risk)"),
            ("test-esr", "Erythrocyte Sedimentation Rate (ESR)", "ESR-01", "Blood", 150.00, 2, "Male: 0-15 mm/hr, Female: 0-20 mm/hr"),
            ("test-iron", "Iron Studies & Ferritin Profile", "IRON-01", "Blood", 1200.00, 8, "Serum Iron: 60-170 ug/dL, Ferritin: 24-336 ng/mL, TIBC: 240-450 ug/dL"),
            ("test-vitb12", "Vitamin B12 (Cyanocobalamin)", "VIT-B12", "Blood", 900.00, 12, "200-900 pg/mL"),
            ("test-vitd", "Vitamin D (25-Hydroxy Vitamin D)", "VIT-D3", "Blood", 1100.00, 12, "30-100 ng/mL (Sufficient)"),
            ("test-troponin", "Cardiac Troponin I (High Sensitivity)", "TROP-I", "Blood", 1500.00, 1, "< 0.04 ng/mL (Negative for acute myocardial injury)"),

            # Urine Tests
            ("test-urinalysis", "Routine & Microscopic Urinalysis", "URI-01", "Urine", 200.00, 3, "Color: Pale Yellow, pH: 5.0-7.0, Protein: Nil, Glucose: Nil, RBC: 0-2/HPF, WBC: 0-4/HPF"),
            ("test-urine-culture", "Urine Culture and Sensitivity", "URI-CULT", "Urine", 700.00, 48, "No significant bacterial growth in 48 hours"),
            ("test-urine-protein", "Urine Protein/Creatinine Ratio (UPCR)", "URI-PCR", "Urine", 450.00, 6, "< 0.2 mg/mg (Normal)"),

            # Stool Tests
            ("test-stool-routine", "Stool Routine & Microscopy", "STL-01", "Stool", 250.00, 4, "Consistency: Formed, Color: Brown, Ova/Cysts: Not seen, RBC: Nil, Pus cells: Nil"),
            ("test-stool-occult", "Stool Occult Blood Test (FOBT)", "STL-OBT", "Stool", 350.00, 4, "Negative"),

            # Cardiac Investigations
            ("test-ecg", "12-Lead Electrocardiogram (ECG)", "CARD-ECG", "Cardiac", 350.00, 1, "Normal sinus rhythm, HR 60-100 bpm, Normal PR/QT intervals"),
            ("test-echo", "2D Echocardiography & Color Doppler", "CARD-ECHO", "Cardiac", 2200.00, 2, "Normal LV systolic function, LVEF >= 55%, No regional wall motion abnormalities"),
            ("test-holter", "24-Hour Ambulatory Holter Monitoring", "CARD-HOLTER", "Cardiac", 3200.00, 24, "Predominant sinus rhythm, no significant bradyarrhythmia or tachyarrhythmia"),
            ("test-tmt", "Cardiac Treadmill Stress Test (TMT)", "CARD-TMT", "Cardiac", 1800.00, 2, "Negative for inducible myocardial ischemia at peak workload"),

            # Imaging Investigations
            ("test-xray-chest", "Chest X-Ray PA View (Digital)", "RAD-CXR", "Imaging", 450.00, 1, "Normal lung fields, normal cardiothoracic ratio, clear costophrenic angles"),
            ("test-xray-spine", "X-Ray Lumbar Spine AP & Lateral", "RAD-LSPINE", "Imaging", 700.00, 1, "Normal lumbar lordosis, vertebral heights and disc spaces preserved"),
            ("test-usg-abdomen", "Ultrasound Whole Abdomen & Pelvis", "RAD-USG-ABD", "Imaging", 1400.00, 2, "Liver, gallbladder, kidneys, spleen, pancreas, and urinary bladder normal"),
            ("test-ct-brain", "CT Scan Brain (Non-Contrast Plain)", "RAD-CT-BRAIN", "Imaging", 3500.00, 2, "No acute intracranial hemorrhage, mass effect, or midline shift"),
            ("test-ct-chest", "HRCT Chest (High Resolution CT)", "RAD-CT-CHEST", "Imaging", 4500.00, 3, "Clear bronchovascular markings, no ground glass opacities or consolidations"),
            ("test-mri-brain", "MRI Brain with Contrast (1.5 Tesla)", "RAD-MRI-BRAIN", "Imaging", 7500.00, 4, "Normal brain parenchyma, ventricles, and sulcal pattern"),
            ("test-mri-spine", "MRI Lumbar Spine (Non-Contrast)", "RAD-MRI-LSPINE", "Imaging", 6800.00, 4, "No disc herniation or nerve root compression"),
            ("test-mammogram", "Digital Bilateral Mammography", "RAD-MAMMO", "Imaging", 2800.00, 3, "BI-RADS Category 1 (Negative)"),

            # Respiratory Tests
            ("test-pft", "Pulmonary Function Test (PFT / Spirometry)", "RESP-PFT", "Respiratory", 900.00, 2, "FEV1/FVC ratio > 0.70 (Normal ventilatory mechanics)"),

            # Endoscopy Investigations
            ("test-gi-endoscopy", "Upper Gastrointestinal Endoscopy (OGD)", "ENDO-UGI", "Endoscopy", 3800.00, 3, "Esophagus, stomach, and duodenum mucosa healthy"),
            ("test-colonoscopy", "Diagnostic Colonoscopy", "ENDO-COLON", "Endoscopy", 5500.00, 4, "Mucosa examined up to cecum, no polyps, ulcers, or mass lesions"),

            # Microbiology Tests
            ("test-blood-culture", "Blood Culture & Automated Sensitivity", "MIC-BLD-CULT", "Microbiology", 1100.00, 72, "Sterile after 5 days of incubation"),
            ("test-sputum-afb", "Sputum Smear for Acid Fast Bacilli (AFB)", "MIC-AFB", "Microbiology", 300.00, 4, "No acid-fast bacilli seen (Negative)"),

            # Pathology & Specialized Tests
            ("test-biopsy-small", "Histopathology Biopsy (Small Specimen)", "PATH-BX-SM", "Pathology", 1400.00, 72, "Benign histomorphology, no evidence of malignancy"),
            ("test-fnac", "Fine Needle Aspiration Cytology (FNAC)", "PATH-FNAC", "Pathology", 950.00, 24, "Adequate cellularity, negative for malignant cells"),
            ("test-pap-smear", "Liquid-Based Cervical Cytology (Pap Smear)", "PATH-PAP", "Pathology", 850.00, 24, "NILM (Negative for Intraepithelial Lesion or Malignancy)")
        ]

        for tid, name, code, cat, price, tat, nrange in investigation_catalog:
            cur.execute("""
                INSERT INTO oh_id.lab_test_catalog (id, name, code, category, price, turnaround_hours, normal_range)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    category = EXCLUDED.category,
                    price = EXCLUDED.price,
                    turnaround_hours = EXCLUDED.turnaround_hours,
                    normal_range = EXCLUDED.normal_range;
            """, (tid, name, code, cat, price, tat, nrange))

        # 3. Create view vw_patient_reported_intake
        cur.execute("""
        CREATE OR REPLACE VIEW oh_id.vw_patient_reported_intake AS
        SELECT 
            pri.id,
            pri.patient_id,
            p.name AS patient_name,
            p.onehealth_id,
            pri.appointment_id,
            a.slot AS appointment_slot,
            pri.reason_for_visit,
            pri.duration,
            pri.main_concern,
            pri.description,
            pri.severity,
            pri.location,
            pri.relieving_factors,
            pri.aggravating_factors,
            pri.associated_symptoms,
            pri.previous_treatments,
            pri.current_medications,
            pri.known_allergies,
            pri.submitted_at,
            pri.status
        FROM oh_id.patient_reported_intake pri
        LEFT JOIN oh_id.patients p ON pri.patient_id = p.id
        LEFT JOIN oh_id.appointments a ON pri.appointment_id = a.id;
        """)

        # 4. Create view vw_investigation_orders_full
        cur.execute("""
        CREATE OR REPLACE VIEW oh_id.vw_investigation_orders_full AS
        SELECT 
            lo.id,
            lo.order_number,
            lo.patient_id,
            p.name AS patient_name,
            p.onehealth_id,
            p.age AS patient_age,
            p.gender AS patient_gender,
            lo.test_id,
            COALESCE(tc.name, lo.test_id) AS test_name,
            COALESCE(tc.code, 'INVESTIGATION') AS test_code,
            COALESCE(tc.category, 'General') AS test_category,
            COALESCE(tc.normal_range, 'As per reference standard') AS reference_range,
            lo.doctor_id,
            d.name AS doctor_name,
            d.specialty AS doctor_specialty,
            lo.hospital_id,
            h.name AS hospital_name,
            lo.status,
            lo.priority,
            lo.sample_type,
            lo.sample_id,
            lo.result_value,
            lo.result_unit,
            lo.is_abnormal,
            lo.results_data,
            lo.doctor_notes,
            lo.patient_summary,
            lo.ordered_at,
            lo.collected_at,
            lo.received_at,
            lo.reported_at,
            lo.completed_at,
            lo.laboratory_name,
            lo.pathologist_name,
            lo.digital_signature_hash,
            lo.verification_token,
            lo.is_patient_visible
        FROM oh_id.lab_orders lo
        LEFT JOIN oh_id.patients p ON lo.patient_id = p.id
        LEFT JOIN oh_id.lab_test_catalog tc ON lo.test_id = tc.id
        LEFT JOIN oh_id.doctors d ON lo.doctor_id = d.id
        LEFT JOIN oh_id.hospitals h ON lo.hospital_id = h.id;
        """)

        # 5. Create view vw_doctor_referrals_full
        cur.execute("""
        CREATE OR REPLACE VIEW oh_id.vw_doctor_referrals_full AS
        SELECT 
            r.id,
            r.patient_id,
            p.name AS patient_name,
            p.onehealth_id,
            r.referring_doctor_id,
            rd.name AS referring_doctor_name,
            rd.specialty AS referring_doctor_specialty,
            r.receiving_doctor_id,
            rcd.name AS receiving_doctor_name_resolved,
            r.receiving_doctor_name,
            r.referral_type,
            r.specialty,
            r.reason,
            r.clinical_summary,
            r.priority,
            r.requested_evaluation,
            r.attached_reports,
            r.status,
            r.created_at,
            r.updated_at
        FROM oh_id.referrals r
        LEFT JOIN oh_id.patients p ON r.patient_id = p.id
        LEFT JOIN oh_id.doctors rd ON r.referring_doctor_id = rd.id
        LEFT JOIN oh_id.doctors rcd ON r.receiving_doctor_id = rcd.id;
        """)

        # 6. Seed demo patient intake for Patient p-101 (Alice Smith)
        cur.execute("""
        INSERT INTO oh_id.patient_reported_intake (
            id, patient_id, appointment_id, reason_for_visit, duration, main_concern,
            description, severity, location, relieving_factors, aggravating_factors,
            associated_symptoms, previous_treatments, current_medications, known_allergies,
            submitted_at, status
        ) VALUES (
            'pri-demo-101', 'p-101', 'a-301',
            'Severe throbbing headaches on the right temple with occasional blurred vision and mild neck stiffness.',
            '3 days', 'Persistent right temporal headache and eye strain',
            'I have had throbbing headaches for three days, especially after long working hours on screen. Taking rest in a dark room gives slight relief but pain recurs when looking at bright lights.',
            'Moderate', 'Right temporal region & retro-orbital',
            'Rest in a dark quiet room, cold compress',
            'Bright sunlight, screen glare, stress, skipped meals',
            '["Throbbing Headache", "Mild Eye Strain", "Fatigue", "Neck Muscle Tension"]'::jsonb,
            'Took Paracetamol 500mg once yesterday with minimal temporary relief',
            'Metformin 500mg PO BD (for diabetes management)',
            'Penicillin (Causes severe skin hives/urticaria)',
            CURRENT_TIMESTAMP - INTERVAL '2 hours', 'SUBMITTED'
        ) ON CONFLICT (id) DO UPDATE SET
            reason_for_visit = EXCLUDED.reason_for_visit,
            description = EXCLUDED.description,
            status = 'SUBMITTED';
        """)

        # 7. Seed demo investigation orders & results for Patient p-101
        cur.execute("SELECT id, code FROM oh_id.lab_test_catalog WHERE code IN ('CBC-01', 'CARD-ECG', 'HBA1C-01');")
        test_map = {r['code']: r['id'] for r in cur.fetchall()}
        cbc_id = test_map.get('CBC-01', 'test-cbc')
        ecg_id = test_map.get('CARD-ECG', 'test-ecg')
        hba1c_id = test_map.get('HBA1C-01', 'test-hba1c')

        cur.execute("""
        INSERT INTO oh_id.lab_orders (
            id, order_number, patient_id, test_id, doctor_id, hospital_id, status, priority,
            result_value, result_unit, is_abnormal, results_data, doctor_notes, patient_summary,
            ordered_at, completed_at, laboratory_name, pathologist_name, is_patient_visible
        ) VALUES (
            'lab-ord-101', 'ORD-2026-CBC-101', 'p-101', %s, 'doc-k-01', 'hosp-kedar',
            'RESULT_AVAILABLE', 'ROUTINE', 'Hb: 13.8 g/dL, WBC: 7,200 /uL, Platelets: 240,000 /uL',
            'Comprehensive', false,
            '{"parameters": [
                {"name": "Hemoglobin", "value": "13.8", "unit": "g/dL", "range": "13.0 - 17.0", "flag": "NORMAL"},
                {"name": "Total Leukocyte Count (WBC)", "value": "7,200", "unit": "/uL", "range": "4,000 - 11,000", "flag": "NORMAL"},
                {"name": "RBC Count", "value": "4.8", "unit": "M/uL", "range": "4.5 - 5.5", "flag": "NORMAL"},
                {"name": "Platelet Count", "value": "240,000", "unit": "/uL", "range": "150,000 - 450,000", "flag": "NORMAL"},
                {"name": "Neutrophils", "value": "62", "unit": "%%", "range": "40 - 75", "flag": "NORMAL"},
                {"name": "Lymphocytes", "value": "28", "unit": "%%", "range": "20 - 45", "flag": "NORMAL"},
                {"name": "Monocytes", "value": "6", "unit": "%%", "range": "2 - 10", "flag": "NORMAL"},
                {"name": "Eosinophils", "value": "4", "unit": "%%", "range": "1 - 6", "flag": "NORMAL"}
            ]}'::jsonb,
            'Normal hematological parameters. No evidence of infection or cytopenia.',
            'Your Complete Blood Count is within normal healthy limits.',
            CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day',
            'Kedar Central Pathology Lab', 'Dr. Meenakshi Sundaram (MD Path)', true
        ),
        (
            'lab-ord-102', 'ORD-2026-ECG-102', 'p-101', %s, 'doc-k-01', 'hosp-kedar',
            'RESULT_AVAILABLE', 'ROUTINE', 'Normal Sinus Rhythm, HR 74 bpm',
            '12-Lead ECG', false,
            '{"parameters": [
                {"name": "Heart Rate", "value": "74", "unit": "bpm", "range": "60 - 100", "flag": "NORMAL"},
                {"name": "Rhythm", "value": "Normal Sinus Rhythm", "unit": "", "range": "Sinus", "flag": "NORMAL"},
                {"name": "PR Interval", "value": "156", "unit": "ms", "range": "120 - 200", "flag": "NORMAL"},
                {"name": "QRS Duration", "value": "88", "unit": "ms", "range": "60 - 100", "flag": "NORMAL"},
                {"name": "QTc Interval", "value": "412", "unit": "ms", "range": "< 450", "flag": "NORMAL"},
                {"name": "ST-T Segment", "value": "No ischemic ST depression or T wave inversion", "unit": "", "range": "Isoelectric", "flag": "NORMAL"}
            ]}'::jsonb,
            'Normal 12-lead ECG. Baseline cardiac electrophysiology unremarkable.',
            'Your ECG is completely normal.',
            CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day',
            'Kedar Non-Invasive Cardiology Unit', 'Dr. Senthil Nathan (MD, DM Cardio)', true
        ),
        (
            'lab-ord-103', 'ORD-2026-HBA1C-103', 'p-101', %s, 'doc-k-01', 'hosp-kedar',
            'RESULT_AVAILABLE', 'ROUTINE', '6.8 %%',
            '%%', true,
            '{"parameters": [
                {"name": "Glycated Hemoglobin (HbA1c)", "value": "6.8", "unit": "%%", "range": "< 5.7 (Normal)", "flag": "HIGH"},
                {"name": "Estimated Average Glucose (eAG)", "value": "148", "unit": "mg/dL", "range": "< 117", "flag": "HIGH"}
            ]}'::jsonb,
            'Mildly suboptimal glycemic control. Consider lifestyle modifications and oral hypoglycemic review.',
            'Your 3-month sugar level is slightly elevated (6.8%%). Advised dietary moderation.',
            CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '14 days',
            'Kedar Central Pathology Lab', 'Dr. Meenakshi Sundaram (MD Path)', true
        )
        ON CONFLICT (id) DO UPDATE SET
            results_data = EXCLUDED.results_data,
            doctor_notes = EXCLUDED.doctor_notes,
            status = 'RESULT_AVAILABLE';
        """, (cbc_id, ecg_id, hba1c_id))

    logger.info("Doctor Consultation Workspace Database Migration Completed Successfully!")

if __name__ == "__main__":
    run_migration()
