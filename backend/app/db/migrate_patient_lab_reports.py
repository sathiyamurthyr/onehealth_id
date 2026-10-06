import os
import sys
import json
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath("."))
from backend.app.database.session import get_db_cursor

def run_migration():
    print("Starting migration: Enhanced Patient Lab Reports Module...")
    with get_db_cursor() as cur:
        # 1. Alter oh_id.lab_orders table to add comprehensive diagnostic fields
        cur.execute("""
            ALTER TABLE oh_id.lab_orders
            ADD COLUMN IF NOT EXISTS order_number VARCHAR(64),
            ADD COLUMN IF NOT EXISTS sample_type VARCHAR(100) DEFAULT 'Whole Blood (EDTA)',
            ADD COLUMN IF NOT EXISTS sample_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS laboratory_name VARCHAR(150),
            ADD COLUMN IF NOT EXISTS laboratory_branch VARCHAR(150),
            ADD COLUMN IF NOT EXISTS laboratory_address TEXT,
            ADD COLUMN IF NOT EXISTS laboratory_phone VARCHAR(50),
            ADD COLUMN IF NOT EXISTS laboratory_email VARCHAR(100),
            ADD COLUMN IF NOT EXISTS laboratory_accreditation VARCHAR(200),
            ADD COLUMN IF NOT EXISTS pathologist_name VARCHAR(150),
            ADD COLUMN IF NOT EXISTS pathologist_qualification VARCHAR(100),
            ADD COLUMN IF NOT EXISTS pathologist_registration VARCHAR(100),
            ADD COLUMN IF NOT EXISTS digital_signature_hash VARCHAR(128),
            ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64),
            ADD COLUMN IF NOT EXISTS doctor_notes TEXT,
            ADD COLUMN IF NOT EXISTS patient_summary TEXT,
            ADD COLUMN IF NOT EXISTS results_data JSONB DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
            ADD COLUMN IF NOT EXISTS is_corrected BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS correction_reason TEXT,
            ADD COLUMN IF NOT EXISTS superseded_by_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS parent_report_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS attachment_url TEXT,
            ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50) DEFAULT 'ORIGINAL_PDF',
            ADD COLUMN IF NOT EXISTS is_patient_visible BOOLEAN DEFAULT TRUE;
        """)

        # 2. Create oh_id.lab_report_shares table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.lab_report_shares (
                id VARCHAR(64) PRIMARY KEY,
                lab_order_id VARCHAR(64) NOT NULL REFERENCES oh_id.lab_orders(id) ON DELETE CASCADE,
                patient_id VARCHAR(64) NOT NULL REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                created_by_user_id VARCHAR(64) NOT NULL,
                share_token VARCHAR(128) NOT NULL UNIQUE,
                recipient_name VARCHAR(150),
                recipient_contact VARCHAR(100),
                access_level VARCHAR(50) DEFAULT 'VIEW_ONLY', -- VIEW_ONLY, VIEW_AND_DOWNLOAD
                expires_at TIMESTAMPTZ NOT NULL,
                revoked_at TIMESTAMPTZ,
                revoked_by VARCHAR(64),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_lab_report_shares_token ON oh_id.lab_report_shares(share_token);
            CREATE INDEX IF NOT EXISTS idx_lab_report_shares_lab_id ON oh_id.lab_report_shares(lab_order_id);
        """)

        # 3. Create oh_id.lab_report_audit_logs table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.lab_report_audit_logs (
                id VARCHAR(64) PRIMARY KEY,
                lab_order_id VARCHAR(64) REFERENCES oh_id.lab_orders(id) ON DELETE SET NULL,
                patient_id VARCHAR(64) REFERENCES oh_id.patients(id) ON DELETE SET NULL,
                user_id VARCHAR(64),
                action VARCHAR(50) NOT NULL, -- VIEW, DOWNLOAD_PDF, PRINT, SHARE_CREATED, SHARE_REVOKED, VIEW_ORIGINAL, VERIFIED
                metadata JSONB DEFAULT '{}'::jsonb,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_lab_report_audit_lab_id ON oh_id.lab_report_audit_logs(lab_order_id);
            CREATE INDEX IF NOT EXISTS idx_lab_report_audit_patient_id ON oh_id.lab_report_audit_logs(patient_id);
        """)

        # 4. Recreate oh_id.vw_lab_orders view with all rich attributes
        cur.execute("""
            DROP VIEW IF EXISTS oh_id.vw_lab_orders CASCADE;
            CREATE OR REPLACE VIEW oh_id.vw_lab_orders AS
            SELECT 
                lo.id,
                lo.order_number,
                lo.patient_id,
                p.name AS patient_name,
                p.onehealth_id,
                p.dob AS patient_dob,
                p.gender AS patient_gender,
                p.blood_group AS patient_blood_group,
                COALESCE(p.age, EXTRACT(YEAR FROM AGE(CURRENT_DATE, NULLIF(p.dob, '')::date))::int, 32) AS patient_age,
                lo.test_id,
                COALESCE(ltc.name, lo.id) AS test_name,
                COALESCE(ltc.code, 'LAB-TEST') AS test_code,
                COALESCE(ltc.category, 'Biochemistry') AS test_category,
                COALESCE(ltc.price, 350.00) AS test_price,
                COALESCE(ltc.normal_range, 'As per laboratory reference') AS normal_range,
                lo.doctor_id,
                d.name AS doctor_name,
                d.specialty AS doctor_specialty,
                d.qualification AS doctor_qualification,
                lo.hospital_id,
                COALESCE(h.name, lo.laboratory_name, 'Diagnostic Center') AS hospital_name,
                h.code AS hospital_code,
                h.address AS hospital_address,
                h.phone AS hospital_phone,
                h.email AS hospital_email,
                lo.status,
                lo.priority,
                lo.result_value,
                lo.result_unit,
                lo.is_abnormal,
                lo.verified_by,
                lo.ordered_at,
                lo.completed_at,
                lo.sample_type,
                lo.sample_id,
                lo.collected_at,
                lo.received_at,
                lo.reported_at,
                COALESCE(lo.laboratory_name, h.name, 'Kedar Hospital Central Laboratory') AS laboratory_name,
                lo.laboratory_branch,
                lo.laboratory_address,
                lo.laboratory_phone,
                lo.laboratory_email,
                COALESCE(lo.laboratory_accreditation, 'NABL Accredited Medical Testing Laboratory ISO 15189:2022') AS laboratory_accreditation,
                COALESCE(lo.pathologist_name, lo.verified_by, 'Dr. Pathologist') AS pathologist_name,
                lo.pathologist_qualification,
                lo.pathologist_registration,
                lo.digital_signature_hash,
                lo.verification_token,
                lo.doctor_notes,
                lo.patient_summary,
                lo.results_data,
                lo.version,
                lo.is_corrected,
                lo.correction_reason,
                lo.superseded_by_id,
                lo.parent_report_id,
                lo.attachment_url,
                lo.attachment_type,
                lo.is_patient_visible
            FROM oh_id.lab_orders lo
            LEFT JOIN oh_id.patients p ON lo.patient_id = p.id
            LEFT JOIN oh_id.lab_test_catalog ltc ON lo.test_id = ltc.id
            LEFT JOIN oh_id.doctors d ON lo.doctor_id = d.id
            LEFT JOIN oh_id.hospitals h ON lo.hospital_id = h.id;
        """)

        # 4b. Ensure complete Lab Test Catalog entries
        cur.execute("""
            INSERT INTO oh_id.lab_test_catalog (id, name, code, category, price, normal_range)
            VALUES 
                ('lt-09', 'Thyroid Profile (T3, T4, TSH)', 'THYROID-01', 'Endocrinology', 650.00, 'TSH: 0.40 – 4.20 µIU/mL, T3: 0.80 – 2.00 ng/mL, T4: 5.10 – 14.10 µg/dL'),
                ('lt-10', 'Glycemic Profile (HbA1c + Fasting Blood Glucose)', 'GLUCOSE-01', 'Biochemistry', 450.00, 'HbA1c < 5.7 %, Fasting Glucose: 70 – 99 mg/dL'),
                ('lt-11', 'Renal Function Test & Serum Electrolytes', 'RFT-01', 'Nephrology', 550.00, 'Creatinine: 0.60 – 1.20 mg/dL, BUN: 7 – 20 mg/dL')
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                code = EXCLUDED.code,
                category = EXCLUDED.category,
                price = EXCLUDED.price,
                normal_range = EXCLUDED.normal_range;
        """)

        # 5. Populate Benchmark Lab Reports for p-101 (Alice Smith)
        now = datetime.now(timezone.utc)
        
        # Benchmark 1: Complete Blood Count (CBC) - FINAL, 18 parameters
        cbc_results = [
            # RBC Indices
            {"parameter_name": "Hemoglobin", "category": "RBC Indices", "observed_value": "13.8", "unit": "g/dL", "reference_range": "12.0 – 15.5", "reference_min": 12.0, "reference_max": 15.5, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Automated SLS-Hemoglobin"},
            {"parameter_name": "Total RBC Count", "category": "RBC Indices", "observed_value": "4.52", "unit": "million/µL", "reference_range": "3.80 – 5.20", "reference_min": 3.80, "reference_max": 5.20, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Impedance Counting"},
            {"parameter_name": "Packed Cell Volume (PCV / Hematocrit)", "category": "RBC Indices", "observed_value": "41.2", "unit": "%", "reference_range": "36.0 – 46.0", "reference_min": 36.0, "reference_max": 46.0, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Calculated"},
            {"parameter_name": "Mean Corpuscular Volume (MCV)", "category": "RBC Indices", "observed_value": "91.2", "unit": "fL", "reference_range": "80.0 – 100.0", "reference_min": 80.0, "reference_max": 100.0, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Calculated"},
            {"parameter_name": "Mean Corpuscular Hemoglobin (MCH)", "category": "RBC Indices", "observed_value": "30.5", "unit": "pg", "reference_range": "27.0 – 33.0", "reference_min": 27.0, "reference_max": 33.0, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Calculated"},
            {"parameter_name": "MCH Concentration (MCHC)", "category": "RBC Indices", "observed_value": "33.5", "unit": "g/dL", "reference_range": "32.0 – 36.0", "reference_min": 32.0, "reference_max": 36.0, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Calculated"},
            {"parameter_name": "Red Cell Distribution Width (RDW-CV)", "category": "RBC Indices", "observed_value": "12.8", "unit": "%", "reference_range": "11.5 – 14.5", "reference_min": 11.5, "reference_max": 14.5, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Calculated"},
            
            # WBC Differential
            {"parameter_name": "Total Leukocyte Count (WBC)", "category": "WBC Differential", "observed_value": "7200", "unit": "/µL", "reference_range": "4,000 – 11,000", "reference_min": 4000, "reference_max": 11000, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Flow Cytometry / Optical"},
            {"parameter_name": "Neutrophils", "category": "WBC Differential", "observed_value": "62", "unit": "%", "reference_range": "40 – 70", "reference_min": 40, "reference_max": 70, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Flow Cytometry"},
            {"parameter_name": "Lymphocytes", "category": "WBC Differential", "observed_value": "28", "unit": "%", "reference_range": "20 – 40", "reference_min": 20, "reference_max": 40, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Flow Cytometry"},
            {"parameter_name": "Monocytes", "category": "WBC Differential", "observed_value": "6", "unit": "%", "reference_range": "2 – 8", "reference_min": 2, "reference_max": 8, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Flow Cytometry"},
            {"parameter_name": "Eosinophils", "category": "WBC Differential", "observed_value": "3", "unit": "%", "reference_range": "1 – 6", "reference_min": 1, "reference_max": 6, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Flow Cytometry"},
            {"parameter_name": "Basophils", "category": "WBC Differential", "observed_value": "1", "unit": "%", "reference_range": "0 – 2", "reference_min": 0, "reference_max": 2, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Flow Cytometry"},
            {"parameter_name": "Absolute Neutrophil Count (ANC)", "category": "WBC Differential", "observed_value": "4464", "unit": "/µL", "reference_range": "2,000 – 7,000", "reference_min": 2000, "reference_max": 7000, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Calculated"},
            {"parameter_name": "Absolute Lymphocyte Count (ALC)", "category": "WBC Differential", "observed_value": "2016", "unit": "/µL", "reference_range": "1,000 – 3,000", "reference_min": 1000, "reference_max": 3000, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Calculated"},
            
            # Platelet Indices
            {"parameter_name": "Platelet Count", "category": "Platelet Indices", "observed_value": "250000", "unit": "/µL", "reference_range": "150,000 – 450,000", "reference_min": 150000, "reference_max": 450000, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Impedance Counting"},
            {"parameter_name": "Mean Platelet Volume (MPV)", "category": "Platelet Indices", "observed_value": "9.4", "unit": "fL", "reference_range": "7.5 – 11.5", "reference_min": 7.5, "reference_max": 11.5, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Calculated"},
            {"parameter_name": "Plateletcrit (PCT)", "category": "Platelet Indices", "observed_value": "0.24", "unit": "%", "reference_range": "0.15 – 0.50", "reference_min": 0.15, "reference_max": 0.50, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Calculated"}
        ]

        # Benchmark 2: Comprehensive Lipid Profile - FINAL (3 out of range)
        lipid_results = [
            {"parameter_name": "Total Cholesterol", "category": "Lipid Fractions", "observed_value": "218", "unit": "mg/dL", "reference_range": "< 200", "reference_min": 125, "reference_max": 200, "is_abnormal": True, "abnormality_flag": "HIGH", "is_critical": False, "test_method": "CHOD-PAP Enzymatic"},
            {"parameter_name": "Triglycerides", "category": "Lipid Fractions", "observed_value": "165", "unit": "mg/dL", "reference_range": "< 150", "reference_min": 50, "reference_max": 150, "is_abnormal": True, "abnormality_flag": "HIGH", "is_critical": False, "test_method": "GPO-PAP Enzymatic"},
            {"parameter_name": "HDL Cholesterol (Good)", "category": "Lipid Fractions", "observed_value": "44", "unit": "mg/dL", "reference_range": "> 40", "reference_min": 40, "reference_max": 60, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Direct Detergent Clearance"},
            {"parameter_name": "LDL Cholesterol (Calculated)", "category": "Lipid Fractions", "observed_value": "141", "unit": "mg/dL", "reference_range": "< 100", "reference_min": 50, "reference_max": 100, "is_abnormal": True, "abnormality_flag": "HIGH", "is_critical": False, "test_method": "Friedewald Formula"},
            {"parameter_name": "VLDL Cholesterol", "category": "Lipid Fractions", "observed_value": "33", "unit": "mg/dL", "reference_range": "5 – 30", "reference_min": 5, "reference_max": 30, "is_abnormal": True, "abnormality_flag": "HIGH", "is_critical": False, "test_method": "Calculated"},
            {"parameter_name": "Total Cholesterol / HDL Ratio", "category": "Ratios & Risk Factors", "observed_value": "4.95", "unit": "Ratio", "reference_range": "< 4.5", "reference_min": 2.5, "reference_max": 4.5, "is_abnormal": True, "abnormality_flag": "HIGH", "is_critical": False, "test_method": "Calculated Ratio"}
        ]

        # Benchmark 3: Thyroid Function Profile - CORRECTED (Amended version V2)
        thyroid_results = [
            {"parameter_name": "TSH (Ultrasensitive Thyroid Stimulating Hormone)", "category": "Thyroid Hormones", "observed_value": "3.20", "unit": "µIU/mL", "reference_range": "0.40 – 4.20", "reference_min": 0.40, "reference_max": 4.20, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Chemiluminescent Immunoassay (CLIA)"},
            {"parameter_name": "Total Triiodothyronine (T3)", "category": "Thyroid Hormones", "observed_value": "1.20", "unit": "ng/mL", "reference_range": "0.80 – 2.00", "reference_min": 0.80, "reference_max": 2.00, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "CLIA"},
            {"parameter_name": "Total Thyroxine (T4)", "category": "Thyroid Hormones", "observed_value": "8.50", "unit": "µg/dL", "reference_range": "5.10 – 14.10", "reference_min": 5.10, "reference_max": 14.10, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "CLIA"}
        ]

        # Benchmark 4: HbA1c & Fasting Glucose
        hba1c_results = [
            {"parameter_name": "Glycated Hemoglobin (HbA1c)", "category": "Glycemic Indices", "observed_value": "6.8", "unit": "%", "reference_range": "< 5.7", "reference_min": 4.0, "reference_max": 5.7, "is_abnormal": True, "abnormality_flag": "HIGH", "is_critical": False, "test_method": "HPLC High Performance Liquid Chromatography"},
            {"parameter_name": "Estimated Average Glucose (eAG)", "category": "Glycemic Indices", "observed_value": "148", "unit": "mg/dL", "reference_range": "< 117", "reference_min": 70, "reference_max": 117, "is_abnormal": True, "abnormality_flag": "HIGH", "is_critical": False, "test_method": "ADAG Formula Calculated"},
            {"parameter_name": "Fasting Plasma Glucose", "category": "Glycemic Indices", "observed_value": "126", "unit": "mg/dL", "reference_range": "70 – 99", "reference_min": 70, "reference_max": 99, "is_abnormal": True, "abnormality_flag": "HIGH", "is_critical": False, "test_method": "Hexokinase Method"}
        ]

        # Benchmark 5: Renal Function Test (In-Progress / Pending)
        rft_results = [
            {"parameter_name": "Serum Creatinine", "category": "Renal Function", "observed_value": None, "unit": "mg/dL", "reference_range": "0.60 – 1.20", "reference_min": 0.60, "reference_max": 1.20, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Modified Jaffe Method"},
            {"parameter_name": "Blood Urea Nitrogen (BUN)", "category": "Renal Function", "observed_value": None, "unit": "mg/dL", "reference_range": "7 – 20", "reference_min": 7, "reference_max": 20, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Urease-GLDH"},
            {"parameter_name": "Serum Uric Acid", "category": "Renal Function", "observed_value": None, "unit": "mg/dL", "reference_range": "2.6 – 6.0", "reference_min": 2.6, "reference_max": 6.0, "is_abnormal": False, "abnormality_flag": "NORMAL", "is_critical": False, "test_method": "Uricase-PAP"}
        ]

        # Insert or update benchmark lab orders
        reports_to_insert = [
            {
                "id": "LAB-20261002-00125",
                "order_number": "ORD-20261002-88125",
                "patient_id": "p-101",
                "test_id": "lt-01",
                "doctor_id": "doc-k-01", # Dr. Senthil Nathan
                "hospital_id": "hosp-kedar",
                "status": "FINAL",
                "priority": "ROUTINE",
                "result_value": "13.8 g/dL (All 18 parameters within reference limits)",
                "result_unit": "g/dL",
                "is_abnormal": False,
                "verified_by": "Dr. R. Meenakshi Sundaram",
                "ordered_at": now - timedelta(days=1, hours=13),
                "completed_at": now - timedelta(days=1, hours=7),
                "sample_type": "Whole Blood (EDTA)",
                "sample_id": "SMP-20261002-8812",
                "collected_at": now - timedelta(days=1, hours=13),
                "received_at": now - timedelta(days=1, hours=12),
                "reported_at": now - timedelta(days=1, hours=7),
                "laboratory_name": "ABC Diagnostics & Kedar Hospital Pathology Wing",
                "laboratory_branch": "Mugalivakkam Main Laboratory, Chennai",
                "laboratory_address": "Mount-Poonamallee High Road, Mugalivakkam, Chennai 600125",
                "laboratory_phone": "+91 44 2252 8800",
                "laboratory_email": "pathology@kedarhospital.com",
                "laboratory_accreditation": "NABL Accredited Medical Testing Laboratory ISO 15189:2022 (Cert No. MC-2894)",
                "pathologist_name": "Dr. R. Meenakshi Sundaram",
                "pathologist_qualification": "MBBS, MD (Pathology)",
                "pathologist_registration": "TN-MCI-2018-44219",
                "digital_signature_hash": "SHA256:d8a9f4c3b2e18894fa7701e4d3a2b1c8f7e6d5c4b3a2918273645e0f1a2b3c4d",
                "verification_token": "vtok-lab-20261002-00125",
                "doctor_notes": "Hematological profile is completely normal. No evidence of anemia or microcytosis. Adequate platelet reserves.",
                "patient_summary": "All 18 parameters in your Complete Blood Count are within the standard reference ranges. No active clinical intervention is needed.",
                "results_data": json.dumps(cbc_results),
                "version": 1,
                "is_corrected": False,
                "correction_reason": None,
                "superseded_by_id": None,
                "parent_report_id": None,
                "attachment_url": "/documents/lab_cbc_20261002.pdf",
                "attachment_type": "ORIGINAL_PDF",
                "is_patient_visible": True
            },
            {
                "id": "LAB-20260928-00094",
                "order_number": "ORD-20260928-66219",
                "patient_id": "p-101",
                "test_id": "lt-03",
                "doctor_id": "doc-k-01",
                "hospital_id": "hosp-kedar",
                "status": "FINAL",
                "priority": "ROUTINE",
                "result_value": "Cholesterol: 218 mg/dL, LDL: 141 mg/dL, Triglycerides: 165 mg/dL",
                "result_unit": "mg/dL",
                "is_abnormal": True,
                "verified_by": "Dr. S. Senthil Nathan",
                "ordered_at": now - timedelta(days=5, hours=10),
                "completed_at": now - timedelta(days=5, hours=6),
                "sample_type": "Serum (Gel Separator Tube, 12-hr Fasting)",
                "sample_id": "SMP-20260928-1194",
                "collected_at": now - timedelta(days=5, hours=10),
                "received_at": now - timedelta(days=5, hours=9),
                "reported_at": now - timedelta(days=5, hours=6),
                "laboratory_name": "Kedar Hospital Central Biochemistry Wing",
                "laboratory_branch": "Main Diagnostic Center, Chennai",
                "laboratory_address": "Mount-Poonamallee High Road, Mugalivakkam, Chennai 600125",
                "laboratory_phone": "+91 44 2252 8800",
                "laboratory_email": "biochemistry@kedarhospital.com",
                "laboratory_accreditation": "NABL Accredited Medical Testing Laboratory ISO 15189:2022 (Cert No. MC-2894)",
                "pathologist_name": "Dr. S. Senthil Nathan",
                "pathologist_qualification": "MBBS, MD (General Medicine)",
                "pathologist_registration": "TN-MCI-2026-001",
                "digital_signature_hash": "SHA256:7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a",
                "verification_token": "vtok-lab-20260928-00094",
                "doctor_notes": "Mild dyslipidemia with elevated LDL and marginal hypertriglyceridemia. Statin therapy prescribed; repeat lipid profile recommended in 8-12 weeks.",
                "patient_summary": "4 out of 6 parameters are outside laboratory target reference ranges (Total Cholesterol, Triglycerides, LDL, and Cholesterol/HDL ratio). Consult your doctor regarding dietary management.",
                "results_data": json.dumps(lipid_results),
                "version": 1,
                "is_corrected": False,
                "correction_reason": None,
                "superseded_by_id": None,
                "parent_report_id": None,
                "attachment_url": "/documents/lab_lipid_20260928.pdf",
                "attachment_type": "ORIGINAL_PDF",
                "is_patient_visible": True
            },
            {
                "id": "LAB-20260915-00062",
                "order_number": "ORD-20260915-44102",
                "patient_id": "p-101",
                "test_id": "lt-09",
                "doctor_id": "doc-k-01",
                "hospital_id": "hosp-kedar",
                "status": "CORRECTED",
                "priority": "ROUTINE",
                "result_value": "TSH: 3.20 µIU/mL, T3: 1.20 ng/mL, T4: 8.50 µg/dL (Euthyroid)",
                "result_unit": "µIU/mL",
                "is_abnormal": False,
                "verified_by": "Dr. R. Meenakshi Sundaram",
                "ordered_at": now - timedelta(days=18),
                "completed_at": now - timedelta(days=17),
                "sample_type": "Serum (Clot Activator Tube)",
                "sample_id": "SMP-20260915-9921",
                "collected_at": now - timedelta(days=18, hours=4),
                "received_at": now - timedelta(days=18, hours=3),
                "reported_at": now - timedelta(days=17, hours=2),
                "laboratory_name": "City Care Diagnostic Center & Endocrinology Wing",
                "laboratory_branch": "Guindy Regional Laboratory, Chennai",
                "laboratory_address": "GST Road, Guindy, Chennai 600032",
                "laboratory_phone": "+91 44 2235 4400",
                "laboratory_email": "support@citycarediagnostics.com",
                "laboratory_accreditation": "CAP & NABL ISO 15189:2022 Certified",
                "pathologist_name": "Dr. R. Meenakshi Sundaram",
                "pathologist_qualification": "MBBS, MD (Pathology)",
                "pathologist_registration": "TN-MCI-2018-44219",
                "digital_signature_hash": "SHA256:4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b",
                "verification_token": "vtok-lab-20260915-00062",
                "doctor_notes": "Thyroid function tests are within normal biological limits. Euthyroid state maintained.",
                "patient_summary": "All 3 thyroid parameters (TSH, T3, T4) are within standard laboratory reference limits. This is a corrected version issued on 16 Sep 2026.",
                "results_data": json.dumps(thyroid_results),
                "version": 2,
                "is_corrected": True,
                "correction_reason": "Amended to recalculate total T3 with updated calibration lot values as per standard lab quality protocol.",
                "superseded_by_id": None,
                "parent_report_id": "LAB-20260915-00061",
                "attachment_url": "/documents/lab_thyroid_corrected_20260915.pdf",
                "attachment_type": "ORIGINAL_PDF",
                "is_patient_visible": True
            },
            {
                "id": "LAB-20260802-00018",
                "order_number": "ORD-20260802-11005",
                "patient_id": "p-101",
                "test_id": "lt-10",
                "doctor_id": "doc-k-01",
                "hospital_id": "hosp-kedar",
                "status": "FINAL",
                "priority": "ROUTINE",
                "result_value": "HbA1c: 6.8%, Fasting Glucose: 126 mg/dL",
                "result_unit": "%",
                "is_abnormal": True,
                "verified_by": "Dr. S. Senthil Nathan",
                "ordered_at": now - timedelta(days=62),
                "completed_at": now - timedelta(days=61),
                "sample_type": "Whole Blood (EDTA) + Fluoride Plasma",
                "sample_id": "SMP-20260802-5501",
                "collected_at": now - timedelta(days=62, hours=8),
                "received_at": now - timedelta(days=62, hours=7),
                "reported_at": now - timedelta(days=61, hours=4),
                "laboratory_name": "Kedar Hospital Central Biochemistry Wing",
                "laboratory_branch": "Main Diagnostic Center, Chennai",
                "laboratory_address": "Mount-Poonamallee High Road, Mugalivakkam, Chennai 600125",
                "laboratory_phone": "+91 44 2252 8800",
                "laboratory_email": "biochemistry@kedarhospital.com",
                "laboratory_accreditation": "NABL Accredited Medical Testing Laboratory ISO 15189:2022 (Cert No. MC-2894)",
                "pathologist_name": "Dr. S. Senthil Nathan",
                "pathologist_qualification": "MBBS, MD (General Medicine)",
                "pathologist_registration": "TN-MCI-2026-001",
                "digital_signature_hash": "SHA256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
                "verification_token": "vtok-lab-20260802-00018",
                "doctor_notes": "Glycemic indices indicate pre-diabetic state. Lifestyle modifications and dietary counseling initiated.",
                "patient_summary": "HbA1c and fasting blood sugar levels are moderately above normal reference range. Follow recommended dietary modifications.",
                "results_data": json.dumps(hba1c_results),
                "version": 1,
                "is_corrected": False,
                "correction_reason": None,
                "superseded_by_id": None,
                "parent_report_id": None,
                "attachment_url": "/documents/lab_hba1c_20260802.pdf",
                "attachment_type": "ORIGINAL_PDF",
                "is_patient_visible": True
            },
            {
                "id": "LAB-20261003-00140",
                "order_number": "ORD-20261003-99312",
                "patient_id": "p-101",
                "test_id": "lt-11",
                "doctor_id": "doc-k-01",
                "hospital_id": "hosp-kedar",
                "status": "PROCESSING",
                "priority": "ROUTINE",
                "result_value": "Sample collected; analysis in progress",
                "result_unit": None,
                "is_abnormal": False,
                "verified_by": None,
                "ordered_at": now - timedelta(hours=5),
                "completed_at": None,
                "sample_type": "Serum (Plain Vacutainer Tube)",
                "sample_id": "SMP-20261003-4411",
                "collected_at": now - timedelta(hours=5),
                "received_at": now - timedelta(hours=4),
                "reported_at": None,
                "laboratory_name": "Kedar Hospital Central Laboratory",
                "laboratory_branch": "Main Diagnostic Center, Chennai",
                "laboratory_address": "Mount-Poonamallee High Road, Mugalivakkam, Chennai 600125",
                "laboratory_phone": "+91 44 2252 8800",
                "laboratory_email": "lab@kedarhospital.com",
                "laboratory_accreditation": "NABL Accredited Medical Testing Laboratory ISO 15189:2022 (Cert No. MC-2894)",
                "pathologist_name": "Dr. R. Meenakshi Sundaram",
                "pathologist_qualification": "MBBS, MD (Pathology)",
                "pathologist_registration": "TN-MCI-2018-44219",
                "digital_signature_hash": None,
                "verification_token": "vtok-lab-20261003-00140",
                "doctor_notes": "Routine baseline renal function assessment in view of anti-hypertensive therapy.",
                "patient_summary": "Your sample was received at the laboratory. Results will be uploaded once testing and pathologist verification are complete.",
                "results_data": json.dumps(rft_results),
                "version": 1,
                "is_corrected": False,
                "correction_reason": None,
                "superseded_by_id": None,
                "parent_report_id": None,
                "attachment_url": None,
                "attachment_type": "ORIGINAL_PDF",
                "is_patient_visible": True
            }
        ]

        for rep in reports_to_insert:
            cur.execute("""
                INSERT INTO oh_id.lab_orders (
                    id, order_number, patient_id, test_id, doctor_id, hospital_id,
                    status, priority, result_value, result_unit, is_abnormal,
                    verified_by, ordered_at, completed_at, sample_type, sample_id,
                    collected_at, received_at, reported_at, laboratory_name,
                    laboratory_branch, laboratory_address, laboratory_phone,
                    laboratory_email, laboratory_accreditation, pathologist_name,
                    pathologist_qualification, pathologist_registration,
                    digital_signature_hash, verification_token, doctor_notes,
                    patient_summary, results_data, version, is_corrected,
                    correction_reason, superseded_by_id, parent_report_id,
                    attachment_url, attachment_type, is_patient_visible
                ) VALUES (
                    %(id)s, %(order_number)s, %(patient_id)s, %(test_id)s, %(doctor_id)s, %(hospital_id)s,
                    %(status)s, %(priority)s, %(result_value)s, %(result_unit)s, %(is_abnormal)s,
                    %(verified_by)s, %(ordered_at)s, %(completed_at)s, %(sample_type)s, %(sample_id)s,
                    %(collected_at)s, %(received_at)s, %(reported_at)s, %(laboratory_name)s,
                    %(laboratory_branch)s, %(laboratory_address)s, %(laboratory_phone)s,
                    %(laboratory_email)s, %(laboratory_accreditation)s, %(pathologist_name)s,
                    %(pathologist_qualification)s, %(pathologist_registration)s,
                    %(digital_signature_hash)s, %(verification_token)s, %(doctor_notes)s,
                    %(patient_summary)s, %(results_data)s, %(version)s, %(is_corrected)s,
                    %(correction_reason)s, %(superseded_by_id)s, %(parent_report_id)s,
                    %(attachment_url)s, %(attachment_type)s, %(is_patient_visible)s
                )
                ON CONFLICT (id) DO UPDATE SET
                    order_number = EXCLUDED.order_number,
                    test_id = EXCLUDED.test_id,
                    result_value = EXCLUDED.result_value,
                    result_unit = EXCLUDED.result_unit,
                    results_data = EXCLUDED.results_data,
                    sample_type = EXCLUDED.sample_type,
                    sample_id = EXCLUDED.sample_id,
                    collected_at = EXCLUDED.collected_at,
                    received_at = EXCLUDED.received_at,
                    reported_at = EXCLUDED.reported_at,
                    laboratory_name = EXCLUDED.laboratory_name,
                    laboratory_branch = EXCLUDED.laboratory_branch,
                    laboratory_address = EXCLUDED.laboratory_address,
                    laboratory_phone = EXCLUDED.laboratory_phone,
                    laboratory_email = EXCLUDED.laboratory_email,
                    laboratory_accreditation = EXCLUDED.laboratory_accreditation,
                    pathologist_name = EXCLUDED.pathologist_name,
                    pathologist_qualification = EXCLUDED.pathologist_qualification,
                    pathologist_registration = EXCLUDED.pathologist_registration,
                    digital_signature_hash = EXCLUDED.digital_signature_hash,
                    verification_token = EXCLUDED.verification_token,
                    doctor_notes = EXCLUDED.doctor_notes,
                    patient_summary = EXCLUDED.patient_summary,
                    version = EXCLUDED.version,
                    is_corrected = EXCLUDED.is_corrected,
                    correction_reason = EXCLUDED.correction_reason,
                    parent_report_id = EXCLUDED.parent_report_id,
                    attachment_url = EXCLUDED.attachment_url,
                    attachment_type = EXCLUDED.attachment_type,
                    status = EXCLUDED.status,
                    is_abnormal = EXCLUDED.is_abnormal,
                    is_patient_visible = EXCLUDED.is_patient_visible;
            """, rep)

    print("Migration and benchmark data seeding completed successfully!")

if __name__ == "__main__":
    run_migration()
